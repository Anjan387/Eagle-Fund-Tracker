"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// The fund against its benchmark over time. One y-axis, two series: the fund
// is the solid brand line, the benchmark the dashed gold one, so the pair is
// never told apart by color alone.

type Unit = "pct" | "index";

const fmt: Record<Unit, (v: number) => string> = {
  pct: (v) => `${v.toFixed(1)}%`,
  index: (v) => `$${v.toFixed(2)}`,
};
const axisFmt: Record<Unit, (v: number) => string> = {
  pct: (v) => `${v.toFixed(0)}%`,
  index: (v) => `$${v.toFixed(0)}`,
};

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fullDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function FundVsBenchChart({
  data,
  unit,
  fundLabel = "Eagle Fund",
  benchLabel = "80/20 benchmark",
  /** shade under the fund line down to zero (used for drawdowns) */
  fill = false,
  /** a horizontal reference line, e.g. 100 for an index or 0 for drawdown */
  baseline,
  height = 260,
}: {
  data: { date: string; fund: number | null; bench: number | null }[];
  unit: Unit;
  fundLabel?: string;
  benchLabel?: string;
  fill?: boolean;
  baseline?: number;
  height?: number;
}) {
  const f = fmt[unit];
  // one tick per month, on its first trading day (skipping the partial first month)
  const ticks = data.filter((p, i) => i > 0 && p.date.slice(0, 7) !== data[i - 1].date.slice(0, 7)).map((p) => p.date);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-2 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-brand" />
          {fundLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-gold" />
          {benchLabel}
        </span>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "var(--line-strong)" }}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickFormatter={shortDate}
              ticks={ticks}
              minTickGap={40}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickFormatter={(v) => axisFmt[unit](Number(v))}
              domain={["auto", "auto"]}
            />
            {baseline != null ? <ReferenceLine y={baseline} stroke="var(--line-strong)" /> : null}
            <Tooltip
              cursor={{ stroke: "var(--line-strong)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ink)",
              }}
              labelStyle={{ color: "var(--muted)" }}
              labelFormatter={(label) => fullDate(String(label))}
              formatter={(value, name) => [f(Number(value)), name === "fund" ? fundLabel : benchLabel]}
            />
            {fill ? (
              <Area
                type="linear"
                dataKey="fund"
                stroke="none"
                fill="var(--brand)"
                fillOpacity={0.12}
                isAnimationActive={false}
                tooltipType="none"
                legendType="none"
                activeDot={false}
              />
            ) : null}
            <Line
              type="linear"
              dataKey="bench"
              stroke="var(--gold)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line type="linear" dataKey="fund" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
