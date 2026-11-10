"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { Fill } from "./Fill";
import styles from "./history.module.css";

export interface CounterStat {
  id: string;
  label: string;
  value: number | null;
  placeholder: string;
  format?: "number" | "usd-thousands";
  suffix?: string;
  note?: string;
}

const COUNT_MS = 1600;

function display(n: number, stat: CounterStat): string {
  const body =
    stat.format === "usd-thousands"
      ? `$${Math.round(n / 1000).toLocaleString("en-US")}K`
      : Math.round(n).toLocaleString("en-US");
  return body + (stat.suffix ?? "");
}

/** One number that counts up from zero the first time it scrolls into view. */
function Counter({ stat, value }: { stat: CounterStat; value: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / COUNT_MS);
          setShown(value * (1 - Math.pow(1 - t, 3))); // ease-out
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <p ref={ref} className="mt-2 text-3xl font-semibold tracking-tight text-ink tnum sm:text-4xl">
      {/* screen readers get the final figure, not every frame of the count */}
      <span aria-hidden>{display(shown, stat)}</span>
      <span className="sr-only">{display(value, stat)}</span>
    </p>
  );
}

export function StatCounters({ stats }: { stats: CounterStat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.id} className={cn(styles.glass, "flex flex-col rounded-xl px-4 py-4 sm:px-5 sm:py-5")}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">{stat.label}</dt>
          <dd className="flex flex-1 flex-col">
            {stat.value == null ? (
              <p className="mt-3 text-sm text-ink">
                <Fill text={stat.placeholder} />
              </p>
            ) : (
              <Counter stat={stat} value={stat.value} />
            )}
            {stat.note ? <p className="mt-auto pt-2 text-xs text-muted">{stat.note}</p> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
