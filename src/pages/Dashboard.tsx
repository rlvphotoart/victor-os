import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, ArrowUpRight, Command, Plus } from "lucide-react";
import type { AppData } from "../types";
import { financeSummary } from "../lib/finance";
import { dateLabel, money, safeUrl, today } from "../lib/utils";
import { linkIcon } from "../lib/linkIcon";
import { Datum, Metric, StatusSignal } from "../components/OS";
import { DemoTag } from "../components/ui";

export function DashboardPage({ data }: { data: AppData }) {
  const widgets = data.settings[0]?.widgets ?? [
    "daily",
    "finance",
    "projects",
    "quickLinks",
  ];
  const currency = data.settings[0]?.currency ?? "EUR";
  const summary = financeSummary(data);
  const name = data.settings[0]?.name || "Victor";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const openTasks = data.tasks.filter((item) => item.status !== "Done");
  const priorities = openTasks
    .filter((item) => item.priority === "Critical" || item.priority === "High")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const overdue = openTasks.filter(
    (item) => item.dueDate && item.dueDate < today(),
  );
  const upcoming = openTasks
    .filter((item) => item.dueDate && item.dueDate >= today())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const active = data.projects.filter((item) => item.status === "ACTIVE");
  const blocked = data.projects.filter((item) => item.status === "BLOCKED");
  const next = priorities[0] ?? upcoming[0] ?? openTasks[0];
  const netNumber = new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 0,
  }).format(summary.net);
  const hasDemo = Object.values(data)
    .flat()
    .some(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        "demo" in row &&
        row.demo === true,
    );
  const attention = [
    ...overdue.map((item) => ({
      key: item.id,
      label: item.title,
      detail: `Due ${dateLabel(item.dueDate, "d MMM")}`,
      path: `/tasks?open=${item.id}`,
      tone: "danger" as const,
      kind: "TASK",
    })),
    ...blocked.map((item) => ({
      key: item.id,
      label: item.name,
      detail: item.nextAction || "Needs a next action",
      path: `/projects?open=${item.id}`,
      tone: "warning" as const,
      kind: "PROJECT",
    })),
  ].slice(0, 4);
  const recent = (data.settings[0]?.recentContexts ?? []).filter((item) => {
    const id = item.key.split("-").slice(1).join("-");
    if (item.kind === "PROJECT")
      return data.projects.some((row) => row.id === id);
    if (item.kind === "TASK") return data.tasks.some((row) => row.id === id);
    if (item.kind === "PROMPT")
      return data.prompts.some((row) => row.id === id);
    if (item.kind === "NOTE") return data.notes.some((row) => row.id === id);
    return true;
  });

  return (
    <div className="vos-home">
      <div className="vos-home-meta">
        <span>
          <i /> SYSTEM / HOME
        </span>
        <span>{format(new Date(), "EEEE, d MMMM yyyy").toUpperCase()}</span>
        {hasDemo && <DemoTag demo />}
      </div>

      <section className="vos-now" aria-label="Now">
        <div className="vos-now-primary">
          <Datum
            number="00"
            label="NOW"
            action={
              <Link to="/settings">
                Arrange home <ArrowUpRight size={14} />
              </Link>
            }
          />
          <h1>
            {greeting}
            <span>,</span>
            <br />
            {name}
            <span>.</span>
          </h1>
          <p className="vos-now-subtitle">One place to pick up the thread.</p>
          {widgets.includes("daily") && (
            <div className="vos-next-action">
              <div className="vos-next-label">
                <StatusSignal
                  label="NEXT ACTION"
                  tone={next?.priority === "Critical" ? "danger" : "active"}
                />
                <span>{openTasks.length} OPEN</span>
              </div>
              {next ? (
                <Link to={`/tasks?open=${next.id}`}>
                  <span>{next.title}</span>
                  <ArrowUpRight size={22} />
                </Link>
              ) : (
                <Link to="/tasks?new=1">
                  <span>Choose your first action</span>
                  <Plus size={21} />
                </Link>
              )}
              <div className="vos-next-foot">
                <span>
                  {next
                    ? (data.projects.find(
                        (project) => project.id === next.projectId,
                      )?.name ?? "Personal")
                    : "Your workspace is clear"}
                </span>
                <span>
                  {upcoming[0]
                    ? `NEXT DUE ${dateLabel(upcoming[0].dueDate, "d MMM").toUpperCase()}`
                    : "NO UPCOMING DEADLINE"}
                </span>
              </div>
            </div>
          )}
        </div>
        {widgets.includes("finance") && (
          <div className="vos-now-finance">
            <Datum
              number="03"
              label="POSITION"
              action={
                <Link to="/money" aria-label="Open Money">
                  <ArrowUpRight size={17} />
                </Link>
              }
            />
            <Metric
              label="NET / ASSETS LESS DEBT"
              value={netNumber}
              unit={currency}
              large
              annotation={
                <span>
                  ASSETS {money(summary.assets, currency)} <i /> DEBT{" "}
                  {money(summary.debt, currency)}
                </span>
              }
            />
            <div className="vos-instrument-rail" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <i
                  key={index}
                  className={
                    index <
                    Math.round(
                      (Math.max(0, Math.min(100, summary.savingsRate)) / 100) *
                        24,
                    )
                      ? "filled"
                      : ""
                  }
                />
              ))}
            </div>
            <div className="vos-finance-bottom">
              <span>
                <small>CASH</small>
                <strong>
                  {money(summary.current + summary.emergency, currency)}
                </strong>
              </span>
              <span>
                <small>INVESTED</small>
                <strong>{money(summary.investments, currency)}</strong>
              </span>
              <span>
                <small>SAVINGS RATE</small>
                <strong>{Math.round(summary.savingsRate)}%</strong>
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="vos-home-middle">
        {widgets.includes("daily") && (
          <section className="vos-attention" aria-label="Attention">
            <Datum
              number="01"
              label="ATTENTION"
              action={
                <Link to="/tasks?view=today">
                  Open task view <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="vos-section-lead">
              <strong>
                {attention.length
                  ? `${attention.length} ${attention.length === 1 ? "item needs" : "items need"} a decision.`
                  : "All clear."}
              </strong>
              <span>
                {overdue.length} overdue / {blocked.length} blocked
              </span>
            </div>
            {attention.length ? (
              <div className="vos-attention-list">
                {attention.map((item, index) => (
                  <Link
                    key={`${item.kind}-${item.key}`}
                    to={item.path}
                    className="vos-attention-row"
                  >
                    <span className="vos-row-index">0{index + 1}</span>
                    <StatusSignal label={item.kind} tone={item.tone} />
                    <strong>{item.label}</strong>
                    <span className="vos-row-detail">{item.detail}</span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="vos-clear-state">
                Nothing is asking for action right now.{" "}
                <Link to="/tasks">
                  Review tasks <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
        )}
        <section className="vos-recent" aria-label="Recent contexts">
          <Datum
            number="02"
            label="RECENT"
            action={<Command size={15} aria-hidden="true" />}
          />
          <div className="vos-section-lead">
            <strong>Pick up where you left off.</strong>
            <span>CLOUD TRAIL</span>
          </div>
          {recent.length ? (
            <div className="vos-recent-list">
              {recent.slice(0, 4).map((item, index) => (
                <Link key={item.key} to={item.path}>
                  <span className="vos-row-index">0{index + 1}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.kind}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="vos-empty-recent">
              Open a project, note, prompt, or tool and it will appear here.
            </p>
          )}
        </section>
      </div>

      {widgets.includes("projects") && (
        <section className="vos-active-work" aria-label="Active projects">
          <Datum
            number="03"
            label="IN MOTION"
            action={
              <Link to="/projects">
                All projects <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="vos-section-lead">
            <strong>Work with momentum.</strong>
            <span>
              {active.length} ACTIVE / {data.projects.length} TOTAL
            </span>
          </div>
          {data.projects.length ? (
            <div className="vos-project-runway">
              {data.projects
                .filter((item) => item.status !== "DONE")
                .slice(0, 4)
                .map((project, index) => (
                  <Link
                    key={project.id}
                    to={`/projects?open=${project.id}`}
                    className="vos-project-runway-row"
                  >
                    <span className="vos-row-index">0{index + 1}</span>
                    <span className="vos-runway-name">
                      {project.name}
                      <small>
                        {project.nextAction || "Set the next action"}
                      </small>
                    </span>
                    <StatusSignal
                      label={project.status}
                      tone={
                        project.status === "ACTIVE"
                          ? "active"
                          : project.status === "BLOCKED"
                            ? "danger"
                            : "neutral"
                      }
                    />
                    <span className="vos-runway-progress">
                      <i style={{ width: `${project.progress}%` }} />
                      <b>{project.progress}%</b>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
            </div>
          ) : (
            <p className="vos-empty-recent">
              No projects yet.{" "}
              <Link to="/projects?new=1">
                Create one <ArrowRight size={14} />
              </Link>
            </p>
          )}
        </section>
      )}

      {widgets.includes("quickLinks") && (
        <section className="vos-home-links" aria-label="Quick access">
          <Datum
            number="04"
            label="QUICK ACCESS"
            action={
              <Link to="/links">
                Manage links <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="vos-home-links-list">
            {[...data.links]
              .filter((item) => safeUrl(item.url))
              .sort((a, b) => a.order - b.order)
              .slice(0, 6)
              .map((item) => {
                const Icon = linkIcon(item.icon);
                return (
                  <a
                    key={item.id}
                    href={safeUrl(item.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={17} strokeWidth={1.6} />
                    <span>{item.name}</span>
                    <ArrowUpRight size={15} />
                  </a>
                );
              })}
            {!data.links.length && (
              <Link to="/links">
                Add your first link <Plus size={16} />
              </Link>
            )}
          </div>
        </section>
      )}
      <footer className="vos-home-footer">
        <span>V/OS · PERSONAL SYSTEM</span>
        <span>PRIVATE BY DESIGN / CLOUD SYNCED</span>
      </footer>
    </div>
  );
}
