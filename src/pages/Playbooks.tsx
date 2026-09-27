import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { BookOpenCheck, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import type { AppData, Playbook } from "../types";
import { repository } from "../data/repository";
import { nowISO, uid } from "../lib/utils";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "../components/ui";
import { useToast } from "../components/toast";

export function PlaybooksPage({ data }: { data: AppData }) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const notify = useToast();
  const editing = data.playbooks.find((row) => row.id === params.get("open"));
  const creating = params.get("new") === "1";
  const categories = [
    ...new Set(data.playbooks.map((row) => row.category)),
  ].sort();
  useEffect(() => {
    if (!location.hash) return;
    document
      .getElementById(location.hash.slice(1))
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [location.hash, data.playbooks.length]);
  const filtered = useMemo(
    () =>
      data.playbooks
        .filter(
          (row) =>
            (category === "all" || row.category === category) &&
            `${row.title} ${row.description} ${row.steps.map((step) => step.title).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => a.title.localeCompare(b.title)),
    [data.playbooks, category, query],
  );
  const toggleStep = async (playbook: Playbook, stepId: string) => {
    await repository.playbooks.save({
      ...playbook,
      steps: playbook.steps.map((step) =>
        step.id === stepId ? { ...step, done: !step.done } : step,
      ),
      updatedAt: nowISO(),
    });
  };
  const reset = async (playbook: Playbook) => {
    await repository.playbooks.save({
      ...playbook,
      steps: playbook.steps.map((step) => ({ ...step, done: false })),
      updatedAt: nowISO(),
    });
    notify("Checklist reset");
  };
  return (
    <div className="page-stack">
      <section className="playbook-intro">
        <div>
          <span className="eyebrow">REPEATABLE WORK</span>
          <h2>Less to remember. More to finish.</h2>
          <p>
            Short procedures for the work you do more than once. Check off
            steps, then reset for the next run.
          </p>
        </div>
        <div className="playbook-intro-count">
          <BookOpenCheck size={24} />
          <strong>{data.playbooks.length.toString().padStart(2, "0")}</strong>
          <span>PLAYBOOKS</span>
        </div>
      </section>
      <div className="section-toolbar">
        <div className="toolbar-heading">
          <span className="eyebrow">YOUR OPERATING PROCEDURES</span>
          <h2>Playbooks</h2>
        </div>
        <Button onClick={() => setParams({ new: "1" })}>
          <Plus size={16} /> New playbook
        </Button>
      </div>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            aria-label="Search playbooks"
            placeholder="Search playbooks and steps"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Filter playbooks by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
      </div>
      {filtered.length ? (
        <div className="playbook-grid">
          {filtered.map((row) => {
            const complete = row.steps.filter((step) => step.done).length;
            return (
              <Card key={row.id} id={row.id} className="playbook-card">
                <div className="playbook-card-head">
                  <Badge tone="purple">{row.category || "General"}</Badge>
                  <span>
                    {complete} / {row.steps.length} COMPLETE
                  </span>
                </div>
                <h3>{row.title}</h3>
                <p>{row.description}</p>
                <div
                  className="playbook-progress"
                  role="progressbar"
                  aria-label={`${row.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={row.steps.length}
                  aria-valuenow={complete}
                >
                  <span
                    style={{
                      width: `${row.steps.length ? (complete / row.steps.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="playbook-steps">
                  {row.steps.map((step) => (
                    <label key={step.id} className={step.done ? "done" : ""}>
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={() => void toggleStep(row, step.id)}
                      />
                      <span>{step.title}</span>
                    </label>
                  ))}
                </div>
                <div className="playbook-card-actions">
                  <Button
                    variant="secondary"
                    disabled={!complete}
                    onClick={() => void reset(row)}
                  >
                    <RotateCcw size={15} /> Reset
                  </Button>
                  <button onClick={() => setParams({ open: row.id })}>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(row.id)}
                    aria-label={`Delete ${row.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No playbooks found"
            text="Create a repeatable checklist or adjust your search."
            action={
              <Button onClick={() => setParams({ new: "1" })}>
                <Plus size={16} /> New playbook
              </Button>
            }
          />
        </Card>
      )}
      {(creating || editing) && (
        <PlaybookForm
          key={editing?.id ?? "new"}
          playbook={editing}
          onClose={() => setParams({})}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete playbook?"
          message="This checklist will be removed from your cloud workspace."
          confirmLabel="Delete playbook"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await repository.playbooks.remove(deleting);
            notify("Playbook deleted");
          }}
        />
      )}
    </div>
  );
}

function PlaybookForm({
  playbook,
  onClose,
}: {
  playbook?: Playbook;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(playbook?.title ?? "");
  const [description, setDescription] = useState(playbook?.description ?? "");
  const [category, setCategory] = useState(playbook?.category ?? "Work");
  const [steps, setSteps] = useState(
    playbook?.steps.map((step) => step.title).join("\n") ?? "",
  );
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const labels = steps
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!labels.length) return;
    const previous = playbook?.steps ?? [];
    await repository.playbooks.save({
      id: playbook?.id ?? uid(),
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || "General",
      steps: labels.map((label, index) =>
        previous[index]?.title === label
          ? previous[index]
          : { id: uid(), title: label, done: false },
      ),
      updatedAt: nowISO(),
    });
    notify(playbook ? "Playbook updated" : "Playbook created");
    onClose();
  };
  return (
    <Modal
      title={playbook ? "Edit playbook" : "New playbook"}
      onClose={onClose}
      width="wide"
      mode="focus"
    >
      <form className="form-stack" onSubmit={(event) => void save(event)}>
        <div className="form-grid">
          <Field label="Title">
            <Input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Weekly review"
            />
          </Field>
          <Field label="Category">
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Work, Personal, AI..."
            />
          </Field>
        </div>
        <Field label="Description">
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="When do you use this?"
          />
        </Field>
        <Field label="Steps" hint="One step per line">
          <Textarea
            required
            rows={10}
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            placeholder={"Check inputs\nRun validation\nRecord evidence"}
          />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save playbook</Button>
        </div>
      </form>
    </Modal>
  );
}
