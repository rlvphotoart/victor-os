import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Command,
  Home,
  LayoutGrid,
  Link2,
  ListTodo,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { AppData } from "../types";
import { CommandPalette } from "./CommandPalette";
import { classNames } from "../lib/utils";
import { rememberContext } from "../lib/recent";

const navigation = [
  { path: "/", label: "Home", icon: Home, index: "00" },
  { path: "/tasks", label: "Tasks", icon: ListTodo, index: "01" },
  { path: "/projects", label: "Projects", icon: Boxes, index: "02" },
  { path: "/money", label: "Money", icon: CircleDollarSign, index: "03" },
  { path: "/ai-lab", label: "AI Lab", icon: Sparkles, index: "04" },
  { path: "/notes", label: "Notes", icon: NotebookPen, index: "05" },
  { path: "/toolbox", label: "Tools", icon: LayoutGrid, index: "06" },
  { path: "/links", label: "Links", icon: Link2, index: "07" },
  { path: "/settings", label: "Settings", icon: Settings2, index: "08" },
] as const;

const descriptions: Record<string, string> = {
  "/tasks": "The next action, in the right place.",
  "/projects": "Move meaningful work from intent to done.",
  "/money": "An honest reading of what you own and owe.",
  "/ai-lab": "Your working library of prompts and model costs.",
  "/notes": "A quieter place for thoughts worth keeping.",
  "/toolbox": "Small instruments for precise work.",
  "/links": "Your destinations, without the search.",
  "/settings": "Personalize the system and protect your data.",
  "/more": "The rest of your workspace.",
};

const dockPreference = "victor-os-spine-expanded";
function loadDockPreference() {
  try {
    return localStorage.getItem(dockPreference) === "true";
  } catch {
    return false;
  }
}

export function Shell({
  data,
  children,
}: {
  data: AppData;
  children: ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [expanded, setExpanded] = useState(loadDockPreference);
  const [clock, setClock] = useState(() => new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const current = navigation.find((item) => item.path === location.pathname);
  const isHome = location.pathname === "/";
  const dueTasks = data.tasks.filter(
    (task) =>
      task.status !== "Done" &&
      task.dueDate &&
      task.dueDate <= format(clock, "yyyy-MM-dd"),
  ).length;
  const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘ K"
    : "Ctrl K";

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") setPaletteOpen(false);
      const target = event.target as HTMLElement | null;
      const typing = target?.matches(
        "input, textarea, select, [contenteditable='true']",
      );
      if (
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        navigate("/tasks?new=1");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
  useEffect(() => {
    document.title = `${current?.label ?? "More"} — Victor OS`;
    setPaletteOpen(false);
  }, [current?.label, location.pathname]);
  useEffect(
    () => rememberContext(location.pathname, location.search, data),
    [location.pathname, location.search, data],
  );

  const toggleExpanded = () =>
    setExpanded((value) => {
      try {
        localStorage.setItem(dockPreference, String(!value));
      } catch {
        /* session only */
      }
      return !value;
    });
  const renderDockLink = (item: (typeof navigation)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === "/"}
      title={item.label}
      className={({ isActive }) =>
        classNames("vos-dock-link", isActive && "active")
      }
    >
      <span className="vos-dock-number">{item.index}</span>
      <item.icon size={19} strokeWidth={1.7} aria-hidden="true" />
      <span className="vos-dock-label">{item.label}</span>
      {item.path === "/tasks" && dueTasks > 0 && (
        <span className="vos-dock-count" aria-label={`${dueTasks} due tasks`}>
          {dueTasks}
        </span>
      )}
    </NavLink>
  );

  return (
    <div
      className={classNames(
        "app-shell vos-shell",
        expanded && "vos-dock-expanded",
      )}
      data-workspace={current?.label.toLowerCase() ?? "more"}
      data-mode={
        paletteOpen
          ? "command"
          : /(?:^|[?&])(?:open|new)=/.test(location.search)
            ? "focus"
            : "normal"
      }
    >
      <aside className="vos-dock" aria-label="System dock">
        <div className="vos-dock-brand">
          <button
            onClick={() => navigate("/")}
            aria-label="Victor OS home"
            title="Victor OS home"
            className="vos-mark"
          >
            <span>V</span>
            <i aria-hidden="true" />
          </button>
          <span className="vos-dock-wordmark">VICTOR / OS</span>
        </div>
        <nav className="vos-dock-nav" aria-label="Workspaces">
          {navigation.slice(0, 4).map(renderDockLink)}
          <div className="vos-dock-separator" aria-hidden="true" />
          {navigation.slice(4, 8).map(renderDockLink)}
        </nav>
        <div className="vos-dock-bottom">
          {renderDockLink(navigation[8])}
          <button
            className="vos-dock-expand"
            onClick={toggleExpanded}
            aria-label={expanded ? "Compress dock" : "Expand dock"}
            title={expanded ? "Compress dock" : "Expand dock"}
          >
            {expanded ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
            <span>{expanded ? "Compress" : "Expand"}</span>
          </button>
        </div>
      </aside>

      <div className="app-main vos-main">
        <header className="vos-systembar">
          <div className="vos-system-left">
            <span className="vos-mobile-mark" aria-hidden="true">
              V<i />
            </span>
            <span className="vos-system-code">V/OS</span>
            <span className="vos-system-divider" aria-hidden="true" />
            <span className="vos-system-context">
              {current?.index ?? "09"} <span>/</span> {current?.label ?? "More"}
            </span>
          </div>
          <div className="vos-system-right">
            <span
              className="vos-system-time"
              aria-label={`Local time ${format(clock, "HH:mm")}`}
            >
              {format(clock, "EEE d MMM").toUpperCase()}{" "}
              <b>{format(clock, "HH:mm")}</b>
            </span>
            <span className="vos-local-state">
              <i aria-hidden="true" /> LOCAL
            </span>
            <button
              className="vos-command-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open Victor Command"
            >
              <Search size={16} strokeWidth={1.8} />
              <span>Victor Command</span>
              <kbd>{shortcut}</kbd>
            </button>
            <button
              className="vos-system-create"
              onClick={() => navigate("/tasks?new=1")}
              aria-label="Create task"
              title="Create task"
            >
              <Plus size={19} />
            </button>
          </div>
        </header>
        <main className="page-content vos-workspace" key={location.pathname}>
          {!isHome && (
            <div className="vos-workspace-header">
              <div className="vos-workspace-header-top">
                <span className="vos-header-rule" /> WORKSPACE{" "}
                {current?.index ?? "09"}{" "}
                <span className="vos-header-slash">/</span>{" "}
                {current?.label.toUpperCase() ?? "MORE"}
              </div>
              <div className="vos-workspace-heading">
                <div>
                  <h1>
                    {current?.label ?? "More"}
                    <span>.</span>
                  </h1>
                  <p>{descriptions[location.pathname]}</p>
                </div>
                <span className="vos-workspace-position" aria-hidden="true">
                  {current?.index ?? "09"}
                  <small> / 09</small>
                </span>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      <nav className="vos-mobile-dock" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              classNames("vos-mobile-dock-link", isActive && "active")
            }
          >
            <span className="vos-mobile-dock-index">{item.index}</span>
            <item.icon size={20} strokeWidth={1.7} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            classNames(
              "vos-mobile-dock-link",
              (isActive ||
                navigation
                  .slice(4)
                  .some((item) => item.path === location.pathname)) &&
                "active",
            )
          }
        >
          <span className="vos-mobile-dock-index">09</span>
          <Menu size={20} strokeWidth={1.7} />
          <span>More</span>
        </NavLink>
        <button
          className="vos-mobile-command"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open Victor Command"
          title="Victor Command"
        >
          <Command size={19} />
        </button>
      </nav>
      {paletteOpen && (
        <CommandPalette data={data} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}

export function MorePage() {
  return (
    <div className="vos-more-list">
      {navigation.slice(4).map((item) => (
        <NavLink key={item.path} to={item.path} className="vos-more-row">
          <span className="vos-more-index">{item.index}</span>
          <item.icon size={21} strokeWidth={1.6} />
          <span>{item.label}</span>
          <ArrowRight size={17} />
        </NavLink>
      ))}
      <div className="vos-more-local">
        <span className="vos-local-state">
          <i /> LOCAL DATA
        </span>
        <span>Stored on this device</span>
      </div>
    </div>
  );
}
