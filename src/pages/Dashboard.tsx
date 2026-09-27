import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  FolderKanban,
  Link2,
  Plus,
  TrendingUp,
} from "lucide-react";
import type { AppData } from "../types";
import { financeSummary } from "../lib/finance";
import { dateLabel, money, safeUrl, today } from "../lib/utils";
import { Badge, Card, CardHeader, DemoTag, EmptyState } from "../components/ui";
import { linkIcon } from "../lib/linkIcon";

export function DashboardPage({ data }: { data: AppData }) {
  const widgets = data.settings[0]?.widgets ?? [
    "daily",
    "finance",
    "projects",
    "quickLinks",
  ];
  const currency = data.settings[0]?.currency ?? "EUR";
  const fmt = (value: number) => money(value, currency);
  const finance = financeSummary(data);
  const openTasks = data.tasks.filter((item) => item.status !== "Done");
  const priorities = openTasks
    .filter((item) => item.priority === "Critical" || item.priority === "High")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
    .slice(0, 3);
  const overdue = openTasks.filter(
    (item) => item.dueDate && item.dueDate < today(),
  );
  const upcoming = openTasks
    .filter((item) => item.dueDate && item.dueDate >= today())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  const activeProjects = data.projects.filter(
    (item) => item.status === "ACTIVE",
  );
  const hasDemo = [
    ...data.projects,
    ...data.tasks,
    ...data.accounts,
    ...data.debts,
    ...data.investments,
    ...data.transactions,
    ...data.prompts,
    ...data.notes,
    ...data.links,
  ].some((item) => item.demo);
  return (
    <div className="page-stack dashboard-page">
      <div className="dashboard-topline">
        <span>
          <span className="local-pulse" /> SYSTEM ONLINE{" "}
          <span className="topline-separator">/</span> YOUR DAY, IN FOCUS{" "}
          {hasDemo && <DemoTag demo />}
        </span>
        <Link to="/settings">
          CUSTOMIZE DASHBOARD <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="dashboard-kpis">
        <Link to="/tasks?view=today" className="kpi-card">
          <span className="kpi-icon">
            <CircleCheck size={19} />
          </span>
          <span>OPEN TASKS</span>
          <strong>{openTasks.length}</strong>
          <small>
            Across your workspace <ArrowUpRight size={14} />
          </small>
        </Link>
        <Link to="/tasks?view=today" className="kpi-card">
          <span className="kpi-icon amber">
            <Clock3 size={19} />
          </span>
          <span>OVERDUE</span>
          <strong>{overdue.length}</strong>
          <small>
            Needs attention <ArrowUpRight size={14} />
          </small>
        </Link>
        <Link to="/projects" className="kpi-card">
          <span className="kpi-icon blue">
            <FolderKanban size={19} />
          </span>
          <span>ACTIVE PROJECTS</span>
          <strong>{activeProjects.length}</strong>
          <small>
            In motion <ArrowUpRight size={14} />
          </small>
        </Link>
        <Link to="/money" className="kpi-card">
          <span className="kpi-icon purple">
            <TrendingUp size={19} />
          </span>
          <span>NET POSITION</span>
          <strong className="money-kpi">{fmt(finance.net)}</strong>
          <small>
            Assets minus debt <ArrowUpRight size={14} />
          </small>
        </Link>
      </div>
      <div className="dashboard-grid">
        {widgets.includes("daily") && (
          <Card className="daily-card">
            <CardHeader
              eyebrow="01 / DAILY OVERVIEW"
              title="Today’s focus"
              action={
                <Link className="text-link" to="/tasks">
                  View all tasks <ArrowRight size={15} />
                </Link>
              }
            />
            <div className="daily-block">
              <div className="daily-block-title">
                <span className="small-dot mint" /> PRIORITIES{" "}
                <small>{priorities.length}</small>
              </div>
              {priorities.length ? (
                priorities.map((item) => (
                  <Link
                    key={item.id}
                    className="overview-task"
                    to={`/tasks?open=${item.id}`}
                  >
                    <span className="task-ring" />
                    <span>
                      {item.title}
                      <small>
                        {data.projects.find(
                          (project) => project.id === item.projectId,
                        )?.name ?? "Personal"}
                      </small>
                    </span>
                    <Badge
                      tone={item.priority === "Critical" ? "red" : "amber"}
                    >
                      {item.priority}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="quiet-row">No high priority tasks right now.</p>
              )}
            </div>
            <div className="daily-bottom">
              <div>
                <span className="daily-block-title">
                  <span className="small-dot coral" /> OVERDUE
                </span>
                <strong>{overdue.length}</strong>
                <small>Items to revisit</small>
              </div>
              <div>
                <span className="daily-block-title">
                  <span className="small-dot blue" /> REMINDERS
                </span>
                <strong>{upcoming.length}</strong>
                <small>
                  {upcoming[0]
                    ? `Next: ${dateLabel(upcoming[0].dueDate, "d MMM")}`
                    : "Nothing scheduled"}
                </small>
              </div>
              <div>
                <span className="daily-block-title">
                  <span className="small-dot lavender" /> ACTIVE
                </span>
                <strong>{activeProjects.length}</strong>
                <small>Projects moving</small>
              </div>
            </div>
            <div className="daily-detail">
              <div>
                <span className="daily-block-title">OVERDUE ITEMS</span>
                {overdue.length ? (
                  overdue.slice(0, 2).map((item) => (
                    <Link key={item.id} to={`/tasks?open=${item.id}`}>
                      {item.title}
                      <small>{dateLabel(item.dueDate, "d MMM")}</small>
                    </Link>
                  ))
                ) : (
                  <span className="quiet-row">All caught up</span>
                )}
              </div>
              <div>
                <span className="daily-block-title">UPCOMING REMINDERS</span>
                {upcoming.length ? (
                  upcoming.slice(0, 2).map((item) => (
                    <Link key={item.id} to={`/tasks?open=${item.id}`}>
                      {item.title}
                      <small>{dateLabel(item.dueDate, "d MMM")}</small>
                    </Link>
                  ))
                ) : (
                  <span className="quiet-row">Nothing scheduled</span>
                )}
              </div>
            </div>
          </Card>
        )}
        {widgets.includes("finance") && (
          <Card className="finance-card">
            <CardHeader
              eyebrow="02 / FINANCIAL SNAPSHOT"
              title="Money at a glance"
              action={
                <Link className="text-link" to="/money">
                  Open money <ArrowRight size={15} />
                </Link>
              }
            />
            <div className="net-position">
              <span>NET POSITION</span>
              <strong>{fmt(finance.net)}</strong>
              <small>
                Assets {fmt(finance.assets)} <span>−</span> Debt{" "}
                {fmt(finance.debt)}
              </small>
            </div>
            <div className="snapshot-grid">
              <div>
                <span>Current account</span>
                <strong>{fmt(finance.current)}</strong>
              </div>
              <div>
                <span>Emergency fund</span>
                <strong>{fmt(finance.emergency)}</strong>
              </div>
              <div>
                <span>Investments</span>
                <strong>{fmt(finance.investments)}</strong>
              </div>
              <div>
                <span>Total debt</span>
                <strong>{fmt(finance.debt)}</strong>
              </div>
              <div>
                <span>Monthly income</span>
                <strong>{fmt(finance.income)}</strong>
              </div>
              <div>
                <span>Monthly expenses</span>
                <strong>{fmt(finance.expenses)}</strong>
              </div>
            </div>
            <div className="ratio-row">
              <span>
                Savings rate <strong>{Math.round(finance.savingsRate)}%</strong>
              </span>
              <span>
                Debt ratio <strong>{Math.round(finance.debtRatio)}%</strong>
              </span>
            </div>
          </Card>
        )}
        {widgets.includes("projects") && (
          <Card className="dashboard-projects">
            <CardHeader
              eyebrow="03 / PROJECT OVERVIEW"
              title="Projects in motion"
              action={
                <Link className="text-link" to="/projects">
                  All projects <ArrowRight size={15} />
                </Link>
              }
            />
            {data.projects.length ? (
              <div className="dashboard-project-list">
                {data.projects
                  .filter((item) => item.status !== "DONE")
                  .slice(0, 4)
                  .map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects?open=${project.id}`}
                      className="dashboard-project-row"
                    >
                      <span className="project-mark mini">
                        {project.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.nextAction || "No next action yet"}
                        </small>
                      </span>
                      <div className="mini-progress">
                        <span>{project.progress}%</span>
                        <div className="progress-track">
                          <div style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="No projects yet"
                text="Projects you create will appear here."
                action={
                  <Link className="button button-primary" to="/projects?new=1">
                    <Plus size={16} /> New project
                  </Link>
                }
              />
            )}
          </Card>
        )}
        {widgets.includes("quickLinks") && (
          <Card className="dashboard-links">
            <CardHeader
              eyebrow="04 / QUICK ACCESS"
              title="Launchpad"
              action={
                <Link className="text-link" to="/links">
                  Manage links <ArrowRight size={15} />
                </Link>
              }
            />
            {data.links.length ? (
              <div className="dashboard-link-grid">
                {[...data.links]
                  .sort((a, b) => a.order - b.order)
                  .slice(0, 6)
                  .map((item) => {
                    const Icon = linkIcon(item.icon);
                    return (
                      <a
                        key={item.id}
                        href={safeUrl(item.url) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          <Icon size={19} />
                        </span>
                        <strong>{item.name}</strong>
                        <ArrowUpRight size={15} />
                      </a>
                    );
                  })}
              </div>
            ) : (
              <EmptyState
                title="No links yet"
                text="Keep your favorite destinations one tap away."
                action={
                  <Link className="button button-primary" to="/links">
                    <Link2 size={16} /> Add links
                  </Link>
                }
              />
            )}
            <div className="dashboard-links-foot">
              <CalendarDays size={15} /> Everything important, one place.
            </div>
          </Card>
        )}
      </div>
      {!widgets.length && (
        <Card>
          <EmptyState
            title="Your dashboard is empty"
            text="Turn on widgets in Settings to build your view."
            action={
              <Link className="button button-primary" to="/settings">
                Open settings
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}
