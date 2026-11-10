"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/components/ui";
import styles from "./history.module.css";

export interface NavSection {
  id: string;
  label: string;
}

/**
 * "On this page" navigation that follows the reader: a row of dots pinned to
 * the right edge on large screens, a sticky strip of chips under the hero on
 * small ones. The section currently on screen is highlighted in both.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      // the last section whose top has passed a line a third of the way down the screen
      const line = window.innerHeight * 0.35;
      let current = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // the last section is too short to reach that line, so the page bottom counts
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1]?.id;
      setActive(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  // keep the highlighted chip in view inside the strip (without moving the page)
  useEffect(() => {
    const bar = strip.current;
    const chip = bar?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!bar || !chip) return;
    bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2 });
  }, [active]);

  function go(e: MouseEvent, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true }); // so the next Tab continues from that section
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <>
      <nav
        aria-label="On this page"
        className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 lg:flex"
      >
        {sections.map((s) => {
          const current = s.id === active;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={current ? "location" : undefined}
              onClick={(e) => go(e, s.id)}
              className="group relative flex h-5 w-5 items-center justify-center"
            >
              <span
                className={cn(
                  "rounded-full transition-all",
                  current ? "h-2.5 w-2.5 bg-gold" : "h-1.5 w-1.5 bg-line-strong group-hover:bg-muted",
                )}
              />
              <span
                className={cn(
                  styles.glass,
                  "pointer-events-none absolute right-6 whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
              >
                {s.label}
              </span>
            </a>
          );
        })}
      </nav>

      <nav
        aria-label="On this page"
        className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas/85 backdrop-blur sm:-mx-6 lg:hidden"
      >
        <div ref={strip} className="flex gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
          {sections.map((s) => {
            const current = s.id === active;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={current ? "location" : undefined}
                onClick={(e) => go(e, s.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors",
                  current ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {s.label}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
