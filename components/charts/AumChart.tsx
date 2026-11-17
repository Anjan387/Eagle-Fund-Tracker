"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";

// Fund value by year. Year-end totals are a solid Juniata Blue line over a
// soft fill; the current year is a live estimate, not a year-end figure, so
// the segment that reaches it is dashed and the point is labelled.

type Point = { year: number; value: number; live: boolean };

/** $250K, $1.2M */
function axisMoney(v: number): string {
  return Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`;
}

/** A y-axis that hugs the data, on round steps, so year-to-year changes show. */
function scale(values: number[]): { domain: [number, number]; ticks: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, max * 0.1, 1);
  const pad = span * 0.15;
  const step = [5e3, 1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6].find((s) => (span + 2 * pad) / s <= 6) ?? 1e6;
  const lo = Math.max(0, Math.floor((min - pad) / step) * step);
  const hi = Math.ceil((max + pad) / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-6; t += step) ticks.push(t);
  return { domain: [lo, hi], ticks };
}

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="text-muted">{p.live ? `${p.year} · live estimate` : `${p.year} · year end`}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink tnum">{money(p.value)}</p>
    </div>
  );
}

export function AumChart({ data }: { data: Point[] }) {
  const liveAt = data.findIndex((d) => d.live);
  const rows = data.map((d, i) => ({
    ...d,
    // the solid series: year-end figures only
    actual: d.live ? null : d.value,
    // the dashed series: from the last year end to the live estimate
    estimate: liveAt > 0 && (i === liveAt || i === liveAt - 1) ? d.value : null,
  }));
  const { domain, ticks } = scale(data.map((d) => d.value));
  const live = liveAt >= 0 ? data[liveAt] : null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 28, right: 24, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="aumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: "var(--line-strong)" }}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            width={56}
            domain={domain}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(v) => axisMoney(Number(v))}
          />
          <Tooltip content={<TooltipBody />} cursor={{ stroke: "var(--line-strong)" }} />
          <Area
            type="linear"
            dataKey="actual"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#aumFill)"
            dot={{ r: 3.5, fill: "var(--chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="estimate"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          {live ? (
            <ReferenceDot
              x={live.year}
              y={live.value}
              r={5}
              fill="var(--surface)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              label={{ value: "Live estimate", position: "top", offset: 10, fill: "var(--muted)", fontSize: 11 }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
