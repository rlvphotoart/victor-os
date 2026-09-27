import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { AppData, Priority, Project, ProjectStatus } from "../types";
import { PRIORITIES, PROJECT_STATUSES } from "../types";
import { safeUrl, uid } from "../lib/utils";
import { repository } from "../data/repository";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
  Textarea,
} from "../components/ui";
import { useToast } from "../components/toast";

const statusTone = (status: ProjectStatus) =>
  status === "ACTIVE"
    ? "green"
    : status === "BLOCKED"
      ? "red"
      : status === "PLANNING"
        ? "blue"
        : status === "DONE"
          ? "purple"
          : "neutral";

export function ProjectsPage({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const notify = useToast();
  const editing = data.projects.find((item) => item.id === params.get("open"));
  const creating = params.get("new") === "1";
  const close = () => setParams({});
  const filtered = data.projects.filter(
    (project) =>
      (filter === "all" || project.status === filter) &&
      `${project.name} ${project.summary} ${project.nextAction}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="page-stack">
      <div className="stat-strip">
        <div>
          <span>ALL PROJECTS</span>
          <strong>{data.projects.length}</strong>
        </div>
        <div>
          <span>ACTIVE</span>
          <strong>
            {data.projects.filter((item) => item.status === "ACTIVE").length}
          </strong>
        </div>
        <div>
          <span>IN PLANNING</span>
          <strong>
            {data.projects.filter((item) => item.status === "PLANNING").length}
          </strong>
        </div>
        <div>
          <span>COMPLETED</span>
          <strong>
            {data.projects.filter((item) => item.status === "DONE").length}
          </strong>
        </div>
      </div>
      <div className="section-toolbar">
        <div className="toolbar-heading">
          <span className="eyebrow">YOUR WORK</span>
          <h2>Projects in motion</h2>
        </div>
        <Button onClick={() => setParams({ new: "1" })}>
          <Plus size={16} /> New project
        </Button>
      </div>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            aria-label="Search projects"
            placeholder="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Filter project status"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </Select>
      </div>
      {filtered.length ? (
        <div className="project-grid">
          {filtered.map((project) => (
            <Card key={project.id} className="project-card">
              <div className="project-card-top">
                <div className="project-mark">
                  {project.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <DemoTag demo={project.demo} />
                  <IconButton
                    label={`Edit ${project.name}`}
                    onClick={() => setParams({ open: project.id })}
                  >
                    <MoreHorizontal size={19} />
                  </IconButton>
                </div>
              </div>
              <div className="project-card-title">
                <h3>{project.name}</h3>
                <p>{project.summary}</p>
              </div>
              <div className="project-badges">
                <Badge tone={statusTone(project.status)}>
                  {project.status}
                </Badge>
                <Badge
                  tone={
                    project.priority === "Critical"
                      ? "red"
                      : project.priority === "High"
                        ? "amber"
                        : "neutral"
                  }
                >
                  {project.priority} priority
                </Badge>
              </div>
              <div className="project-progress-label">
                <span>Progress</span>
                <strong>{project.progress}%</strong>
              </div>
              <div className="progress-track">
                <div style={{ width: `${project.progress}%` }} />
              </div>
              <div className="project-next">
                <span>NEXT ACTION</span>
                <button onClick={() => setParams({ open: project.id })}>
                  {project.nextAction || "Add a next action"}{" "}
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="project-card-foot">
                <span>
                  {
                    data.tasks.filter(
                      (task) =>
                        task.projectId === project.id && task.status !== "Done",
                    ).length
                  }{" "}
                  open tasks
                </span>
                <div>
                  {project.links
                    .filter((url) => safeUrl(url))
                    .slice(0, 2)
                    .map((url, index) => (
                      <a
                        key={index}
                        href={safeUrl(url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${project.name} link ${index + 1}`}
                      >
                        <ArrowUpRight size={15} />
                      </a>
                    ))}
                  <button
                    onClick={() => setDeleteId(project.id)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No projects here"
            text="Create your first project or adjust your search."
            action={
              <Button onClick={() => setParams({ new: "1" })}>
                <Plus size={16} /> New project
              </Button>
            }
          />
        </Card>
      )}
      {(creating || editing) && (
        <ProjectForm
          key={editing?.id ?? "new"}
          project={editing}
          onClose={close}
        />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete project?"
          message="The project will be deleted. Its tasks will remain as personal tasks."
          confirmLabel="Delete project"
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            for (const task of data.tasks.filter(
              (item) => item.projectId === deleteId,
            ))
              await repository.tasks.save({ ...task, projectId: "" });
            await repository.projects.remove(deleteId);
            close();
            notify("Project deleted");
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Project>(
    project ?? {
      id: uid(),
      name: "",
      summary: "",
      status: "IDEA",
      priority: "Normal",
      progress: 0,
      nextAction: "",
      notes: "",
      links: [],
    },
  );
  const [links, setLinks] = useState(form.links.join("\n"));
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const parsedLinks = links
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parsedLinks.some((url) => !safeUrl(url))) {
      notify("Enter only valid http or https links", "error");
      return;
    }
    await repository.projects.save({
      ...form,
      name: form.name.trim(),
      links: parsedLinks.map((url) => safeUrl(url)!),
    });
    notify(project ? "Project updated" : "Project created");
    onClose();
  };
  return (
    <Modal
      title={project ? "Edit project" : "New project"}
      onClose={onClose}
      width="wide"
    >
      <form className="form-stack" onSubmit={save}>
        <div className="form-grid">
          <Field label="Project name">
            <Input
              required
              autoFocus
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Name this project"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as ProjectStatus,
                })
              }
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Summary">
          <Input
            value={form.summary}
            onChange={(event) =>
              setForm({ ...form, summary: event.target.value })
            }
            placeholder="What is this project about?"
          />
        </Field>
        <div className="form-grid">
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as Priority })
              }
            >
              {PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </Select>
          </Field>
          <Field label={`Progress · ${form.progress}%`}>
            <Input
              type="range"
              min="0"
              max="100"
              value={form.progress}
              onChange={(event) =>
                setForm({ ...form, progress: Number(event.target.value) })
              }
            />
          </Field>
        </div>
        <Field label="Next action">
          <Input
            value={form.nextAction}
            onChange={(event) =>
              setForm({ ...form, nextAction: event.target.value })
            }
            placeholder="One concrete next step"
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />
        </Field>
        <Field label="Links" hint="One URL per line">
          <Textarea
            rows={3}
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            placeholder="https://..."
          />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
