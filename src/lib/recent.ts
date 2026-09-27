import type { AppData, RecentContext } from "../types";
import { TOOLS } from "../types";

export function contextFromLocation(
  pathname: string,
  search: string,
  data: AppData,
): Omit<RecentContext, "at"> | null {
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
  return item ?? null;
}
