import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RepositoryError, repository } from "./data/repository";
import { Shell, MorePage } from "./components/Shell";
import { ToastProvider } from "./components/ui";
import { useToast } from "./components/toast";
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
const PlaybooksPage = lazy(() =>
  import("./pages/Playbooks").then((module) => ({
    default: module.PlaybooksPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((module) => ({
    default: module.SettingsPage,
  })),
);

function AppContent() {
  const data = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [accessKey, setAccessKey] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const notify = useToast();
  const showIssue = (issue: unknown) => {
    setError(
      issue instanceof Error ? issue.message : "Cloud data is unavailable.",
    );
    setErrorStatus(issue instanceof RepositoryError ? issue.status : 0);
  };
  useEffect(() => {
    repository.initialize().catch((issue) => {
      setError(
        issue instanceof Error ? issue.message : "Cloud data is unavailable.",
      );
      setErrorStatus(issue instanceof RepositoryError ? issue.status : 0);
    });
  }, []);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && data.settings.length) {
        void repository.refresh().catch((issue: unknown) => {
          notify(
            issue instanceof Error ? issue.message : "Sync failed.",
            "error",
          );
        });
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [data.settings.length, notify]);
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof RepositoryError) {
        event.preventDefault();
        notify(event.reason.message, "error");
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings[0]?.theme ?? "dark";
  }, [data.settings]);
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    setError("");
    try {
      await repository.signIn(accessKey);
      setAccessKey("");
      setErrorStatus(0);
    } catch (issue) {
      showIssue(issue);
    } finally {
      setSigningIn(false);
    }
  };
  if (errorStatus === 401 || errorStatus === 503)
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <div className="boot-logo">
            V<span>.</span>
          </div>
          <span className="eyebrow">VICTOR OS / PRIVATE WORKSPACE</span>
          <h1>
            {errorStatus === 503
              ? "Cloud setup needed."
              : "Welcome back, Victor."}
          </h1>
          {errorStatus === 503 ? (
            <>
              <p>
                Add an encrypted <strong>ACCESS_KEY</strong> secret of at least
                32 random characters in Cloudflare → Workers & Pages → victor-os
                → Settings → Variables and secrets. Save the key in your
                password manager, then return here.
              </p>
              <button
                className="button button-primary"
                onClick={() => {
                  setError("");
                  void repository.initialize().catch(showIssue);
                }}
              >
                Check connection
              </button>
            </>
          ) : (
            <form
              onSubmit={(event) => void signIn(event)}
              className="auth-form"
            >
              <p>
                Enter the access key stored in your password manager. You only
                need it once per browser for each session.
              </p>
              <label htmlFor="access-key">Access key</label>
              <input
                id="access-key"
                type="password"
                value={accessKey}
                autoComplete="current-password"
                onChange={(event) => setAccessKey(event.target.value)}
                autoFocus
              />
              {error && error !== "Sign in with your Victor OS access key." && (
                <p className="form-error">{error}</p>
              )}
              <button
                className="button button-primary"
                disabled={signingIn || !accessKey}
                type="submit"
              >
                {signingIn ? "Opening…" : "Open Victor OS"}
              </button>
            </form>
          )}
        </div>
      </main>
    );
  if (error)
    return (
      <div className="boot-error">
        <h1>Victor OS could not connect to cloud data.</h1>
        <p>{error}</p>
        <button
          onClick={() => {
            setError("");
            void repository.initialize().catch(showIssue);
          }}
        >
          Retry connection
        </button>
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
          <Route path="/playbooks" element={<PlaybooksPage data={data} />} />
          <Route path="/links" element={<Navigate to="/playbooks" replace />} />
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
