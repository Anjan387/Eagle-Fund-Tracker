"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/components/ui";

export interface IpsNavItem {
  id: string;
  /** "1", "2" ... for numbered sections; omitted for the others */
  num?: string;
  label: string;
}

/**
 * Contents list for the Investment Policy page. A sticky column beside the text on large
 * screens, a sticky strip of chips on small ones. The section being read is
 * highlighted in both.
 */
export function IpsNav({ items }: { items: IpsNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      // the last section whose top has passed a line a quarter of the way down the screen
      const line = window.innerHeight * 0.25;
      let current = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) current = it.id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = items[items.length - 1]?.id;
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
  }, [items]);

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
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <>
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-8">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Contents</p>
          <ol className="mt-3 flex flex-col border-l border-line">
            {items.map((it) => {
              const current = it.id === active;
              return (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    aria-current={current ? "location" : undefined}
                    onClick={(e) => go(e, it.id)}
                    className={cn(
                      "-ml-px flex items-baseline gap-2.5 border-l-2 py-1.5 pl-3 pr-2 text-[13px] leading-snug transition-colors",
                      current
                        ? "border-gold font-medium text-ink"
                        : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 shrink-0 text-right font-mono text-[11px] tnum",
                        current ? "text-gold-ink" : "text-faint",
                      )}
                    >
                      {it.num ?? "·"}
                    </span>
                    <span>{it.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      <nav
        aria-label="On this page"
        className="sticky top-14 z-20 -mx-4 mb-6 border-b border-line bg-canvas/90 backdrop-blur sm:-mx-6 md:top-0 lg:hidden"
      >
        <div ref={strip} className="flex gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
          {items.map((it) => {
            const current = it.id === active;
            return (
              <a
                key={it.id}
                href={`#${it.id}`}
                aria-current={current ? "location" : undefined}
                onClick={(e) => go(e, it.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
                  current ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {it.num ? `${it.num} · ` : ""}
                {it.label}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
