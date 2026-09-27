import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Command,
  Download,
  Home,
  LayoutGrid,
  Link2,
  ListTodo,
  NotebookPen,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SunMoon,
  X,
} from "lucide-react";
import type { AppData } from "../types";
import { TOOLS } from "../types";
import { downloadText, nowISO, safeUrl, today, uid } from "../lib/utils";
import { repository } from "../data/repository";
import { useToast } from "./toast";

type Result = {
  key: string;
  kind: string;
  title: string;
  subtitle: string;
  section?: string;
  path?: string;
  url?: string;
  action?: "new-note" | "theme" | "export";
  icon: typeof Home;
};
const emptyRecent: string[] = [];
export function CommandPalette({
  data,
  onClose,
}: {
  data: AppData;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const recent = data.settings[0]?.recentCommands ?? emptyRecent;
  const input = useRef<HTMLInputElement>(null);
  const palette = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    input.current?.focus();
    return () => {
      previous?.focus();
    };
  }, []);
  const results = useMemo(() => {
    const pages: Result[] = [
      {
        key: "page-home",
        kind: "PAGE",
        title: "Home",
        subtitle: "Now, attention, and recent",
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
    const actions: Result[] = [
      {
        key: "action-task",
        kind: "ACTION",
        title: "Create task",
        subtitle: "Start a new task",
        path: "/tasks?new=1",
        icon: Plus,
      },
      {
        key: "action-project",
        kind: "ACTION",
        title: "Create project",
        subtitle: "Open a new workstream",
        path: "/projects?new=1",
        icon: Boxes,
      },
      {
        key: "action-prompt",
        kind: "ACTION",
        title: "Create prompt",
        subtitle: "Add to the prompt library",
        path: "/ai-lab?new=1",
        icon: Sparkles,
      },
      {
        key: "action-note",
        kind: "ACTION",
        title: "Create note",
        subtitle: "Begin a cloud note",
        action: "new-note",
        icon: NotebookPen,
      },
      {
        key: "action-theme",
        kind: "ACTION",
        title: "Switch theme",
        subtitle: "Toggle dark and light",
        action: "theme",
        icon: SunMoon,
      },
      {
        key: "action-export",
        kind: "ACTION",
        title: "Export all data",
        subtitle: "Download a complete local backup",
        action: "export",
        icon: Download,
      },
    ];
    const all: Result[] = [
      ...actions,
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
      ...data.links
        .filter((item) => safeUrl(item.url))
        .map((item) => ({
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
    if (term) {
      return all
        .filter((item) =>
          `${item.title} ${item.subtitle} ${item.kind}`
            .toLowerCase()
            .includes(term),
        )
        .slice(0, 14)
        .map((item) => ({
          ...item,
          section: item.kind === "PAGE" ? "PAGES" : `${item.kind}S`,
        }));
    }
    const recentItems = recent
      .map((key) => all.find((item) => item.key === key))
      .filter((item): item is Result => Boolean(item))
      .map((item) => ({ ...item, section: "RECENT" }))
      .slice(0, 3);
    const chosen = new Set(recentItems.map((item) => item.key));
    return [
      ...recentItems,
      ...actions
        .filter((item) => !chosen.has(item.key))
        .slice(0, 3)
        .map((item) => ({ ...item, section: "QUICK ACTIONS" })),
      ...pages
        .filter((item) => !chosen.has(item.key))
        .slice(0, 6)
        .map((item) => ({ ...item, section: "NAVIGATION" })),
      ...all
        .filter((item) => item.kind === "TOOL" && !chosen.has(item.key))
        .slice(0, 3)
        .map((item) => ({ ...item, section: "UTILITIES" })),
    ].slice(0, 16);
  }, [data, query, recent]);
  const groups = results.reduce<
    { name: string; items: { item: Result; index: number }[] }[]
  >((acc, item, index) => {
    const name = item.section ?? item.kind;
    const group = acc.find((entry) => entry.name === name);
    if (group) group.items.push({ item, index });
    else acc.push({ name, items: [{ item, index }] });
    return acc;
  }, []);
  const activate = async (item: Result) => {
    const next = [item.key, ...recent.filter((key) => key !== item.key)].slice(
      0,
      5,
    );
    void repository.saveSettings({ recentCommands: next });
    try {
      if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
      else if (item.path) navigate(item.path);
      else if (item.action === "theme") {
        await repository.saveSettings({
          theme: data.settings[0]?.theme === "light" ? "dark" : "light",
        });
      } else if (item.action === "export") {
        const { makeBackup } = await import("../data/backup");
        downloadText(
          `victor-os-backup-${today()}.json`,
          JSON.stringify(makeBackup(data), null, 2),
        );
        notify("Backup exported");
      } else if (item.action === "new-note") {
        const timestamp = nowISO();
        const id = uid();
        await repository.notes.save({
          id,
          title: "",
          content: "",
          tags: [],
          pinned: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        navigate(`/notes?open=${id}`);
      }
      onClose();
    } catch {
      notify("Could not complete that command", "error");
    }
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
        ref={palette}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const elements = palette.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled])",
          );
          if (!elements?.length) return;
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="palette-heading">
          <span className="palette-mark">
            V<span>/</span>
          </span>
          <span>
            VICTOR COMMAND <small>SYSTEM ACTIONS + SEARCH</small>
          </span>
          <kbd>ESC</kbd>
        </div>
        <div className="palette-search">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            placeholder="Ask the system to open or do something…"
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
        <div className="palette-results">
          {results.length ? (
            groups.map((group) => (
              <div className="palette-group" key={group.name}>
                <div className="palette-label">{group.name}</div>
                {group.items.map(({ item, index }) => (
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
                ))}
              </div>
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
