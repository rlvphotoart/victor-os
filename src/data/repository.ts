import { parseAppData, parseRecord, type CollectionName } from "./backup";
import type { AppData, AppSettings } from "../types";

const defaultSettings: AppSettings = {
  id: "app",
  name: "Victor",
  theme: "dark",
  currency: "EUR",
  widgets: ["daily", "finance", "projects", "quickLinks"],
  initialized: true,
  dockExpanded: false,
  recentContexts: [],
  recentCommands: [],
};

export function emptyData(): AppData {
  return {
    projects: [],
    tasks: [],
    accounts: [],
    debts: [],
    investments: [],
    transactions: [],
    budgets: [],
    goals: [],
    prompts: [],
    costModels: [],
    notes: [],
    links: [],
    playbooks: [],
    settings: [defaultSettings],
  };
}

type RevisionMap = Record<string, number>;
type SnapshotResponse = { data: AppData; revisions: RevisionMap };

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

let current: AppData = { ...emptyData(), settings: [] };
let revisions: RevisionMap = {};
let operationQueue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function publish(data: AppData) {
  current = data;
  listeners.forEach((listener) => listener());
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.catch(() => undefined);
  return result;
}

function key(collection: CollectionName, id: string) {
  return collection + ":" + id;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body
          ? { "Content-Type": "application/json", "X-Victor-Request": "1" }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new RepositoryError(
      "Cloud connection unavailable. Check your internet connection and retry.",
      0,
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new RepositoryError(
      "Cloud session unavailable. Reload Victor OS and sign in again.",
      response.status,
    );
  }
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new RepositoryError(
      body.error ?? "Cloud request failed (" + response.status + ").",
      response.status,
    );
  }
  return body;
}

async function load(): Promise<AppData> {
  const response = await api<SnapshotResponse>("/api/data");
  const data = parseAppData(response.data);
  revisions = response.revisions;
  publish(data);
  return data;
}

async function putRecord<C extends CollectionName>(
  collection: C,
  input: AppData[C][number],
) {
  const value = parseRecord(collection, input);
  const recordKey = key(collection, value.id);
  const result = await api<{ revision: number }>(
    "/api/records/" + collection + "/" + encodeURIComponent(value.id),
    {
      method: "PUT",
      body: JSON.stringify({ value, revision: revisions[recordKey] ?? 0 }),
    },
  ).catch(async (issue: unknown) => {
    if (issue instanceof RepositoryError && issue.status === 409) await load();
    throw issue;
  });
  revisions = { ...revisions, [recordKey]: result.revision };
  const rows = current[collection] as Array<{ id: string }>;
  publish({
    ...current,
    [collection]: [...rows.filter((row) => row.id !== value.id), value],
  });
  return value;
}

async function deleteRecord<C extends CollectionName>(
  collection: C,
  id: string,
) {
  const recordKey = key(collection, id);
  await api<{ ok: true }>(
    "/api/records/" + collection + "/" + encodeURIComponent(id),
    {
      method: "DELETE",
      body: JSON.stringify({ revision: revisions[recordKey] ?? 0 }),
    },
  ).catch(async (issue: unknown) => {
    if (issue instanceof RepositoryError && issue.status === 409) await load();
    throw issue;
  });
  const nextRevisions = { ...revisions };
  delete nextRevisions[recordKey];
  revisions = nextRevisions;
  publish({
    ...current,
    [collection]: (current[collection] as Array<{ id: string }>).filter(
      (row) => row.id !== id,
    ),
  });
}

function collection<C extends Exclude<CollectionName, "settings">>(name: C) {
  return {
    list: async () => current[name],
    get: async (id: string) => current[name].find((row) => row.id === id),
    save: (value: AppData[C][number]) => enqueue(() => putRecord(name, value)),
    remove: (id: string) => enqueue(() => deleteRecord(name, id)),
  };
}

export const repository = {
  projects: collection("projects"),
  tasks: collection("tasks"),
  accounts: collection("accounts"),
  debts: collection("debts"),
  investments: collection("investments"),
  transactions: collection("transactions"),
  budgets: collection("budgets"),
  goals: collection("goals"),
  prompts: collection("prompts"),
  costModels: collection("costModels"),
  notes: collection("notes"),
  links: collection("links"),
  playbooks: collection("playbooks"),

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => current,
  snapshot: async () => current,
  initialize: () => enqueue(load),
  refresh: () => enqueue(load),
  signIn(key: string) {
    return enqueue(async () => {
      await api<{ ok: true }>("/api/login", {
        method: "POST",
        body: JSON.stringify({ key }),
      });
      await load();
    });
  },
  signOut() {
    return enqueue(async () => {
      await api<{ ok: true }>("/api/logout", { method: "POST", body: "{}" });
      revisions = {};
      publish({ ...emptyData(), settings: [] });
    });
  },

  saveSettings(changes: Partial<Omit<AppSettings, "id">>) {
    return enqueue(() =>
      putRecord("settings", {
        ...defaultSettings,
        ...current.settings[0],
        ...changes,
      }),
    );
  },

  clearDemoData() {
    return enqueue(async () => {
      await api<{ ok: true }>("/api/clear-demo", {
        method: "POST",
        body: "{}",
      });
      await load();
    });
  },

  personalizeWorkspace() {
    return enqueue(async () => {
      const {
        curatedCostModels,
        curatedPlaybooks,
        curatedProjects,
        curatedPrompts,
        curatedSundayTasks,
      } = await import("./workspace");
      await load();
      // Only these collections are part of the personalization. Money and
      // Notes are deliberately untouched, including their demo records.
      for (const row of current.tasks.filter((item) => item.demo))
        await deleteRecord("tasks", row.id);
      for (const row of current.projects.filter(
        (item) =>
          item.demo &&
          !current.tasks.some((task) => task.projectId === item.id),
      ))
        await deleteRecord("projects", row.id);
      for (const row of current.prompts.filter((item) => item.demo))
        await deleteRecord("prompts", row.id);
      for (const row of current.costModels.filter((item) => item.demo))
        await deleteRecord("costModels", row.id);
      for (const row of current.links.filter((item) => item.demo))
        await deleteRecord("links", row.id);
      for (const row of curatedProjects)
        if (!current.projects.some((item) => item.id === row.id))
          await putRecord("projects", row);
      for (const row of curatedSundayTasks())
        if (!current.tasks.some((item) => item.id === row.id))
          await putRecord("tasks", row);
      for (const row of curatedPrompts)
        if (!current.prompts.some((item) => item.id === row.id))
          await putRecord("prompts", row);
      for (const row of curatedCostModels)
        if (!current.costModels.some((item) => item.id === row.id))
          await putRecord("costModels", row);
      for (const row of curatedPlaybooks)
        if (!current.playbooks.some((item) => item.id === row.id))
          await putRecord("playbooks", row);
      await load();
    });
  },

  replaceAll(input: AppData) {
    return enqueue(async () => {
      const data = parseAppData(input);
      await api<{ ok: true }>("/api/replace", {
        method: "POST",
        body: JSON.stringify({ data }),
      });
      await load();
    });
  },

  reset() {
    return this.replaceAll(emptyData());
  },
};
