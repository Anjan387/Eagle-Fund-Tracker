"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money2 } from "@/lib/format";
import { cn } from "@/components/ui";
import type { PricePoint } from "@/lib/types";

const RANGES = [
  { key: "1M", days: 21 },
  { key: "3M", days: 63 },
  { key: "6M", days: 126 },
  { key: "1Y", days: 252 },
] as const;

export function PriceChart({ history }: { history: PricePoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("6M");

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    return history.slice(-days);
  }, [history, range]);

  const up = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const stroke = up ? "var(--pos)" : "var(--neg)";

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              range === r.key
                ? "bg-brand/10 text-brand"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {r.key}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "var(--line-strong)" }}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              minTickGap={40}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis
              width={64}
              orientation="right"
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
            />
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
              labelFormatter={(d) =>
                new Date(String(d)).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              }
              formatter={(value) => [money2(Number(value)), "Close"]}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#priceFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
