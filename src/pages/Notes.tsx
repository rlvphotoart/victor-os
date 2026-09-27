import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock3, FileText, Pin, Plus, Search, Trash2 } from "lucide-react";
import type { AppData, Note } from "../types";
import { repository } from "../data/repository";
import { dateLabel, nowISO, tagList, uid } from "../lib/utils";
import {
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Textarea,
} from "../components/ui";
import { useToast } from "../components/toast";

export function NotesPage({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const notify = useToast();
  const open = data.notes.find((item) => item.id === params.get("open"));
  const filtered = data.notes
    .filter((note) =>
      `${note.title} ${note.content} ${note.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  const create = async () => {
    const timestamp = nowISO();
    const note: Note = {
      id: uid(),
      title: "",
      content: "",
      tags: [],
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repository.notes.save(note);
    setParams({ open: note.id });
  };
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div className="toolbar-heading">
          <span className="eyebrow">PRIVATE SPACE</span>
          <h2>Notes & ideas</h2>
        </div>
        <Button onClick={create}>
          <Plus size={16} /> New note
        </Button>
      </div>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            aria-label="Search notes"
            placeholder="Search your notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="result-count">
          {filtered.length} {filtered.length === 1 ? "note" : "notes"}
        </span>
      </div>
      {filtered.length ? (
        <div className="note-grid">
          {filtered.map((note) => (
            <Card key={note.id} className="note-card">
              <div className="note-card-top">
                <span className="note-icon">
                  <FileText size={19} />
                </span>
                <IconButton
                  label={
                    note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`
                  }
                  onClick={() =>
                    repository.notes.save({
                      ...note,
                      pinned: !note.pinned,
                      updatedAt: nowISO(),
                    })
                  }
                >
                  <Pin
                    size={17}
                    fill={note.pinned ? "currentColor" : "none"}
                    className={note.pinned ? "text-accent" : ""}
                  />
                </IconButton>
              </div>
              <button
                className="note-card-main"
                onClick={() => setParams({ open: note.id })}
              >
                <h3>
                  {note.title || "Untitled note"} <DemoTag demo={note.demo} />
                </h3>
                <p>
                  {note.content.replace(/[#*`>-]/g, "").slice(0, 160) ||
                    "Start writing..."}
                </p>
              </button>
              <div className="tag-row">
                {note.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <div className="note-card-foot">
                <span>
                  <Clock3 size={13} /> {dateLabel(note.updatedAt)}
                </span>
                <IconButton
                  label={`Delete ${note.title || "Untitled note"}`}
                  onClick={() => setDeleteId(note.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="A blank page is a good start"
            text="Keep an idea, meeting note, or personal thought here."
            action={
              <Button onClick={create}>
                <Plus size={16} /> New note
              </Button>
            }
          />
        </Card>
      )}
      {open && (
        <NoteEditor key={open.id} note={open} onClose={() => setParams({})} />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete note?"
          message="This note will be permanently removed from your cloud workspace on every device."
          confirmLabel="Delete note"
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            await repository.notes.remove(deleteId);
            if (open?.id === deleteId) setParams({});
            notify("Note deleted");
          }}
        />
      )}
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [pinned, setPinned] = useState(note.pinned);
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<"saved" | "saving">("saved");
  const first = useRef(true);
  const current = useRef({ title, content, tags, pinned });
  current.current = { title, content, tags, pinned };
  const save = async () => {
    const draft = current.current;
    await repository.notes.save({
      ...note,
      title: draft.title,
      content: draft.content,
      tags: tagList(draft.tags),
      pinned: draft.pinned,
      updatedAt: nowISO(),
    });
    setState("saved");
  };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void save();
    }, 500);
    return () => window.clearTimeout(timer);
    // Autosave depends on draft fields; note identity is fixed by the keyed editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, pinned]);
  const update = (field: "title" | "content" | "tags", value: string) => {
    setState("saving");
    if (field === "title") setTitle(value);
    else if (field === "content") setContent(value);
    else setTags(value);
  };
  const close = async () => {
    await save();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void close();
  };
  return (
    <Modal
      title={title || "Untitled note"}
      onClose={() => void close()}
      width="wide"
      mode="focus"
    >
      <form className="form-stack note-editor" onSubmit={submit}>
        <div className="note-editor-bar">
          <span>{state === "saving" ? "Saving…" : "Saved to cloud"}</span>
          <button
            type="button"
            className={pinned ? "text-accent" : ""}
            onClick={() => {
              setPinned((value) => !value);
              setState("saving");
            }}
          >
            <Pin size={15} /> {pinned ? "Pinned" : "Pin note"}
          </button>
        </div>
        <Field label="Title">
          <Input
            autoFocus
            value={title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Untitled note"
          />
        </Field>
        <Field label="Tags" hint="Comma-separated">
          <Input
            value={tags}
            onChange={(event) => update("tags", event.target.value)}
            placeholder="ideas, personal"
          />
        </Field>
        <div className="segmented note-toggle">
          <button
            type="button"
            className={!preview ? "active" : ""}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            className={preview ? "active" : ""}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        {preview ? (
          <div className="markdown-preview prose-dark">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: (props) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {content || "*Nothing to preview yet.*"}
            </ReactMarkdown>
          </div>
        ) : (
          <Field label="Markdown content">
            <Textarea
              rows={16}
              value={content}
              onChange={(event) => update("content", event.target.value)}
              placeholder="Write in Markdown..."
            />
          </Field>
        )}
        <div className="modal-actions">
          <Button type="submit">Done</Button>
        </div>
      </form>
    </Modal>
  );
}
