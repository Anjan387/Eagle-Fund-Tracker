"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { interpolate } from "@/lib/analytics/math";
import { cn } from "@/components/ui";

// "What happens to the fund if the S&P 500 falls X%?"
//
// There is no single right answer, so three estimates are shown side by side,
// each built from a different reading of how the holdings track the market:
//
//   everyday   beta on all days in the window
//   down-day   beta on only the days the market fell
//   sell-off   what each holding actually did, per point of S&P loss, in the
//              deepest market drawdown in the price history
//
// A holding with a hand-set assumption (content/analytics.ts, or typed in
// here) uses that instead in all three.

export interface ShockHolding {
  ticker: string;
  name: string;
  sleeveName: string;
  value: number;
  weightPct: number;
  beta: number;
  betaDown: number;
  crashBeta: number | null;
  hedgeCurve: { spDrop: number; ret: number }[] | null;
}

type Model = "beta" | "down" | "crash";

const PRESETS = [10, 20, 30, 40, 50];

/** Signed percent; a value that rounds to zero prints as "0.0%", never "-0.0%". */
const signed = (n: number, d = 1) => {
  const r = Number(n.toFixed(d));
  return `${r > 0 ? "+" : ""}${(r === 0 ? 0 : r).toFixed(d)}%`;
};
const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export function ShockLab({
  fundValue,
  marketLabel,
  holdings,
  bench,
  fundBetaSe,
  crash,
}: {
  fundValue: number;
  marketLabel: string;
  holdings: ShockHolding[];
  bench: { beta: number; betaDown: number; crashBeta: number | null };
  fundBetaSe: number;
  crash: { start: string; end: string; marketPct: number } | null;
}) {
  const [drop, setDrop] = useState(30);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const models: { key: Model; label: string; hint: string }[] = [
    { key: "beta", label: "Everyday beta", hint: "How each holding moves with the market on a typical day." },
    { key: "down", label: "Down-day beta", hint: "The same, measured only on days the market fell." },
    ...(crash
      ? [
          {
            key: "crash" as const,
            label: "Sell-off pattern",
            hint: `What each holding did per point of S&P loss when the market fell ${Math.abs(crash.marketPct).toFixed(0)}% (${crash.start.slice(0, 7)} to ${crash.end.slice(0, 7)}).`,
          },
        ]
      : []),
  ];

  const calc = useMemo(() => {
    /** a holding's estimated return, %, for a given drop and model */
    const ret = (h: ShockHolding, model: Model, d: number): { pct: number; assumed: boolean } => {
      const typed = overrides[h.ticker];
      if (typed != null && typed.trim() !== "" && Number.isFinite(Number(typed))) {
        // a typed figure is for the drop on screen; scale it for the grid's other rows
        return { pct: (Number(typed) * d) / drop, assumed: true };
      }
      if (h.hedgeCurve?.length) {
        return { pct: interpolate(h.hedgeCurve.map((p) => ({ x: p.spDrop, y: p.ret })), d), assumed: true };
      }
      const b = model === "beta" ? h.beta : model === "down" ? h.betaDown : (h.crashBeta ?? h.betaDown);
      return { pct: Math.max(-b * d, -100), assumed: false };
    };
    const fund = (model: Model, d: number) => {
      let usd = 0;
      for (const h of holdings) usd += (h.value * ret(h, model, d).pct) / 100;
      return { usd, pct: fundValue > 0 ? (usd / fundValue) * 100 : 0 };
    };
    const benchPct = (model: Model, d: number) => {
      const b = model === "beta" ? bench.beta : model === "down" ? bench.betaDown : (bench.crashBeta ?? bench.betaDown);
      return -b * d;
    };
    return { ret, fund, benchPct };
  }, [holdings, overrides, drop, fundValue, bench]);

  const outcomes = models.map((m) => ({ ...m, fund: calc.fund(m.key, drop), bench: calc.benchPct(m.key, drop) }));
  const worst = outcomes.reduce((a, b) => (b.fund.usd < a.fund.usd ? b : a));
  const best = outcomes.reduce((a, b) => (b.fund.usd > a.fund.usd ? b : a));
  const rows = [...holdings]
    .map((h) => {
      const byModel = models.map((m) => calc.ret(h, m.key, drop));
      const worstPct = Math.min(...byModel.map((r) => r.pct));
      return { h, byModel, worstPct, worstUsd: (h.value * worstPct) / 100, assumed: byModel[0].assumed };
    })
    .sort((a, b) => a.worstUsd - b.worstUsd);
  const overridden = Object.values(overrides).some((v) => v.trim() !== "");

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      {/* the question */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="shock" className="text-sm text-muted">
            If the {marketLabel} fell by
          </label>
          <span className="text-3xl font-semibold tracking-tight text-ink tnum">{drop}%</span>
        </div>
        <input
          id="shock"
          type="range"
          min={5}
          max={60}
          step={1}
          value={drop}
          onChange={(e) => setDrop(Number(e.target.value))}
          className="w-full accent-[var(--brand)]"
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDrop(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                drop === p ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              −{p}%
            </button>
          ))}
        </div>
      </div>

      {/* the answer, as a range */}
      <div className="rounded-lg border border-line bg-surface-2/60 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Estimated effect on the fund</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-neg tnum">
          {best.fund.pct.toFixed(1) === worst.fund.pct.toFixed(1)
            ? signed(worst.fund.pct)
            : `${signed(best.fund.pct)} to ${signed(worst.fund.pct)}`}
        </p>
        <p className="mt-1 text-sm text-muted tnum">
          {signedMoney(best.fund.usd)} to {signedMoney(worst.fund.usd)} on {money(fundValue)}. The 80/20 benchmark:{" "}
          {signed(Math.max(...outcomes.map((o) => o.bench)))} to {signed(Math.min(...outcomes.map((o) => o.bench)))}.
        </p>
      </div>

      <div className={cn("grid gap-3", models.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {outcomes.map((o) => (
          <div key={o.key} className="rounded-lg border border-line px-4 py-3.5">
            <p className="text-xs font-semibold text-ink">{o.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-ink tnum">{signed(o.fund.pct)}</p>
            <p className="text-xs text-muted tnum">
              {signedMoney(o.fund.usd)} · benchmark {signed(o.bench)}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-faint">{o.hint}</p>
          </div>
        ))}
      </div>

      {/* by holding */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">By holding</h3>
          {overridden ? (
            <button type="button" onClick={() => setOverrides({})} className="text-xs text-brand hover:underline">
              Clear my assumptions
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Holding</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Weight</th>
                {models.map((m) => (
                  <th key={m.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">Worst case</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Your assumption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ h, byModel, worstUsd, assumed }) => (
                <tr key={h.ticker}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="font-mono text-[13px] font-semibold text-ink">{h.ticker}</span>
                    <span className="ml-2 text-xs text-faint">{h.sleeveName}</span>
                  </th>
                  <td className="px-3 py-2 text-right text-muted tnum">{h.weightPct.toFixed(1)}%</td>
                  {byModel.map((r, i) => (
                    <td key={i} className={cn("px-3 py-2 text-right tnum", r.pct > 0 ? "text-pos" : "text-ink")}>
                      {signed(r.pct)}
                    </td>
                  ))}
                  <td className={cn("px-3 py-2 text-right font-medium tnum", worstUsd > 0 ? "text-pos" : "text-neg")}>
                    {signedMoney(worstUsd)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="1"
                        aria-label={`Assumed return for ${h.ticker} if the ${marketLabel} falls ${drop}%`}
                        placeholder={assumed && !overrides[h.ticker] ? "set in file" : "model"}
                        value={overrides[h.ticker] ?? ""}
                        onChange={(e) => setOverrides((o) => ({ ...o, [h.ticker]: e.target.value }))}
                        className="w-24 rounded-md border border-line-strong bg-surface px-2 py-1 text-right text-xs text-ink placeholder:text-faint focus:border-brand focus:outline-none"
                      />
                      <span className="text-xs text-faint">%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Type a return in the last column to replace the model for that holding, for example what you expect a
          tail-risk fund to make in a crash this size. It applies while this page is open. To keep an assumption for
          everyone, add it to HEDGE_ASSUMPTIONS in content/analytics.ts.
        </p>
      </div>

      {/* the grid */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Across sizes of shock</h3>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{marketLabel}</th>
                {models.map((m) => (
                  <th key={m.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">Worst case, $</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PRESETS.map((p) => {
                const f = models.map((m) => calc.fund(m.key, p));
                const w = f.reduce((a, b) => (b.usd < a.usd ? b : a));
                const b = models.map((m) => calc.benchPct(m.key, p));
                return (
                  <tr key={p} className={p === drop ? "bg-brand/5" : undefined}>
                    <th scope="row" className="px-3 py-2 text-left font-medium text-ink tnum">−{p}%</th>
                    {f.map((x, i) => (
                      <td key={i} className="px-3 py-2 text-right text-ink tnum">{signed(x.pct)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium text-neg tnum">{signedMoney(w.usd)}</td>
                    <td className="px-3 py-2 text-right text-muted tnum">
                      {signed(Math.max(...b))} to {signed(Math.min(...b))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-ink">
        <span className="font-semibold">Read this as a range, not a forecast.</span> Every estimate stretches
        day-to-day behavior out to a move far larger than anything in the data. The fund&apos;s everyday beta is
        only known to about ±{(2 * fundBetaSe).toFixed(2)}, and in a real crash holdings tend to fall together
        more than their history suggests. Options-based funds are the least predictable.
      </p>
    </div>
  );
}
