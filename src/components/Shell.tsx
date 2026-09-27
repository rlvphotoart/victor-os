import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
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

const navigation = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/tasks", label: "Tasks", icon: ListTodo },
  { path: "/projects", label: "Projects", icon: Boxes },
  { path: "/money", label: "Money", icon: CircleDollarSign },
  { path: "/ai-lab", label: "AI Lab", icon: Sparkles },
  { path: "/notes", label: "Notes", icon: NotebookPen },
  { path: "/toolbox", label: "Toolbox", icon: LayoutGrid },
  { path: "/links", label: "Links", icon: Link2 },
  { path: "/settings", label: "Settings", icon: Settings2 },
];
const compactPreference = "victor-os-sidebar-compact";

function getCompactPreference() {
  try {
    return window.localStorage.getItem(compactPreference) === "true";
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
  const [compact, setCompact] = useState(getCompactPreference);
  const location = useLocation();
  const navigate = useNavigate();
  const current = navigation.find((item) => item.path === location.pathname);
  const isHome = location.pathname === "/";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘ K"
    : "Ctrl K";
  const dueTasks = data.tasks.filter(
    (task) =>
      task.status !== "Done" &&
      task.dueDate &&
      task.dueDate <= format(new Date(), "yyyy-MM-dd"),
  ).length;
  const activeProjects = data.projects
    .filter((project) => project.status === "ACTIVE")
    .slice(0, 3);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.title = `${current?.label ?? "More"} — Victor OS`;
    setPaletteOpen(false);
  }, [current?.label, location.pathname]);

  const toggleCompact = () => {
    setCompact((value) => {
      try {
        window.localStorage.setItem(compactPreference, String(!value));
      } catch {
        /* session-only fallback */
      }
      return !value;
    });
  };

  const renderNav = (items: typeof navigation) =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/"}
        title={compact ? item.label : undefined}
        className={({ isActive }) =>
          classNames("side-link", isActive && "active")
        }
      >
        <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="side-link-label">{item.label}</span>
        {item.path === "/tasks" && dueTasks > 0 && (
          <span className="nav-count" aria-label={`${dueTasks} due tasks`}>
            {dueTasks}
          </span>
        )}
      </NavLink>
    ));

  return (
    <div className={classNames("app-shell", compact && "sidebar-compact")}>
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <button
            className="brand"
            onClick={() => navigate("/")}
            aria-label="Victor OS dashboard"
            title="Victor OS dashboard"
          >
            <span className="brand-icon">
              V<span>.</span>
            </span>
            <span className="brand-copy">
              <strong>Victor OS</strong>
              <small>PERSONAL COMMAND CENTER</small>
            </span>
          </button>
          <button
            className="sidebar-collapse"
            onClick={toggleCompact}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
        <div className="sidebar-scroll">
          <div className="sidebar-caption">WORKSPACE</div>
          <nav className="side-nav" aria-label="Main navigation">
            {renderNav(navigation.slice(0, 4))}
          </nav>
          <div className="sidebar-caption sidebar-caption-secondary">
            LIBRARY
          </div>
          <nav className="side-nav" aria-label="Library navigation">
            {renderNav(navigation.slice(4, 8))}
          </nav>
          {activeProjects.length > 0 && (
            <div className="sidebar-projects">
              <div className="sidebar-caption">IN MOTION</div>
              {activeProjects.map((project) => (
                <NavLink
                  key={project.id}
                  to={`/projects?open=${project.id}`}
                  className="sidebar-project-link"
                >
                  <span className="sidebar-project-dot" />
                  <span>{project.name}</span>
                  <ArrowUpRight size={13} />
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <div className="sidebar-bottom">
          <nav aria-label="Preferences">{renderNav(navigation.slice(8))}</nav>
          <div className="sidebar-local">
            <span className="local-pulse" />
            <span className="sidebar-local-copy">
              Private workspace <small>Stored on this device</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="mobile-brand">
              V<span>.</span>
            </span>
            <span className="breadcrumb">
              <span>VICTOR OS</span>
              <i>/</i>
              {current?.label ?? "More"}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search Victor OS"
            >
              <Search size={17} aria-hidden="true" />
              <span>Search or jump to…</span>
              <kbd>{shortcut}</kbd>
            </button>
            <button
              className="topbar-create"
              onClick={() => navigate("/tasks?new=1")}
              aria-label="Create task"
              title="Create task"
            >
              <Plus size={18} />
            </button>
            <button
              className="avatar"
              onClick={() => navigate("/settings")}
              aria-label="Open settings"
              title="Open settings"
            >
              V
            </button>
          </div>
        </header>
        <main className="page-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow page-date">
                {format(new Date(), "EEEE, d MMMM yyyy")}
              </div>
              <h1>
                {isHome
                  ? `${greeting}, ${data.settings[0]?.name || "Victor"}`
                  : (current?.label ?? "More")}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {isHome
                  ? "A clear view of what matters today."
                  : pageSubtitle(location.pathname)}
              </p>
            </div>
            {isHome && (
              <button
                className="intro-shortcut"
                onClick={() => navigate("/tasks?new=1")}
              >
                <Plus size={16} /> Add a task
              </button>
            )}
          </div>
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              classNames("bottom-link", isActive && "active")
            }
          >
            <item.icon size={21} strokeWidth={1.75} />
            <span>{item.path === "/" ? "Home" : item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            classNames(
              "bottom-link",
              (isActive ||
                navigation
                  .slice(4)
                  .some((item) => item.path === location.pathname)) &&
                "active",
            )
          }
        >
          <Menu size={21} strokeWidth={1.75} />
          <span>More</span>
        </NavLink>
      </nav>
      {paletteOpen && (
        <CommandPalette data={data} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}

function pageSubtitle(path: string) {
  const subtitles: Record<string, string> = {
    "/money": "Everything you own, owe, earn, and spend.",
    "/projects": "Keep meaningful work moving forward.",
    "/tasks": "Make room for the next meaningful action.",
    "/ai-lab": "Your prompt library and model costs.",
    "/notes": "A quiet place to think and remember.",
    "/toolbox": "Focused utilities, ready when you are.",
    "/links": "Your places, one step away.",
    "/settings": "Make this workspace yours.",
    "/more": "Everything else, one tap away.",
  };
  return subtitles[path] ?? "";
}

export function MorePage() {
  return (
    <div className="more-grid">
      {navigation.slice(4).map((item) => (
        <NavLink key={item.path} to={item.path} className="more-item">
          <span className="more-icon">
            <item.icon size={21} />
          </span>
          <span>{item.label}</span>
          <ArrowUpRight size={16} />
        </NavLink>
      ))}
    </div>
  );
}
