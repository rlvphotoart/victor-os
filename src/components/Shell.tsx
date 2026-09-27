import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Command,
  Home,
  LayoutGrid,
  Link2,
  Menu,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import type { AppData } from "../types";
import { CommandPalette } from "./CommandPalette";
import { classNames } from "../lib/utils";

const navigation = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/money", label: "Money", icon: CircleDollarSign },
  { path: "/projects", label: "Projects", icon: Boxes },
  { path: "/tasks", label: "Tasks", icon: ListTodo },
  { path: "/ai-lab", label: "AI Lab", icon: Sparkles },
  { path: "/notes", label: "Notes", icon: NotebookPen },
  { path: "/toolbox", label: "Toolbox", icon: LayoutGrid },
  { path: "/links", label: "Links", icon: Link2 },
  { path: "/settings", label: "Settings", icon: Settings2 },
];
const mobileNavigation = [
  navigation[0],
  navigation[3],
  navigation[2],
  navigation[1],
];

export function Shell({
  data,
  children,
}: {
  data: AppData;
  children: ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const settings = data.settings[0];
  const isHome = location.pathname === "/";
  const current = navigation.find((item) => item.path === location.pathname);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("/")}
          aria-label="Victor OS dashboard"
        >
          <span className="brand-icon">
            V<span>.</span>
          </span>
          <span>
            <strong>VICTOR OS</strong>
            <small>PERSONAL COMMAND CENTER</small>
          </span>
        </button>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                classNames("side-link", isActive && "active")
              }
            >
              <item.icon size={18} strokeWidth={1.8} />
              {item.label}
              {item.path === "/tasks" &&
                data.tasks.filter(
                  (task) =>
                    task.status !== "Done" &&
                    task.dueDate &&
                    task.dueDate <= format(new Date(), "yyyy-MM-dd"),
                ).length > 0 && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-pulse" />
            <div>
              <strong>LOCAL FIRST</strong>
              <small>Your data stays on this device</small>
            </div>
          </div>
          <span className="sidebar-version">VICTOR OS / 1.0</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="mobile-brand">
              V<span>.</span>
            </span>
            <span className="breadcrumb">
              WORKSPACE <span>/</span> {current?.label.toUpperCase() ?? "MORE"}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={17} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="avatar"
              onClick={() => navigate("/settings")}
              aria-label="Open settings"
            >
              V
            </button>
          </div>
        </header>
        <main className="page-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow page-date">
                <Activity size={13} />{" "}
                {format(new Date(), "EEEE, d MMMM yyyy").toUpperCase()}
              </div>
              <h1>
                {isHome
                  ? `${greeting}, ${settings?.name || "Victor"}`
                  : (current?.label ?? "More")}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {isHome
                  ? "Here is your day at a glance."
                  : pageSubtitle(location.pathname)}
              </p>
            </div>
            {isHome && (
              <button
                className="intro-shortcut"
                onClick={() => navigate("/tasks?new=1")}
              >
                New task <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobileNavigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              classNames("bottom-link", isActive && "active")
            }
          >
            <item.icon size={21} strokeWidth={1.8} />
            <span>{item.path === "/" ? "Home" : item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            classNames("bottom-link", isActive && "active")
          }
        >
          <Menu size={21} strokeWidth={1.8} />
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
    "/money": "A clear view of what you own, owe, earn, and spend.",
    "/projects": "Keep every important initiative moving.",
    "/tasks": "Focus on the next meaningful action.",
    "/ai-lab": "Your best prompts and model costs, in one place.",
    "/notes": "Ideas worth keeping, always within reach.",
    "/toolbox": "Small utilities for work that moves quickly.",
    "/links": "A launchpad for your favorite places.",
    "/settings": "Make this command center your own.",
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
      <div className="more-foot">
        <Command size={16} /> Use the search bar to jump anywhere.
      </div>
    </div>
  );
}
