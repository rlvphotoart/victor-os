import type { AppData } from "../types";
import { TOOLS } from "../types";

export type RecentContext = {
  key: string;
  label: string;
  kind: "PROJECT" | "TASK" | "PROMPT" | "NOTE" | "TOOL";
  path: string;
  at: number;
};

const storageKey = "victor-os-meridian-recent";

export function readRecentContexts(): RecentContext[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is RecentContext =>
          typeof item === "object" &&
          item !== null &&
          typeof item.key === "string" &&
          typeof item.label === "string" &&
          typeof item.path === "string" &&
          item.path.startsWith("/") &&
          !item.path.startsWith("//") &&
          typeof item.at === "number" &&
          ["PROJECT", "TASK", "PROMPT", "NOTE", "TOOL"].includes(item.kind),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function rememberContext(
  pathname: string,
  search: string,
  data: AppData,
) {
  const params = new URLSearchParams(search);
  const id = params.get("open");
  let item: Omit<RecentContext, "at"> | undefined;
  if (id && pathname === "/projects") {
    const project = data.projects.find((row) => row.id === id);
    if (project)
      item = {
        key: `project-${id}`,
        label: project.name,
        kind: "PROJECT",
        path: `/projects?open=${id}`,
      };
  } else if (id && pathname === "/tasks") {
    const task = data.tasks.find((row) => row.id === id);
    if (task)
      item = {
        key: `task-${id}`,
        label: task.title,
        kind: "TASK",
        path: `/tasks?open=${id}`,
      };
  } else if (id && pathname === "/ai-lab") {
    const prompt = data.prompts.find((row) => row.id === id);
    if (prompt)
      item = {
        key: `prompt-${id}`,
        label: prompt.title,
        kind: "PROMPT",
        path: `/ai-lab?open=${id}`,
      };
  } else if (id && pathname === "/notes") {
    const note = data.notes.find((row) => row.id === id);
    if (note)
      item = {
        key: `note-${id}`,
        label: note.title || "Untitled note",
        kind: "NOTE",
        path: `/notes?open=${id}`,
      };
  } else if (pathname === "/toolbox") {
    const tool = TOOLS.find((row) => row.id === params.get("tool"));
    if (tool)
      item = {
        key: `tool-${tool.id}`,
        label: tool.name,
        kind: "TOOL",
        path: `/toolbox?tool=${tool.id}`,
      };
  }
  if (!item) return;
  try {
    const recent = readRecentContexts().filter((row) => row.key !== item.key);
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ ...item, at: Date.now() }, ...recent].slice(0, 6)),
    );
  } catch {
    /* Recent context is a convenience, never a dependency. */
  }
}
