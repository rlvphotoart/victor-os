import { lazy, Suspense, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { AppData } from "./types";
import { repository } from "./data/repository";
import { Shell, MorePage } from "./components/Shell";
import { ToastProvider } from "./components/ui";
const DashboardPage = lazy(() =>
  import("./pages/Dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const TasksPage = lazy(() =>
  import("./pages/Tasks").then((module) => ({ default: module.TasksPage })),
);
const ProjectsPage = lazy(() =>
  import("./pages/Projects").then((module) => ({
    default: module.ProjectsPage,
  })),
);
const MoneyPage = lazy(() =>
  import("./pages/Money").then((module) => ({ default: module.MoneyPage })),
);
const AILabPage = lazy(() =>
  import("./pages/AILab").then((module) => ({ default: module.AILabPage })),
);
const NotesPage = lazy(() =>
  import("./pages/Notes").then((module) => ({ default: module.NotesPage })),
);
const ToolboxPage = lazy(() =>
  import("./pages/Toolbox").then((module) => ({ default: module.ToolboxPage })),
);
const LinksPage = lazy(() =>
  import("./pages/Links").then((module) => ({ default: module.LinksPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((module) => ({
    default: module.SettingsPage,
  })),
);

const empty: AppData = {
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
  settings: [],
};

function AppContent() {
  const data = useLiveQuery(() => repository.snapshot(), [], empty);
  const [error, setError] = useState("");
  useEffect(() => {
    repository
      .initialize()
      .catch((issue) =>
        setError(
          issue instanceof Error ? issue.message : "IndexedDB is unavailable.",
        ),
      );
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings[0]?.theme ?? "dark";
  }, [data.settings]);
  if (error)
    return (
      <div className="boot-error">
        <h1>Victor OS could not open local storage.</h1>
        <p>{error}</p>
        <p>Check your browser’s storage settings, then reload this page.</p>
      </div>
    );
  if (!data.settings.length)
    return (
      <div className="boot-screen">
        <div className="boot-logo">
          V<span>.</span>
        </div>
        <p>Opening your workspace...</p>
      </div>
    );
  return (
    <Shell data={data}>
      <Suspense fallback={<div className="route-loading">Opening...</div>}>
        <Routes>
          <Route path="/" element={<DashboardPage data={data} />} />
          <Route path="/tasks" element={<TasksPage data={data} />} />
          <Route path="/projects" element={<ProjectsPage data={data} />} />
          <Route path="/money" element={<MoneyPage data={data} />} />
          <Route path="/ai-lab" element={<AILabPage data={data} />} />
          <Route path="/notes" element={<NotesPage data={data} />} />
          <Route path="/toolbox" element={<ToolboxPage />} />
          <Route path="/links" element={<LinksPage data={data} />} />
          <Route path="/settings" element={<SettingsPage data={data} />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
