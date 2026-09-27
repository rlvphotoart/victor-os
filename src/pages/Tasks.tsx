import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  Flag,
  GripVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { AppData, Priority, Task, TaskStatus } from "../types";
import { PRIORITIES, TASK_STATUSES } from "../types";
import {
  nowISO,
  priorityRank,
  today,
  uid,
  dateLabel,
  classNames,
} from "../lib/utils";
import { repository } from "../data/repository";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "../components/ui";
import { useToast } from "../components/toast";
import { ContextMenu, StatusSignal } from "../components/OS";

const tone = (priority: Priority) =>
  priority === "Critical"
    ? "red"
    : priority === "High"
      ? "amber"
      : priority === "Normal"
        ? "blue"
        : "neutral";

export function TasksPage({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"Today" | "Board" | "All">("Today");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("due");
  const [quickTitle, setQuickTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const notify = useToast();
  const editorId = params.get("open");
  const editing = data.tasks.find((item) => item.id === editorId);
  const creating = params.get("new") === "1";
  const close = () => setParams({});
  const overdueCount = data.tasks.filter(
    (task) => task.status !== "Done" && task.dueDate && task.dueDate < today(),
  ).length;
  const dueToday = data.tasks.filter(
    (task) => task.status !== "Done" && task.dueDate === today(),
  ).length;

  const filtered = useMemo(
    () =>
      data.tasks
        .filter((task) => {
          if (
            view === "Today" &&
            (task.status === "Done" || !task.dueDate || task.dueDate > today())
          )
            return false;
          if (
            query &&
            !`${task.title} ${task.notes}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
            return false;
          if (projectFilter !== "all" && task.projectId !== projectFilter)
            return false;
          if (priorityFilter !== "all" && task.priority !== priorityFilter)
            return false;
          if (statusFilter !== "all" && task.status !== statusFilter)
            return false;
          return true;
        })
        .sort((a, b) => {
          if (sort === "priority")
            return priorityRank[b.priority] - priorityRank[a.priority];
          if (sort === "recent") return b.updatedAt.localeCompare(a.updatedAt);
          if (sort === "manual") return a.order - b.order;
          return (
            (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
            priorityRank[b.priority] - priorityRank[a.priority]
          );
        }),
    [
      data.tasks,
      view,
      query,
      projectFilter,
      priorityFilter,
      statusFilter,
      sort,
    ],
  );

  const quickAdd = async (event: FormEvent) => {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const now = nowISO();
    await repository.tasks.save({
      id: uid(),
      title,
      projectId: "",
      priority: "Normal",
      dueDate: view === "Today" ? today() : "",
      status: "Inbox",
      notes: "",
      order: Math.max(0, ...data.tasks.map((task) => task.order)) + 1,
      createdAt: now,
      updatedAt: now,
    });
    setQuickTitle("");
    notify("Task added");
  };
  const changeStatus = async (task: Task, status: TaskStatus) =>
    repository.tasks.save({ ...task, status, updatedAt: nowISO() });
  const moveTo = async (
    event: React.DragEvent<HTMLElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/task-id");
    const task = data.tasks.find((item) => item.id === id);
    if (task)
      await repository.tasks.save({
        ...task,
        status,
        order:
          Math.max(
            0,
            ...data.tasks
              .filter((item) => item.status === status)
              .map((item) => item.order),
          ) + 1,
        updatedAt: nowISO(),
      });
  };
  const renderTask = (task: Task) => (
    <article
      key={task.id}
      className={classNames("task-row", task.status === "Done" && "task-done")}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ id: task.id, x: event.clientX, y: event.clientY });
      }}
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData("text/task-id", task.id)
      }
    >
      <GripVertical size={16} className="drag-handle" />
      <button
        className="task-check"
        aria-label={
          task.status === "Done"
            ? `Reopen ${task.title}`
            : `Complete ${task.title}`
        }
        onClick={() =>
          changeStatus(task, task.status === "Done" ? "Next" : "Done")
        }
      >
        {task.status === "Done" ? <Check size={14} /> : <Circle size={19} />}
      </button>
      <button
        className="task-main"
        onClick={() => setParams({ open: task.id })}
      >
        <strong>
          {task.title} <DemoTag demo={task.demo} />
        </strong>
        <span>
          {data.projects.find((project) => project.id === task.projectId)
            ?.name ?? "Personal"}{" "}
          {task.dueDate && (
            <>
              · <CalendarDays size={12} /> {dateLabel(task.dueDate, "d MMM")}
            </>
          )}
        </span>
      </button>
      <div className="task-row-end">
        <Badge tone={tone(task.priority)}>{task.priority}</Badge>
        {view !== "Board" && (
          <span className="task-status-label">
            <StatusSignal
              label={task.status}
              tone={
                task.status === "Done"
                  ? "complete"
                  : task.status === "Waiting"
                    ? "warning"
                    : task.status === "In Progress"
                      ? "active"
                      : "neutral"
              }
            />
          </span>
        )}
        <Select
          aria-label={`Status for ${task.title}`}
          className="task-mobile-select"
          value={task.status}
          onChange={(event) =>
            changeStatus(task, event.target.value as TaskStatus)
          }
        >
          {TASK_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </Select>
      </div>
    </article>
  );

  return (
    <div className="page-stack">
      <div className="stat-strip">
        <div>
          <span>OPEN TASKS</span>
          <strong>
            {data.tasks.filter((task) => task.status !== "Done").length}
          </strong>
        </div>
        <div>
          <span>DUE TODAY</span>
          <strong>{dueToday}</strong>
        </div>
        <div>
          <span>OVERDUE</span>
          <strong className={overdueCount ? "text-danger" : ""}>
            {overdueCount}
          </strong>
        </div>
        <div>
          <span>COMPLETED</span>
          <strong>
            {data.tasks.filter((task) => task.status === "Done").length}
          </strong>
        </div>
      </div>
      <div className="section-toolbar">
        <div className="segmented">
          {(["Today", "Board", "All"] as const).map((tab) => (
            <button
              key={tab}
              className={view === tab ? "active" : ""}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button onClick={() => setParams({ new: "1" })}>
          <Plus size={16} /> New task
        </Button>
      </div>
      <Card className="quick-task-card">
        <form onSubmit={quickAdd} className="quick-task">
          <Plus size={18} />
          <input
            aria-label="Quick task title"
            placeholder="Add a task quickly..."
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
          />
          <button type="submit" disabled={!quickTitle.trim()}>
            Add <ArrowRight size={15} />
          </button>
        </form>
      </Card>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            placeholder="Search tasks"
            aria-label="Search tasks"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="filter-selects">
          <SlidersHorizontal size={16} />
          <Select
            aria-label="Filter by project"
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          >
            <option value="all">All projects</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {TASK_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
          <Select
            aria-label="Sort tasks"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="recent">Recently updated</option>
            <option value="manual">Manual order</option>
          </Select>
        </div>
      </div>
      {view === "Board" ? (
        <div className="kanban">
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className="kanban-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => moveTo(event, status)}
            >
              <div className="kanban-title">
                <span>{status}</span>
                <small>
                  {filtered.filter((task) => task.status === status).length}
                </small>
              </div>
              <div className="kanban-items">
                {filtered
                  .filter((task) => task.status === status)
                  .map(renderTask)}
                {!filtered.some((task) => task.status === status) && (
                  <div className="kanban-empty">Drop tasks here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="task-list-card">
          {filtered.length ? (
            filtered.map(renderTask)
          ) : (
            <EmptyState
              title={view === "Today" ? "A clear day ahead" : "No tasks found"}
              text={
                view === "Today"
                  ? "Tasks due today or earlier will appear here."
                  : "Change your filters or add a new task."
              }
              action={
                <Button onClick={() => setParams({ new: "1" })}>
                  <Plus size={16} /> Add task
                </Button>
              }
            />
          )}
        </Card>
      )}
      {(creating || editing) && (
        <TaskForm
          key={editing?.id ?? "new"}
          task={editing}
          data={data}
          onClose={close}
          onDelete={() => editing && setDeleteId(editing.id)}
        />
      )}
      {menu &&
        (() => {
          const task = data.tasks.find((item) => item.id === menu.id);
          return task ? (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              title={task.title}
              onClose={() => setMenu(null)}
              actions={[
                {
                  label: "Open focus",
                  icon: Pencil,
                  onSelect: () => setParams({ open: task.id }),
                },
                {
                  label:
                    task.status === "Done" ? "Reopen task" : "Complete task",
                  icon: Check,
                  onSelect: () => {
                    void changeStatus(
                      task,
                      task.status === "Done" ? "Next" : "Done",
                    );
                  },
                },
                {
                  label: "Set high priority",
                  icon: Flag,
                  onSelect: () => {
                    void repository.tasks.save({
                      ...task,
                      priority: "High",
                      updatedAt: nowISO(),
                    });
                  },
                },
                {
                  label: "Delete task",
                  icon: Trash2,
                  danger: true,
                  onSelect: () => setDeleteId(task.id),
                },
              ]}
            />
          ) : null;
        })()}
      {deleteId && (
        <ConfirmDialog
          title="Delete task?"
          message="This task will be removed from this device."
          confirmLabel="Delete task"
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            await repository.tasks.remove(deleteId);
            close();
            notify("Task deleted");
          }}
        />
      )}
      {view === "Board" && (
        <p className="helper-line">
          <ArrowDown size={14} /> Drag cards between columns on desktop. On
          touch screens, use each task’s status selector.
        </p>
      )}
    </div>
  );
}

function TaskForm({
  task,
  data,
  onClose,
  onDelete,
}: {
  task?: Task;
  data: AppData;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<Task>(
    task ?? {
      id: uid(),
      title: "",
      projectId: "",
      priority: "Normal",
      dueDate: "",
      status: "Inbox",
      notes: "",
      order: Math.max(0, ...data.tasks.map((item) => item.order)) + 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  );
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    await repository.tasks.save({
      ...form,
      title: form.title.trim(),
      updatedAt: nowISO(),
    });
    notify(task ? "Task updated" : "Task created");
    onClose();
  };
  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      mode="focus"
    >
      <form className="form-stack" onSubmit={save}>
        <Field label="Title">
          <Input
            required
            autoFocus
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="What needs to happen?"
          />
        </Field>
        <div className="form-grid">
          <Field label="Project">
            <Select
              value={form.projectId}
              onChange={(event) =>
                setForm({ ...form, projectId: event.target.value })
              }
            >
              <option value="">Personal</option>
              {data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm({ ...form, dueDate: event.target.value })
              }
            />
          </Field>
        </div>
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
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as TaskStatus })
              }
            >
              {TASK_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="Useful details or context"
          />
        </Field>
        <div className="modal-actions">
          {task && (
            <Button
              type="button"
              variant="danger"
              className="modal-delete"
              onClick={onDelete}
            >
              <Trash2 size={15} /> Delete
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{task ? "Save changes" : "Create task"}</Button>
        </div>
      </form>
    </Modal>
  );
}
