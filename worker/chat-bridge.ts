import { z } from "zod";
import { parseRecord } from "../src/data/backup";
import { BUDGET_CATEGORIES } from "../src/types";
import type {
  AppSettings,
  Note,
  Project,
  Prompt,
  Task,
  Transaction,
} from "../src/types";

export interface ChatEnv {
  DB: D1Database;
  ACCESS_KEY?: string;
}

const owner = "victor";
export const chatSystemOwner = "__victor_oauth";
const systemOwner = chatSystemOwner;
const clientId = "https://chatgpt.com/oauth/client.json";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const scopes = ["victor.read", "victor.write"] as const;
const encoder = new TextEncoder();

type Grant = {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt: number;
  revokedAt?: number;
};
type AuthorizationCode = {
  grantId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scopes: string[];
  expiresAt: number;
};
type RefreshToken = {
  grantId: string;
  clientId: string;
  resource: string;
  scopes: string[];
  expiresAt: number;
};
type AccessToken = {
  grantId: string;
  clientId: string;
  iss: string;
  aud: string;
  scopes: string[];
  exp: number;
};

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  return base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}

async function sameKey(candidate: string, expected: string) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index++)
    difference |= a[index] ^ b[index];
  return difference === 0;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: AccessToken, secret: string) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode("victor-os-chat-v1." + body),
  );
  return body + "." + base64url(new Uint8Array(signature));
}

async function verifyToken(value: string, env: ChatEnv, resource: string) {
  if (!env.ACCESS_KEY) return null;
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra) return null;
  try {
    const verified = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env.ACCESS_KEY),
      fromBase64url(signature),
      encoder.encode("victor-os-chat-v1." + body),
    );
    if (!verified) return null;
    const token = JSON.parse(
      new TextDecoder().decode(fromBase64url(body)),
    ) as AccessToken;
    if (
      token.iss !== new URL(resource).origin ||
      token.aud !== resource ||
      token.clientId !== clientId ||
      !Array.isArray(token.scopes) ||
      !token.scopes.every((scope) =>
        scopes.includes(scope as (typeof scopes)[number]),
      ) ||
      !Number.isSafeInteger(token.exp) ||
      token.exp <= Date.now()
    )
      return null;
    const grant = await getSystemRecord<Grant>(env.DB, "grant", token.grantId);
    if (!grant || grant.revokedAt || grant.clientId !== clientId) return null;
    return token;
  } catch {
    return null;
  }
}

async function getSystemRecord<T>(
  db: D1Database,
  collection: string,
  id: string,
): Promise<T | null> {
  const row = await db
    .prepare(
      "SELECT payload FROM records WHERE owner = ? AND collection = ? AND id = ?",
    )
    .bind(systemOwner, collection, id)
    .first<{ payload: string }>();
  return row ? (JSON.parse(row.payload) as T) : null;
}

async function saveSystemRecord(
  db: D1Database,
  collection: string,
  id: string,
  payload: unknown,
) {
  await db
    .prepare(
      "INSERT INTO records (owner, collection, id, payload, revision) VALUES (?, ?, ?, ?, 1)",
    )
    .bind(systemOwner, collection, id, JSON.stringify(payload))
    .run();
}

async function consumeSystemRecord<T>(
  db: D1Database,
  collection: string,
  id: string,
): Promise<T | null> {
  const row = await getSystemRecord<T>(db, collection, id);
  if (!row) return null;
  const result = await db
    .prepare(
      "DELETE FROM records WHERE owner = ? AND collection = ? AND id = ?",
    )
    .bind(systemOwner, collection, id)
    .run();
  return result.meta.changes === 1 ? row : null;
}

async function grantTokens(env: ChatEnv, grant: Grant, resource: string) {
  const expiresIn = 60 * 60;
  const accessToken = await sign(
    {
      grantId: grant.id,
      clientId: grant.clientId,
      iss: new URL(resource).origin,
      aud: resource,
      scopes: grant.scopes,
      exp: Date.now() + expiresIn * 1000,
    },
    env.ACCESS_KEY!,
  );
  const refreshToken = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await saveSystemRecord(env.DB, "refresh", await digest(refreshToken), {
    grantId: grant.id,
    clientId: grant.clientId,
    resource,
    scopes: grant.scopes,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  } satisfies RefreshToken);
  return response({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: grant.scopes.join(" "),
  });
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function dateInBucharest(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const dateSchema = z.string().refine(validDate, "Use a real YYYY-MM-DD date.");
const shortText = z.string().trim().min(1).max(160);
const longText = z.string().max(10000);
const prioritySchema = z.enum(["Low", "Normal", "High", "Critical"]);
const taskStatusSchema = z.enum([
  "Inbox",
  "Next",
  "In Progress",
  "Waiting",
  "Done",
]);
const projectStatusSchema = z.enum([
  "IDEA",
  "PLANNING",
  "ACTIVE",
  "BLOCKED",
  "PAUSED",
  "DONE",
]);
const budgetCategorySchema = z.enum(BUDGET_CATEGORIES);

const taskCreateSchema = z.strictObject({
  title: shortText,
  projectId: z.string().max(200).optional(),
  priority: prioritySchema.optional(),
  dueDate: dateSchema.optional(),
  status: taskStatusSchema.optional(),
  notes: longText.optional(),
});
const taskUpdateSchema = z.strictObject({
  id: z.string().min(1),
  title: shortText.optional(),
  projectId: z.string().max(200).optional(),
  priority: prioritySchema.optional(),
  dueDate: z.union([dateSchema, z.literal("")]).optional(),
  status: taskStatusSchema.optional(),
  notes: longText.optional(),
});
const transactionSchema = z.strictObject({
  title: shortText,
  amount: z.number().finite().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  category: budgetCategorySchema,
  date: dateSchema,
  type: z.enum(["Income", "Expense"]),
  allowDuplicate: z.boolean().optional(),
});
const noteCreateSchema = z.strictObject({
  title: shortText,
  content: longText,
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  pinned: z.boolean().optional(),
});
const noteAppendSchema = z.strictObject({
  id: z.string().min(1),
  content: longText.min(1),
});
const projectCreateSchema = z.strictObject({
  name: shortText,
  summary: z.string().max(500).optional(),
  status: projectStatusSchema.optional(),
  priority: prioritySchema.optional(),
  nextAction: z.string().max(500).optional(),
  notes: longText.optional(),
});
const projectUpdateSchema = z.strictObject({
  id: z.string().min(1),
  name: shortText.optional(),
  summary: z.string().max(500).optional(),
  status: projectStatusSchema.optional(),
  priority: prioritySchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  nextAction: z.string().max(500).optional(),
  notes: longText.optional(),
});
const promptCreateSchema = z.strictObject({
  title: shortText,
  tool: shortText,
  category: shortText,
  prompt: longText.min(1),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}
function toolSuccess(value: Record<string, unknown>) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

async function records<T>(
  db: D1Database,
  collection: string,
): Promise<Array<{ value: T; revision: number }>> {
  const rows = await db
    .prepare(
      "SELECT payload, revision FROM records WHERE owner = ? AND collection = ?",
    )
    .bind(owner, collection)
    .all<{ payload: string; revision: number }>();
  return rows.results.map((row) => ({
    value: JSON.parse(row.payload) as T,
    revision: row.revision,
  }));
}

async function record<T>(
  db: D1Database,
  collection: string,
  id: string,
): Promise<{ value: T; revision: number } | null> {
  const row = await db
    .prepare(
      "SELECT payload, revision FROM records WHERE owner = ? AND collection = ? AND id = ?",
    )
    .bind(owner, collection, id)
    .first<{ payload: string; revision: number }>();
  return row
    ? { value: JSON.parse(row.payload) as T, revision: row.revision }
    : null;
}

async function insertRecord(
  db: D1Database,
  collection: string,
  value: { id: string },
) {
  const parsed = parseRecord(
    collection as Parameters<typeof parseRecord>[0],
    value,
  );
  await db
    .prepare(
      "INSERT INTO records (owner, collection, id, payload, revision) VALUES (?, ?, ?, ?, 1)",
    )
    .bind(owner, collection, parsed.id, JSON.stringify(parsed))
    .run();
}

async function updateRecord(
  db: D1Database,
  collection: string,
  value: { id: string },
  revision: number,
) {
  const parsed = parseRecord(
    collection as Parameters<typeof parseRecord>[0],
    value,
  );
  const result = await db
    .prepare(
      "UPDATE records SET payload = ?, revision = revision + 1 WHERE owner = ? AND collection = ? AND id = ? AND revision = ?",
    )
    .bind(JSON.stringify(parsed), owner, collection, parsed.id, revision)
    .run();
  return result.meta.changes === 1;
}

async function settings(db: D1Database): Promise<AppSettings | null> {
  return (await record<AppSettings>(db, "settings", "app"))?.value ?? null;
}

const toolDefinitions = [
  {
    name: "get_workspace_context",
    title: "Read Victor OS context",
    description:
      "Read the current Victor OS currency, projects, open tasks, and note titles before deciding where a conversational update belongs. Does not read financial balances or full notes.",
    inputSchema: z.toJSONSchema(z.strictObject({}), { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.read"] }],
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "create_task",
    title: "Create a Victor OS task",
    description:
      "Create a task or future payment reminder. A future or planned payment is a task, not a completed transaction. Resolve projectId with get_workspace_context. Do not invent a due date.",
    inputSchema: z.toJSONSchema(taskCreateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "update_task",
    title: "Update a Victor OS task",
    description:
      "Update an existing task by its exact ID after reading current context. Set status Done only when the user says the task is completed.",
    inputSchema: z.toJSONSchema(taskUpdateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "record_transaction",
    title: "Record a completed financial transaction",
    description:
      "Log an income or expense that the user says already happened. This only records it in Victor OS; it never transfers money or changes account balances or debt. Require exact amount, ISO date, category, and currency. Currency must match the workspace display currency; never silently convert. Possible duplicates are rejected unless allowDuplicate is explicitly justified.",
    inputSchema: z.toJSONSchema(transactionSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "create_note",
    title: "Save context as a Victor OS note",
    description:
      "Save durable context, ideas, meeting details, or information that is not an actionable task or a completed financial transaction.",
    inputSchema: z.toJSONSchema(noteCreateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "append_note",
    title: "Add context to an existing note",
    description:
      "Append new content to a known note ID without replacing its existing content. Read current context to resolve the note ID.",
    inputSchema: z.toJSONSchema(noteAppendSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "create_project",
    title: "Create a Victor OS project",
    description:
      "Create a distinct multi-step project. Use a task for a single action and a note for background context.",
    inputSchema: z.toJSONSchema(projectCreateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "update_project",
    title: "Update a Victor OS project",
    description:
      "Update the status, next action, notes, or progress of a known project. Never infer a precise progress percentage from vague language.",
    inputSchema: z.toJSONSchema(projectUpdateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "create_prompt",
    title: "Save a prompt to AI Lab",
    description:
      "Save a reusable AI prompt to the Victor OS AI Lab, with a title, target tool, category, and prompt text.",
    inputSchema: z.toJSONSchema(promptCreateSchema, { target: "draft-7" }),
    securitySchemes: [{ type: "oauth2", scopes: ["victor.write"] }],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
] as const;

async function callTool(
  db: D1Database,
  name: string,
  raw: unknown,
  appOrigin: string,
) {
  const args = raw && typeof raw === "object" ? raw : {};
  const now = new Date().toISOString();
  if (name === "get_workspace_context") {
    const [app, projects, tasks, notes] = await Promise.all([
      settings(db),
      records<Project>(db, "projects"),
      records<Task>(db, "tasks"),
      records<Note>(db, "notes"),
    ]);
    return toolSuccess({
      today: dateInBucharest(new Date()),
      timeZone: "Europe/Bucharest",
      currency: app?.currency ?? null,
      projects: projects.map(({ value }) => ({
        id: value.id,
        name: value.name,
        status: value.status,
        nextAction: value.nextAction,
      })),
      openTasks: tasks
        .filter(({ value }) => value.status !== "Done")
        .slice(0, 50)
        .map(({ value }) => ({
          id: value.id,
          title: value.title,
          status: value.status,
          dueDate: value.dueDate,
          projectId: value.projectId,
        })),
      notes: notes.map(({ value }) => ({
        id: value.id,
        title: value.title,
        tags: value.tags,
      })),
      transactionCategories: BUDGET_CATEGORIES,
    });
  }
  if (name === "create_task") {
    const input = taskCreateSchema.parse(args);
    if (input.projectId && !(await record(db, "projects", input.projectId)))
      return toolError(
        "Unknown projectId. Read workspace context and use an exact ID.",
      );
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      projectId: input.projectId ?? "",
      priority: input.priority ?? "Normal",
      dueDate: input.dueDate ?? "",
      status: input.status ?? (input.dueDate ? "Next" : "Inbox"),
      notes: input.notes ?? "",
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    const duplicate = (await records<Task>(db, "tasks")).find(
      ({ value }) =>
        value.status !== "Done" &&
        value.title.toLocaleLowerCase() === task.title.toLocaleLowerCase() &&
        value.dueDate === task.dueDate,
    );
    if (duplicate)
      return toolError(
        "A matching open task already exists: " +
          duplicate.value.id +
          ". Review it before creating another.",
      );
    await insertRecord(db, "tasks", task);
    return toolSuccess({
      action: "created",
      category: "task",
      id: task.id,
      title: task.title,
      url: appOrigin + "/tasks?open=" + task.id,
    });
  }
  if (name === "update_task") {
    const input = taskUpdateSchema.parse(args);
    const existing = await record<Task>(db, "tasks", input.id);
    if (!existing)
      return toolError("Task not found. Read workspace context again.");
    if (input.projectId && !(await record(db, "projects", input.projectId)))
      return toolError("Unknown projectId.");
    const { id, ...patch } = input;
    if (!Object.keys(patch).length)
      return toolError("Specify at least one task field to update.");
    const next = { ...existing.value, ...patch, updatedAt: now };
    if (!(await updateRecord(db, "tasks", next, existing.revision)))
      return toolError(
        "Task changed in another browser. Read context and retry.",
      );
    return toolSuccess({
      action: "updated",
      category: "task",
      id,
      title: next.title,
      url: appOrigin + "/tasks?open=" + id,
    });
  }
  if (name === "record_transaction") {
    const input = transactionSchema.parse(args);
    const app = await settings(db);
    if (!app?.currency)
      return toolError(
        "Workspace currency is not configured. Open Victor OS Settings before recording a transaction.",
      );
    const currency = app.currency;
    if (input.currency !== currency)
      return toolError(
        "Currency mismatch: Victor OS currently displays " +
          currency +
          ". No transaction was recorded. Ask for the amount in " +
          currency +
          " or change the workspace currency after reconciling existing figures. Never convert silently.",
      );
    const existing = (await records<Transaction>(db, "transactions")).find(
      ({ value }) =>
        value.title.toLocaleLowerCase() === input.title.toLocaleLowerCase() &&
        value.amount === input.amount &&
        value.category === input.category &&
        value.date === input.date &&
        value.type === input.type,
    );
    if (existing && !input.allowDuplicate)
      return toolError(
        "Possible duplicate transaction " +
          existing.value.id +
          ". No new record was created. Confirm that a separate transaction occurred before retrying with allowDuplicate=true.",
      );
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      title: input.title,
      amount: input.amount,
      category: input.category,
      date: input.date,
      type: input.type,
    };
    await insertRecord(db, "transactions", transaction);
    return toolSuccess({
      action: "created",
      category: "transaction",
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      currency,
      url: appOrigin + "/money",
      note: "Ledger entry only; no bank movement or account balance change.",
    });
  }
  if (name === "create_note") {
    const input = noteCreateSchema.parse(args);
    const note: Note = {
      id: crypto.randomUUID(),
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      pinned: input.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await insertRecord(db, "notes", note);
    return toolSuccess({
      action: "created",
      category: "note",
      id: note.id,
      title: note.title,
      url: appOrigin + "/notes?open=" + note.id,
    });
  }
  if (name === "append_note") {
    const input = noteAppendSchema.parse(args);
    const existing = await record<Note>(db, "notes", input.id);
    if (!existing)
      return toolError("Note not found. Read workspace context again.");
    const content = existing.value.content
      ? existing.value.content + "\n\n" + input.content
      : input.content;
    if (content.length > 50000)
      return toolError("This note is too long to append safely.");
    const next = { ...existing.value, content, updatedAt: now };
    if (!(await updateRecord(db, "notes", next, existing.revision)))
      return toolError(
        "Note changed in another browser. Read context and retry.",
      );
    return toolSuccess({
      action: "updated",
      category: "note",
      id: input.id,
      title: next.title,
      url: appOrigin + "/notes?open=" + input.id,
    });
  }
  if (name === "create_project") {
    const input = projectCreateSchema.parse(args);
    const duplicate = (await records<Project>(db, "projects")).find(
      ({ value }) =>
        value.name.toLocaleLowerCase() === input.name.toLocaleLowerCase(),
    );
    if (duplicate)
      return toolError(
        "Project already exists: " +
          duplicate.value.id +
          ". Update it instead.",
      );
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      summary: input.summary ?? "",
      status: input.status ?? "IDEA",
      priority: input.priority ?? "Normal",
      progress: 0,
      nextAction: input.nextAction ?? "",
      notes: input.notes ?? "",
      links: [],
    };
    await insertRecord(db, "projects", project);
    return toolSuccess({
      action: "created",
      category: "project",
      id: project.id,
      name: project.name,
      url: appOrigin + "/projects?open=" + project.id,
    });
  }
  if (name === "update_project") {
    const input = projectUpdateSchema.parse(args);
    const existing = await record<Project>(db, "projects", input.id);
    if (!existing)
      return toolError("Project not found. Read workspace context again.");
    const { id, ...patch } = input;
    if (!Object.keys(patch).length)
      return toolError("Specify at least one project field to update.");
    const next = { ...existing.value, ...patch };
    if (!(await updateRecord(db, "projects", next, existing.revision)))
      return toolError(
        "Project changed in another browser. Read context and retry.",
      );
    return toolSuccess({
      action: "updated",
      category: "project",
      id,
      name: next.name,
      url: appOrigin + "/projects?open=" + id,
    });
  }
  if (name === "create_prompt") {
    const input = promptCreateSchema.parse(args);
    const prompt: Prompt = {
      id: crypto.randomUUID(),
      title: input.title,
      tool: input.tool,
      category: input.category,
      prompt: input.prompt,
      description: input.description ?? "",
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      favorite: false,
      versions: [{ version: 1, content: input.prompt, date: now }],
    };
    await insertRecord(db, "prompts", prompt);
    return toolSuccess({
      action: "created",
      category: "prompt",
      id: prompt.id,
      title: prompt.title,
      url: appOrigin + "/ai-lab?open=" + prompt.id,
    });
  }
  return toolError("Unknown tool.");
}

function oauthContext(request: Request) {
  const issuer = new URL(request.url).origin;
  return { issuer, resource: issuer + "/mcp" };
}

function validAuthorization(params: URLSearchParams, request: Request) {
  const { resource } = oauthContext(request);
  const requestedScopes = (params.get("scope") ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (
    params.get("response_type") !== "code" ||
    params.get("client_id") !== clientId ||
    params.get("redirect_uri") !== redirectUri ||
    params.get("resource") !== resource ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(params.get("code_challenge") ?? "") ||
    !/^[\x21-\x7e]{1,1024}$/.test(params.get("state") ?? "") ||
    !requestedScopes.length ||
    !requestedScopes.every((scope) =>
      scopes.includes(scope as (typeof scopes)[number]),
    )
  )
    return null;
  return {
    state: params.get("state")!,
    codeChallenge: params.get("code_challenge")!,
    requestedScopes,
    resource,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function authorizationPage(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = validAuthorization(params, request);
  if (!parsed)
    return response({ error: "Invalid ChatGPT authorization request." }, 400);
  const hidden = [
    "response_type",
    "client_id",
    "redirect_uri",
    "resource",
    "code_challenge",
    "code_challenge_method",
    "state",
    "scope",
  ]
    .map(
      (key) =>
        '<input type="hidden" name="' +
        key +
        '" value="' +
        escapeHtml(params.get(key) ?? "") +
        '">',
    )
    .join("");
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect ChatGPT · Victor OS</title><style>body{font-family:system-ui;background:#101713;color:#eef5ee;margin:0;min-height:100vh;display:grid;place-items:center;padding:20px}main{max-width:430px;background:#18221c;border:1px solid #344238;border-radius:20px;padding:30px}h1{font-size:26px;margin:0 0 12px}p{line-height:1.6;color:#b7c8bc}label{display:block;margin:24px 0 7px}input[type=password]{width:100%;box-sizing:border-box;background:#0c130f;border:1px solid #5b6e5e;border-radius:10px;padding:14px;color:white;font-size:16px}button{margin-top:20px;width:100%;background:#c9f28c;color:#101713;border:0;border-radius:10px;padding:15px;font-weight:700;font-size:16px;cursor:pointer}small{color:#9db09f;line-height:1.5;display:block;margin-top:18px}</style></head><body><main><h1>Connect ChatGPT to Victor OS</h1><p>ChatGPT can read your workspace context and create or update tasks, notes, projects, prompts, and recorded transactions. It cannot move money or change account balances. Changes appear live in Victor OS.</p><form method="post" action="/oauth/authorize">' +
    hidden +
    '<label for="key">Victor OS access key</label><input id="key" type="password" name="key" autocomplete="off" required minlength="32"><button type="submit">Authorize this connection</button></form><small>Your key goes only to your Victor OS Worker. ChatGPT receives a revocable connection token, never this key. Review the scopes: ' +
    escapeHtml(parsed.requestedScopes.join(", ")) +
    ".</small></main></body></html>";
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function approveAuthorization(request: Request, env: ChatEnv) {
  const origin = new URL(request.url).origin;
  if (
    request.headers.get("Origin") !== origin ||
    !request.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return response({ error: "Invalid authorization form." }, 403);
  if (!env.ACCESS_KEY || env.ACCESS_KEY.length < 32)
    return response({ error: "Victor OS access is not configured." }, 503);
  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [key, value] of form)
    if (typeof value === "string") params.set(key, value);
  const parsed = validAuthorization(params, request);
  if (!parsed)
    return response({ error: "Invalid ChatGPT authorization request." }, 400);
  const candidate = params.get("key") ?? "";
  if (!(await sameKey(candidate, env.ACCESS_KEY)))
    return response({ error: "Access key is incorrect." }, 401);
  const grant: Grant = {
    id: crypto.randomUUID(),
    clientId,
    scopes: parsed.requestedScopes,
    createdAt: Date.now(),
  };
  const code = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await saveSystemRecord(env.DB, "grant", grant.id, grant);
  await saveSystemRecord(env.DB, "code", await digest(code), {
    grantId: grant.id,
    clientId,
    redirectUri,
    codeChallenge: parsed.codeChallenge,
    resource: parsed.resource,
    scopes: parsed.requestedScopes,
    expiresAt: Date.now() + 5 * 60 * 1000,
  } satisfies AuthorizationCode);
  const destination = new URL(redirectUri);
  destination.searchParams.set("code", code);
  destination.searchParams.set("state", parsed.state);
  destination.searchParams.set("iss", origin);
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function exchangeToken(request: Request, env: ChatEnv) {
  if (!env.ACCESS_KEY || env.ACCESS_KEY.length < 32)
    return response({ error: "server_unavailable" }, 503);
  if (
    !request.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return response({ error: "invalid_request" }, 400);
  const params = new URLSearchParams(await request.text());
  const { resource } = oauthContext(request);
  if (
    params.get("client_id") !== clientId ||
    params.get("resource") !== resource
  )
    return response({ error: "invalid_client" }, 400);
  const grantType = params.get("grant_type");
  if (grantType === "authorization_code") {
    const code = params.get("code") ?? "";
    const verifier = params.get("code_verifier") ?? "";
    if (
      !code ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
      params.get("redirect_uri") !== redirectUri
    )
      return response({ error: "invalid_grant" }, 400);
    const saved = await consumeSystemRecord<AuthorizationCode>(
      env.DB,
      "code",
      await digest(code),
    );
    if (
      !saved ||
      saved.expiresAt <= Date.now() ||
      saved.clientId !== clientId ||
      saved.redirectUri !== redirectUri ||
      saved.resource !== resource ||
      saved.codeChallenge !== (await digest(verifier))
    )
      return response({ error: "invalid_grant" }, 400);
    const grant = await getSystemRecord<Grant>(env.DB, "grant", saved.grantId);
    if (!grant || grant.revokedAt)
      return response({ error: "invalid_grant" }, 400);
    return grantTokens(env, grant, resource);
  }
  if (grantType === "refresh_token") {
    const token = params.get("refresh_token") ?? "";
    if (!token) return response({ error: "invalid_grant" }, 400);
    const saved = await consumeSystemRecord<RefreshToken>(
      env.DB,
      "refresh",
      await digest(token),
    );
    if (
      !saved ||
      saved.expiresAt <= Date.now() ||
      saved.clientId !== clientId ||
      saved.resource !== resource
    )
      return response({ error: "invalid_grant" }, 400);
    const grant = await getSystemRecord<Grant>(env.DB, "grant", saved.grantId);
    if (!grant || grant.revokedAt)
      return response({ error: "invalid_grant" }, 400);
    return grantTokens(env, grant, resource);
  }
  return response({ error: "unsupported_grant_type" }, 400);
}

function rpc(id: string | number, result: unknown) {
  return response({ jsonrpc: "2.0", id, result }, 200, {
    "MCP-Protocol-Version": "2025-11-25",
  });
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  status = 200,
  headers: Record<string, string> = {},
) {
  return response(
    { jsonrpc: "2.0", id, error: { code, message } },
    status,
    headers,
  );
}

function authChallenge(
  id: string | number,
  request: Request,
  scope: string,
  reason: "invalid_token" | "insufficient_scope",
  invalidToken: boolean,
) {
  const metadata =
    new URL(request.url).origin + "/.well-known/oauth-protected-resource";
  const challenge =
    'Bearer resource_metadata="' +
    metadata +
    '", scope="' +
    scope +
    '", error="' +
    reason +
    '", error_description="Connect Victor OS in ChatGPT"';
  return response(
    {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          { type: "text", text: "Connect Victor OS to authorize this tool." },
        ],
        _meta: { "mcp/www_authenticate": [challenge] },
        isError: true,
      },
    },
    invalidToken ? 401 : 200,
    invalidToken ? { "WWW-Authenticate": challenge } : {},
  );
}

async function mcpRequest(request: Request, env: ChatEnv) {
  if (request.method === "GET")
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST, DELETE" },
    });
  if (request.method === "DELETE") return new Response(null, { status: 200 });
  if (
    request.method !== "POST" ||
    !request.headers.get("Content-Type")?.startsWith("application/json")
  )
    return rpcError(null, -32600, "JSON POST required.", 400);
  const body = await request.text();
  if (encoder.encode(body).byteLength > 64 * 1024)
    return rpcError(null, -32600, "Request is too large.", 413);
  let message: {
    jsonrpc?: string;
    id?: string | number;
    method?: string;
    params?: Record<string, unknown>;
  };
  try {
    message = JSON.parse(body);
  } catch {
    return rpcError(null, -32700, "Invalid JSON.", 400);
  }
  if (
    !message ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string" ||
    Array.isArray(message)
  )
    return rpcError(null, -32600, "Invalid JSON-RPC request.", 400);
  if (message.method.startsWith("notifications/"))
    return new Response(null, { status: 202 });
  const id = message.id;
  if (typeof id !== "string" && typeof id !== "number")
    return rpcError(null, -32600, "Missing request ID.", 400);
  if (message.method === "initialize") {
    const supported = ["2025-11-25", "2025-06-18", "2025-03-26"];
    const requested =
      typeof message.params?.protocolVersion === "string"
        ? message.params.protocolVersion
        : "";
    return rpc(id, {
      protocolVersion: supported.includes(requested) ? requested : supported[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "victor-os", version: "1.0.0" },
      instructions:
        "Classify each user request before writing. Completed payment = recorded transaction; future payment = task; durable context = note; multi-step effort = project. Read workspace context first. Ask for missing amount, currency, date, or target ID. Never invent financial facts or silently convert currencies. Successful writes appear live in Victor OS without code deployment.",
    });
  }
  if (message.method === "ping") return rpc(id, {});
  if (message.method === "tools/list")
    return rpc(id, { tools: toolDefinitions });
  if (message.method !== "tools/call")
    return rpcError(id, -32601, "Method not found.");
  const name = message.params?.name;
  if (
    typeof name !== "string" ||
    !toolDefinitions.some((tool) => tool.name === name)
  )
    return rpcError(id, -32602, "Unknown tool.");
  const bearer =
    request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? "";
  const token = await verifyToken(bearer, env, oauthContext(request).resource);
  const needed =
    name === "get_workspace_context" ? "victor.read" : "victor.write";
  if (!token)
    return authChallenge(id, request, needed, "invalid_token", Boolean(bearer));
  if (!token.scopes.includes(needed))
    return authChallenge(id, request, needed, "insufficient_scope", false);
  try {
    return rpc(
      id,
      await callTool(
        env.DB,
        name,
        message.params?.arguments,
        new URL(request.url).origin,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return rpc(
        id,
        toolError(
          "Invalid fields: " +
            error.issues
              .map((issue) => issue.path.join(".") + " " + issue.message)
              .join("; "),
        ),
      );
    return rpc(
      id,
      toolError(
        "Victor OS could not save this change. No successful result was confirmed; check the app before retrying.",
      ),
    );
  }
}

export async function chatRoute(
  request: Request,
  env: ChatEnv,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    path === "/.well-known/oauth-protected-resource" &&
    request.method === "GET"
  ) {
    const { issuer, resource } = oauthContext(request);
    return response({
      resource,
      authorization_servers: [issuer],
      scopes_supported: scopes,
    });
  }
  if (
    path === "/.well-known/oauth-authorization-server" &&
    request.method === "GET"
  ) {
    const { issuer } = oauthContext(request);
    return response({
      issuer,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: issuer + "/oauth/authorize",
      token_endpoint: issuer + "/oauth/token",
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: scopes,
    });
  }
  if (path === "/oauth/authorize") {
    if (request.method === "GET") return authorizationPage(request);
    if (request.method === "POST") return approveAuthorization(request, env);
    return response({ error: "Method not allowed." }, 405);
  }
  if (path === "/oauth/token") {
    if (request.method === "POST") return exchangeToken(request, env);
    return response({ error: "Method not allowed." }, 405);
  }
  if (path === "/mcp") return mcpRequest(request, env);
  return null;
}

export async function listChatConnections(db: D1Database) {
  const rows = await db
    .prepare(
      "SELECT payload FROM records WHERE owner = ? AND collection = 'grant'",
    )
    .bind(systemOwner)
    .all<{ payload: string }>();
  return rows.results
    .map((row) => JSON.parse(row.payload) as Grant)
    .filter((grant) => !grant.revokedAt)
    .map((grant) => ({
      id: grant.id,
      createdAt: grant.createdAt,
      scopes: grant.scopes,
    }));
}

export async function revokeChatConnection(db: D1Database, id: string) {
  const result = await db
    .prepare(
      "DELETE FROM records WHERE owner = ? AND collection = 'grant' AND id = ?",
    )
    .bind(systemOwner, id)
    .run();
  return result.meta.changes === 1;
}
