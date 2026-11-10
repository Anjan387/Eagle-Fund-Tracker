"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/ui";
import type { Era } from "@/content/fund-history";
import { Fill } from "./Fill";
import styles from "./history.module.css";

/** The fund's chapters as tabs. Arrow keys move between them. */
export function Eras({
  eras,
  sleeves,
}: {
  eras: Era[];
  sleeves: { code: string; name: string }[];
}) {
  const [activeId, setActiveId] = useState(eras[0]?.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const era = eras.find((e) => e.id === activeId) ?? eras[0];
  if (!era) return null;

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = eras.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActiveId(eras[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Eras of the fund"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-surface-2 p-1"
      >
        {eras.map((e, i) => {
          const selected = e.id === era.id;
          return (
            <button
              key={e.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`era-tab-${e.id}`}
              aria-selected={selected}
              aria-controls="era-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(e.id)}
              onKeyDown={(ev) => onKeyDown(ev, i)}
              className={cn(
                "shrink-0 rounded-md px-3.5 py-2 text-sm transition-colors",
                selected
                  ? "bg-surface font-medium text-brand shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                  : "text-muted hover:text-ink",
              )}
            >
              {e.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="era-panel"
        aria-labelledby={`era-tab-${era.id}`}
        tabIndex={0}
        className={cn(styles.glass, "mt-4 overflow-hidden rounded-xl")}
      >
        {/* keyed so the content animates in again on every switch */}
        <div key={era.id} className={cn(styles.eraPanel, "grid gap-6 p-5 sm:p-7 md:grid-cols-[0.9fr_1.1fr]")}>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gold">
              <Fill text={era.years} />
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">{era.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <Fill text={era.summary} />
            </p>
          </div>
          <div>
            <ul className="flex flex-col gap-3">
              {era.points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>
                    <Fill text={point} />
                  </span>
                </li>
              ))}
            </ul>
            {era.id === "today" && sleeves.length ? (
              <dl className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
                {sleeves.map((s) => (
                  <div key={s.code} className="flex items-baseline gap-2 text-sm">
                    <dt className="w-12 shrink-0 font-mono text-xs font-semibold text-brand">{s.code}</dt>
                    <dd className="text-muted">
                      <Fill text={s.name} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
