import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function Datum({
  number,
  label,
  action,
}: {
  number: string;
  label: string;
  action?: ReactNode;
}) {
  return (
    <div className="vos-datum">
      <span className="vos-datum-line" aria-hidden="true" />
      <span className="vos-datum-index">{number}</span>
      <span className="vos-datum-label">{label}</span>
      {action && <span className="vos-datum-action">{action}</span>}
    </div>
  );
}

export function Metric({
  label,
  value,
  unit,
  annotation,
  large = false,
}: {
  label: string;
  value: string;
  unit?: string;
  annotation?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className={`vos-metric ${large ? "vos-metric-large" : ""}`}>
      <span className="vos-metric-label">{label}</span>
      <div className="vos-metric-reading">
        <strong>{value}</strong>
        {unit && <span className="vos-metric-unit">{unit}</span>}
      </div>
      {annotation && <div className="vos-metric-annotation">{annotation}</div>}
    </div>
  );
}

export function StatusSignal({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "active" | "warning" | "danger" | "complete";
}) {
  return (
    <span className="vos-signal" data-tone={tone}>
      <span className="vos-signal-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </span>
  );
}

export type MenuAction = {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  onSelect: () => void;
};

export function ContextMenu({
  x,
  y,
  title,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  title: string;
  actions: MenuAction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = Array.from(
          ref.current?.querySelectorAll("button") ?? [],
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        buttons[
          (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length
        ]?.focus();
      }
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      className="vos-context-menu"
      role="menu"
      aria-label={`${title} actions`}
      style={{
        left: Math.max(8, Math.min(x, window.innerWidth - 240)),
        top: Math.max(
          8,
          Math.min(y, window.innerHeight - actions.length * 43 - 52),
        ),
      }}
    >
      <div className="vos-context-menu-title">{title}</div>
      {actions.map((action) => {
        const Icon = action.icon ?? ArrowUpRight;
        return (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            className={action.danger ? "danger" : ""}
            onClick={() => {
              action.onSelect();
              onClose();
            }}
          >
            <Icon size={15} strokeWidth={1.65} />
            {action.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
