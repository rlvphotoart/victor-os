import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { classNames } from "../lib/utils";
import { ToastContext, type ToastKind } from "./toast";

type Toast = { id: number; message: string; kind: ToastKind };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      4200,
    );
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={classNames(
              "toast",
              item.kind === "error" && "toast-error",
            )}
          >
            {item.kind === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <Check size={16} />
            )}
            {item.message}
            <button
              aria-label="Dismiss message"
              onClick={() =>
                setToasts((current) => current.filter((x) => x.id !== item.id))
              }
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={classNames("button", `button-${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={classNames("icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames("card", className)}>{children}</section>
  );
}
export function CardHeader({
  eyebrow,
  title,
  action,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="card-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "purple";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function DemoTag({ demo }: { demo?: boolean }) {
  return demo ? (
    <span className="demo-tag" title="Example data. Remove in Settings.">
      DEMO
    </span>
  ) : null;
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames("input", props.className)} {...props} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNames("input textarea", props.className)}
      {...props}
    />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames("input select", props.className)}
      {...props}
    />
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orbit">✦</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  width = "normal",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: "normal" | "wide";
}) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const preferred = dialog.current?.querySelector<HTMLElement>("[autofocus]");
    const first = dialog.current?.querySelector<HTMLElement>(
      ".modal-body input, .modal-body textarea, .modal-body select, .modal-body button, .modal-header button",
    );
    (preferred ?? first)?.focus();
    const keydown = (event: KeyboardEvent) => {
      const openDialogs = document.querySelectorAll('[role="dialog"]');
      if (openDialogs[openDialogs.length - 1] !== dialog.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]",
      );
      if (!focusable?.length) return;
      const beginning = focusable[0];
      const end = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === beginning) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        beginning.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        ref={dialog}
        className={classNames("modal", width === "wide" && "modal-wide")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  phrase,
  onConfirm,
  onClose,
  danger = true,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  phrase?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  danger?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <p className="muted leading-relaxed">{message}</p>
        {phrase && (
          <Field label={`Type ${phrase} to continue`}>
            <Input
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
            />
          </Field>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={danger ? "danger" : "primary"}
            disabled={busy || (!!phrase && typed !== phrase)}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
