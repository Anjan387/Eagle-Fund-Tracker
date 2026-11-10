"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn, inputClass } from "@/components/ui";

export interface Tab {
  id: string;
  label: string;
  closable?: boolean;
}

/**
 * A row of tabs that becomes a dropdown on small screens. Arrow keys move
 * between tabs; a closable tab has its own close button beside it. The panel
 * a tab controls should carry `role="tabpanel"` and `id={panelId}`.
 */
export function TabBar({
  label,
  tabs,
  active,
  onSelect,
  onClose,
  panelId,
  size = "md",
}: {
  label: string;
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  panelId: string;
  size?: "md" | "sm";
}) {
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const current = tabs.find((t) => t.id === active);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    buttons.current.get(tabs[next].id)?.focus();
  }

  return (
    <>
      {/* small screens: a dropdown */}
      <div className="flex items-center gap-2 sm:hidden">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{label}</span>
          <select value={active} onChange={(e) => onSelect(e.target.value)} className={inputClass}>
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {current?.closable && onClose ? (
          <button
            type="button"
            onClick={() => onClose(current.id)}
            className="shrink-0 rounded-md border border-line-strong px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
        ) : null}
      </div>

      {/* larger screens: tabs */}
      <div
        role="tablist"
        aria-label={label}
        className={cn("hidden gap-1 overflow-x-auto border-b border-line sm:flex", size === "sm" && "gap-0")}
      >
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <div
              key={t.id}
              className={cn(
                "-mb-px flex shrink-0 items-center border-b-2",
                size === "md" && "rounded-t-md border-x border-t",
                size === "md" && (selected ? "border-line border-b-transparent bg-surface" : "border-transparent"),
                size === "sm" && (selected ? "border-brand" : "border-transparent"),
              )}
            >
              <button
                ref={(el) => {
                  if (el) buttons.current.set(t.id, el);
                  else buttons.current.delete(t.id);
                }}
                type="button"
                role="tab"
                id={`${panelId}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-sm transition-colors",
                  selected ? "font-medium text-brand" : "text-muted hover:text-ink",
                  t.closable && "pr-1",
                )}
              >
                {t.label}
              </button>
              {t.closable && onClose ? (
                <button
                  type="button"
                  aria-label={`Close ${t.label}`}
                  onClick={() => onClose(t.id)}
                  className="mr-1.5 grid h-5 w-5 place-items-center rounded text-xs text-faint hover:bg-surface-2 hover:text-ink"
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
