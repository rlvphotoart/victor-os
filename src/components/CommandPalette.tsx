import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Command,
  Home,
  LayoutGrid,
  Link2,
  ListTodo,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type { AppData } from "../types";
import { TOOLS } from "../types";
import { safeUrl } from "../lib/utils";

type Result = {
  key: string;
  kind: string;
  title: string;
  subtitle: string;
  path?: string;
  url?: string;
  icon: typeof Home;
};

export function CommandPalette({
  data,
  onClose,
}: {
  data: AppData;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = useMemo(() => {
    const pages: Result[] = [
      {
        key: "page-home",
        kind: "PAGE",
        title: "Dashboard",
        subtitle: "Daily overview",
        path: "/",
        icon: Home,
      },
      {
        key: "page-money",
        kind: "PAGE",
        title: "Money",
        subtitle: "Accounts, budget, and goals",
        path: "/money",
        icon: CircleDollarSign,
      },
      {
        key: "page-projects",
        kind: "PAGE",
        title: "Projects",
        subtitle: "Project overview",
        path: "/projects",
        icon: Boxes,
      },
      {
        key: "page-tasks",
        kind: "PAGE",
        title: "Tasks",
        subtitle: "Today and all tasks",
        path: "/tasks",
        icon: ListTodo,
      },
      {
        key: "page-ai",
        kind: "PAGE",
        title: "AI Lab",
        subtitle: "Prompt library and cost calculator",
        path: "/ai-lab",
        icon: Sparkles,
      },
      {
        key: "page-notes",
        kind: "PAGE",
        title: "Notes",
        subtitle: "Your notes",
        path: "/notes",
        icon: NotebookPen,
      },
      {
        key: "page-toolbox",
        kind: "PAGE",
        title: "Toolbox",
        subtitle: "Browser-only utilities",
        path: "/toolbox",
        icon: LayoutGrid,
      },
      {
        key: "page-links",
        kind: "PAGE",
        title: "Links",
        subtitle: "Quick links",
        path: "/links",
        icon: Link2,
      },
      {
        key: "page-settings",
        kind: "PAGE",
        title: "Settings",
        subtitle: "Preferences and backup",
        path: "/settings",
        icon: Settings2,
      },
    ];
    const all: Result[] = [
      ...pages,
      ...data.projects.map((item) => ({
        key: `project-${item.id}`,
        kind: "PROJECT",
        title: item.name,
        subtitle: item.nextAction,
        path: `/projects?open=${item.id}`,
        icon: Boxes,
      })),
      ...data.tasks.map((item) => ({
        key: `task-${item.id}`,
        kind: "TASK",
        title: item.title,
        subtitle: item.status,
        path: `/tasks?open=${item.id}`,
        icon: ListTodo,
      })),
      ...data.prompts.map((item) => ({
        key: `prompt-${item.id}`,
        kind: "PROMPT",
        title: item.title,
        subtitle: item.tool,
        path: `/ai-lab?open=${item.id}`,
        icon: Sparkles,
      })),
      ...data.notes.map((item) => ({
        key: `note-${item.id}`,
        kind: "NOTE",
        title: item.title || "Untitled note",
        subtitle: item.tags.join(", "),
        path: `/notes?open=${item.id}`,
        icon: NotebookPen,
      })),
      ...data.links.map((item) => ({
        key: `link-${item.id}`,
        kind: "LINK",
        title: item.name,
        subtitle: item.category,
        url: safeUrl(item.url) ?? undefined,
        icon: Link2,
      })),
      ...TOOLS.map((item) => ({
        key: `tool-${item.id}`,
        kind: "TOOL",
        title: item.name,
        subtitle: item.description,
        path: `/toolbox?tool=${item.id}`,
        icon: LayoutGrid,
      })),
    ];
    const term = query.trim().toLowerCase();
    return (
      term
        ? all.filter((item) =>
            `${item.title} ${item.subtitle} ${item.kind}`
              .toLowerCase()
              .includes(term),
          )
        : all.filter((item) => item.kind === "PAGE")
    ).slice(0, 12);
  }, [data, query]);
  const activate = (item: Result) => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
    else if (item.path) navigate(item.path);
    onClose();
  };
  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="palette-search">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            placeholder="Search pages, projects, tasks, prompts..."
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((index) => Math.min(index + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter" && results[selected])
                activate(results[selected]);
            }}
          />
          <button onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        <div className="palette-label">
          {query ? `${results.length} RESULTS` : "QUICK NAVIGATION"}
        </div>
        <div className="palette-results">
          {results.length ? (
            results.map((item, index) => (
              <button
                key={item.key}
                className={`palette-result ${selected === index ? "selected" : ""}`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => activate(item)}
              >
                <span className="palette-result-icon">
                  <item.icon size={18} />
                </span>
                <span className="palette-result-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <span className="palette-kind">{item.kind}</span>
                <ArrowRight size={15} />
              </button>
            ))
          ) : (
            <div className="palette-empty">
              No results. Try a project, task, prompt, or tool name.
            </div>
          )}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd> Open
          </span>
          <span>
            <kbd>esc</kbd> Close
          </span>
          <Command size={15} />
        </div>
      </div>
    </div>
  );
}
