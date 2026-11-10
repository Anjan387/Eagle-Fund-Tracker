"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/components/ui";
import type { Milestone } from "@/content/fund-history";
import { Fill } from "./Fill";
import styles from "./history.module.css";

const DESKTOP = "(min-width: 1024px)";

/**
 * The fund's milestones: a vertical list on small screens, a sideways-scrolling
 * row on large ones. Each card opens the full story in a dialog. The progress
 * rail fills as the reader moves through the timeline — with the page scroll on
 * small screens, with the row's own scroll on large ones.
 */
export function Timeline({ milestones }: { milestones: Milestone[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLOListElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Milestone | null>(null);

  // progress rail
  useEffect(() => {
    const wrapEl = wrap.current;
    const rowEl = row.current;
    if (!wrapEl || !rowEl) return;
    const desktop = window.matchMedia(DESKTOP);
    let frame = 0;

    const measure = () => {
      let progress: number;
      if (desktop.matches) {
        const span = rowEl.scrollWidth - rowEl.clientWidth;
        progress = span > 0 ? rowEl.scrollLeft / span : 1;
      } else {
        const rect = wrapEl.getBoundingClientRect();
        progress = (window.innerHeight * 0.6 - rect.top) / rect.height;
      }
      wrapEl.style.setProperty("--progress", String(Math.min(1, Math.max(0, progress))));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    rowEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      rowEl.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The native modal dialog traps focus, closes on Escape, and hands focus
  // back to the card that opened it.
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  function onCardKey(e: KeyboardEvent, index: number) {
    const last = milestones.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? Math.min(last, index + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? Math.max(0, index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0 || next === index) return;
    e.preventDefault();
    cards.current[next]?.focus();
  }

  function step(direction: 1 | -1) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.current?.scrollBy({ left: direction * 340, behavior: reduced ? "auto" : "smooth" });
  }

  function onBackdrop(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) e.currentTarget.close(); // a click outside the panel
  }

  return (
    <div ref={wrap} className="relative">
      <div className="lg:mb-5 lg:flex lg:items-center lg:gap-4">
        <div aria-hidden className={cn(styles.rail, "lg:flex-1")}>
          <div className={styles.railFill} />
        </div>
        <div className="hidden gap-2 lg:flex">
          <StepButton label="Earlier milestones" onClick={() => step(-1)}>
            ←
          </StepButton>
          <StepButton label="Later milestones" onClick={() => step(1)}>
            →
          </StepButton>
        </div>
      </div>

      {/* w-0 + min-w-full: the row scrolls sideways inside the page instead of stretching it */}
      <ol
        ref={row}
        className="flex w-0 min-w-full flex-col gap-4 pl-8 lg:snap-x lg:flex-row lg:gap-5 lg:overflow-x-auto lg:pb-8 lg:pl-0"
      >
        {milestones.map((m, i) => (
          <li key={m.id} className="relative lg:w-80 lg:shrink-0 lg:snap-start">
            <span
              aria-hidden
              className="absolute -left-8 top-6 h-4 w-4 rounded-full border-2 border-gold bg-canvas lg:hidden"
            />
            <button
              ref={(el) => {
                cards.current[i] = el;
              }}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(m)}
              onKeyDown={(e) => onCardKey(e, i)}
              className={cn(
                styles.glass,
                "group flex h-full w-full flex-col overflow-hidden rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5",
              )}
            >
              {m.image ? (
                <img
                  src={m.image.src}
                  alt={m.image.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-36 w-full object-cover"
                />
              ) : null}
              <span className="flex flex-1 flex-col p-5">
                <span className="font-mono text-xs font-medium uppercase tracking-wider text-gold">
                  <Fill text={m.year} />
                </span>
                <span className="mt-2 text-base font-semibold tracking-tight text-ink">
                  <Fill text={m.title} />
                </span>
                <span className="mt-2 text-sm leading-relaxed text-muted">
                  <Fill text={m.summary} />
                </span>
                <span className="mt-auto pt-4 text-xs font-medium text-brand group-hover:underline">
                  Read the full story →
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <dialog
        ref={dialog}
        aria-labelledby="milestone-title"
        onClose={() => setOpen(null)}
        onClick={onBackdrop}
        className={cn(
          styles.dialog,
          "m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl",
        )}
      >
        {open ? (
          <article>
            {open.image ? (
              <img src={open.image.src} alt={open.image.alt} className="max-h-72 w-full object-cover" />
            ) : null}
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-gold">
                    <Fill text={open.year} />
                  </p>
                  <h3 id="milestone-title" className="mt-2 text-xl font-semibold tracking-tight">
                    <Fill text={open.title} />
                  </h3>
                </div>
                <form method="dialog">
                  <button
                    type="submit"
                    aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    ✕
                  </button>
                </form>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink">
                <Fill text={open.summary} />
              </p>
              {open.story.map((paragraph, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-muted">
                  <Fill text={paragraph} />
                </p>
              ))}
            </div>
          </article>
        ) : null}
      </dialog>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-line-strong bg-surface text-sm text-muted hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  );
}
