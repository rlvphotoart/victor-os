import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  GripVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { AppData, QuickLink } from "../types";
import { repository } from "../data/repository";
import { safeUrl, uid } from "../lib/utils";
import { linkIcon, linkIconChoices } from "../lib/linkIcon";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
} from "../components/ui";
import { useToast } from "../components/toast";

export function LinksPage({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<QuickLink | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const notify = useToast();
  const sorted = [...data.links].sort((a, b) => a.order - b.order);
  const categories = [...new Set(sorted.map((item) => item.category))];
  const filtered = sorted.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      `${item.name} ${item.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const groups = [...new Set(filtered.map((item) => item.category))];
  const reorder = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const items = [...sorted];
    const from = items.findIndex((item) => item.id === sourceId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    await Promise.all(
      items.map((item, index) =>
        repository.links.save({ ...item, order: index }),
      ),
    );
  };
  const shift = async (id: string, direction: -1 | 1) => {
    const index = sorted.findIndex((item) => item.id === id);
    const neighbor = sorted[index + direction];
    if (neighbor) await reorder(id, neighbor.id);
  };
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div className="toolbar-heading">
          <span className="eyebrow">YOUR LAUNCHPAD</span>
          <h2>Quick links</h2>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add link
        </Button>
      </div>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            aria-label="Search links"
            placeholder="Search links"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Filter links by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </div>
      {filtered.length ? (
        groups.map((group) => (
          <Card key={group} className="link-group">
            <CardHeader eyebrow="CATEGORY" title={group} />
            <div className="link-grid">
              {filtered
                .filter((item) => item.category === group)
                .map((item) => {
                  const Icon = linkIcon(item.icon);
                  return (
                    <div
                      key={item.id}
                      className="link-tile"
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/link-id", item.id)
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        void reorder(
                          event.dataTransfer.getData("text/link-id"),
                          item.id,
                        );
                      }}
                    >
                      <GripVertical size={15} className="drag-handle" />
                      <a
                        href={safeUrl(item.url) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="link-tile-icon">
                          <Icon size={21} />
                        </span>
                        <strong>
                          {item.name} <DemoTag demo={item.demo} />
                        </strong>
                        <ArrowUpRight size={17} />
                      </a>
                      <div className="link-actions">
                        <IconButton
                          label={`Move ${item.name} up`}
                          onClick={() => shift(item.id, -1)}
                          disabled={sorted[0]?.id === item.id}
                        >
                          <ArrowUp size={14} />
                        </IconButton>
                        <IconButton
                          label={`Move ${item.name} down`}
                          onClick={() => shift(item.id, 1)}
                          disabled={sorted[sorted.length - 1]?.id === item.id}
                        >
                          <ArrowDown size={14} />
                        </IconButton>
                        <button onClick={() => setEditing(item)}>Edit</button>
                        <IconButton
                          label={`Delete ${item.name}`}
                          onClick={() => setDeleting(item.id)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState
            title="No links yet"
            text="Save the places you open most often."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus size={16} /> Add link
              </Button>
            }
          />
        </Card>
      )}
      <p className="helper-line">
        <GripVertical size={14} /> Drag links to reorder on desktop. Use arrow
        buttons on touch screens.
      </p>
      {editing && (
        <LinkForm
          key={editing === "new" ? "new" : editing.id}
          link={editing === "new" ? undefined : editing}
          nextOrder={sorted.length}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete link?"
          message="This bookmark will be removed from Victor OS."
          confirmLabel="Delete link"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await repository.links.remove(deleting);
            notify("Link deleted");
          }}
        />
      )}
    </div>
  );
}

function LinkForm({
  link,
  nextOrder,
  onClose,
}: {
  link?: QuickLink;
  nextOrder: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<QuickLink>(
    link ?? {
      id: uid(),
      name: "",
      url: "",
      category: "General",
      icon: "link",
      order: nextOrder,
    },
  );
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const url = safeUrl(form.url);
    if (!url) {
      notify("Enter a valid http or https URL", "error");
      return;
    }
    await repository.links.save({
      ...form,
      name: form.name.trim(),
      url,
      category: form.category.trim() || "General",
    });
    notify("Link saved");
    onClose();
  };
  return (
    <Modal title={link ? "Edit link" : "Add link"} onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <Field label="Name">
          <Input
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="GitHub"
          />
        </Field>
        <Field label="URL">
          <Input
            required
            type="url"
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            placeholder="https://example.com"
          />
        </Field>
        <div className="form-grid">
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              placeholder="Work"
            />
          </Field>
          <Field label="Icon">
            <Select
              value={form.icon}
              onChange={(event) =>
                setForm({ ...form, icon: event.target.value })
              }
            >
              {linkIconChoices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save link</Button>
        </div>
      </form>
    </Modal>
  );
}
