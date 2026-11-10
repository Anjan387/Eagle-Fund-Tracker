"use client";

import { useState } from "react";
import { cn, EmptyState, inputClass } from "@/components/ui";
import { INDUSTRIES, type Alum, type Industry } from "@/content/fund-history";
import { Fill, isPlaceholder } from "./Fill";
import styles from "./history.module.css";

function initials(name: string): string {
  if (isPlaceholder(name)) return "?";
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

/** Alumni cards that turn over to show a quote, filterable by class year and industry. */
export function AlumniWall({ alumni }: { alumni: Alum[] }) {
  const [year, setYear] = useState<number | "all">("all");
  const [industry, setIndustry] = useState<Industry | "all">("all");
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const years = [...new Set(alumni.flatMap((a) => (a.gradYear == null ? [] : [a.gradYear])))].sort(
    (a, b) => b - a,
  );
  const visible = alumni.filter(
    (a) => (year === "all" || a.gradYear === year) && (industry === "all" || a.industry === industry),
  );

  function toggle(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by industry" className="flex flex-wrap gap-1.5">
          {[{ id: "all" as const, label: "All industries" }, ...INDUSTRIES].map((option) => {
            const selected = industry === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setIndustry(option.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  selected
                    ? "border-brand/30 bg-brand/10 font-medium text-brand"
                    : "border-line-strong text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted">
          Class of
          <select
            value={String(year)}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className={cn(inputClass, "w-auto py-1.5 text-xs")}
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {visible.length} of {alumni.length} alumni
      </p>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No alumni match these filters" hint="Try another year or industry." />
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => {
            const industryLabel = INDUSTRIES.find((i) => i.id === a.industry)?.label ?? "[ADD INDUSTRY]";
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={flipped.has(a.id)}
                  onClick={() => toggle(a.id)}
                  className={cn(styles.flip, "block h-60 w-full rounded-xl text-left")}
                >
                  <span className={cn(styles.flipInner, "block")}>
                    <span
                      className={cn(
                        styles.flipFace,
                        styles.flipFront,
                        styles.glass,
                        "flex flex-col rounded-xl p-5",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {a.photo ? (
                          <img
                            src={a.photo.src}
                            alt={a.photo.alt}
                            loading="lazy"
                            decoding="async"
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-contrast"
                          >
                            {initials(a.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            <Fill text={a.name} />
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            Class of <Fill text={a.gradYear == null ? "[ADD GRAD YEAR]" : String(a.gradYear)} />
                          </span>
                        </span>
                      </span>
                      <span className="mt-4 block text-sm text-ink">
                        <Fill text={a.role} />
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        <Fill text={a.firm} />
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px]">
                        <span className="text-muted">
                          <Fill text={industryLabel} />
                        </span>
                        <span className="text-faint">Turn over for the quote</span>
                      </span>
                    </span>

                    <span
                      className={cn(
                        styles.flipFace,
                        styles.flipBack,
                        "flex flex-col overflow-y-auto rounded-xl bg-brand p-5 text-brand-contrast",
                      )}
                    >
                      <span aria-hidden className="font-serif text-3xl leading-none opacity-60">
                        “
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed">
                        <Fill text={a.quote} />
                      </span>
                      <span className="mt-auto block pt-3 text-xs opacity-80">
                        <Fill text={a.name} />
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
