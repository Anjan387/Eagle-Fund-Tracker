"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { cn } from "@/components/ui";

// A parallel move in interest rates, applied through each bond holding's
// duration: price change = -duration x change in yield. Durations are the
// hand-kept figures in content/analytics.ts.

const PRESETS = [-100, -50, 50, 100, 200];

const signed = (n: number, d = 2) => {
  const r = Number(n.toFixed(d));
  return `${r > 0 ? "+" : ""}${(r === 0 ? 0 : r).toFixed(d)}%`;
};
const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export function RatesLab({
  fundValue,
  holdings,
  benchDuration,
}: {
  fundValue: number;
  holdings: { ticker: string; name: string; value: number; weightPct: number; durationYears: number }[];
  /** benchmark duration: its bond weight times that bond fund's duration */
  benchDuration: number;
}) {
  const [bps, setBps] = useState(100);
  const dy = bps / 100; // percentage points
  const rows = holdings
    .filter((h) => h.durationYears > 0)
    .map((h) => ({ ...h, retPct: -h.durationYears * dy, usd: (h.value * -h.durationYears * dy) / 100 }))
    .sort((a, b) => Math.abs(b.usd) - Math.abs(a.usd));
  const usd = rows.reduce((s, r) => s + r.usd, 0);
  const pct = fundValue > 0 ? (usd / fundValue) * 100 : 0;
  const fundDuration = rows.reduce((s, r) => s + (r.weightPct / 100) * r.durationYears, 0);

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="rates" className="text-sm text-muted">
            If interest rates moved by
          </label>
          <span className="text-3xl font-semibold tracking-tight text-ink tnum">
            {bps > 0 ? "+" : ""}
            {bps} bps
          </span>
        </div>
        <input
          id="rates"
          type="range"
          min={-200}
          max={300}
          step={25}
          value={bps}
          onChange={(e) => setBps(Number(e.target.value))}
          className="w-full accent-[var(--brand)]"
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBps(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                bps === p ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {p > 0 ? "+" : ""}
              {p} bps
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface-2/60 px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Effect on the fund</p>
          <p className={cn("mt-1.5 text-xl font-semibold tracking-tight tnum", usd < 0 ? "text-neg" : usd > 0 ? "text-pos" : "text-ink")}>
            {signed(pct)}
          </p>
          <p className="text-xs text-muted tnum">{signedMoney(usd)}</p>
        </div>
        <div className="rounded-lg border border-line px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">80/20 benchmark</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tnum">{signed(-benchDuration * dy)}</p>
          <p className="text-xs text-muted">from its 20% in bonds</p>
        </div>
        <div className="rounded-lg border border-line px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Fund duration</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tnum">{fundDuration.toFixed(2)} yrs</p>
          <p className="text-xs text-muted tnum">benchmark {benchDuration.toFixed(2)} yrs</p>
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Holding</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Weight</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Duration</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Price change</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Dollars</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="font-mono text-[13px] font-semibold text-ink">{r.ticker}</span>
                    <span className="ml-2 text-xs text-faint">{r.name}</span>
                  </th>
                  <td className="px-3 py-2 text-right text-muted tnum">{r.weightPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-muted tnum">{r.durationYears.toFixed(1)} yrs</td>
                  <td className="px-3 py-2 text-right text-ink tnum">{signed(r.retPct)}</td>
                  <td className={cn("px-3 py-2 text-right font-medium tnum", r.usd < 0 ? "text-neg" : r.usd > 0 ? "text-pos" : "text-ink")}>
                    {signedMoney(r.usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">No holding has a duration set in content/analytics.ts.</p>
      )}

      <p className="text-[11px] leading-relaxed text-faint">
        This is the direct effect on bond prices only: every other holding is held flat. A rate move big enough to
        matter usually moves stocks too, which the 2022 episode below shows. Durations come from fund fact sheets
        and are kept in content/analytics.ts; the estimate ignores convexity, so it slightly overstates losses on
        large rises.
      </p>
    </div>
  );
}
