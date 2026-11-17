import type { ReactNode } from "react";
import { money } from "@/lib/format";
import type { Snapshot, TradeResult } from "@/lib/analytics/engine";
import { cn } from "@/components/ui";

// The portfolio before and after one trade. No hooks, so it renders on the
// server (Proposals page) and inside the client what-if tool alike.

/** The equity shock quoted in the table, as a positive percent. */
export const IMPACT_SHOCK = 30;

const STATUS_LABEL = { under: "below range", "in-range": "in range", over: "above range" } as const;
const STATUS_TONE = { under: "text-warn-ink", "in-range": "text-pos", over: "text-neg" } as const;

function Row({
  label,
  before,
  after,
  delta,
  note,
}: {
  label: string;
  before: string;
  after: string;
  delta?: string;
  note?: ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
        {label}
      </th>
      <td className="px-3 py-2 text-right text-muted tnum">{before}</td>
      <td className="px-3 py-2 text-right font-medium text-ink tnum">{after}</td>
      <td className="px-3 py-2 text-right text-xs text-muted tnum">{delta ?? ""}</td>
      <td className="hidden px-3 py-2 text-xs sm:table-cell">{note ?? ""}</td>
    </tr>
  );
}

/**
 * The change between two figures, worked out from the rounded values the table
 * shows, so "7.1 → 7.0" never reads "no change". `shown` is the number of
 * decimals in the Now/After columns; `digits` the decimals of the change.
 */
const change = (a: number, b: number, digits: number, unit = "", shown = digits) => {
  const ra = Number(a.toFixed(shown));
  const rb = Number(b.toFixed(shown));
  const d = Math.abs(b - a) >= 0.5 * Math.pow(10, -digits) ? b - a : rb - ra;
  if (ra === rb && Math.abs(b - a) < 0.5 * Math.pow(10, -digits)) return "no change";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(digits)}${unit}`;
};

const shockLoss = (s: Snapshot) => -s.beta * (IMPACT_SHOCK / 100) * s.value;
const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export function ImpactTable({ ticker, result, tickers }: { ticker: string; result: TradeResult; tickers: string[] }) {
  const { before: b, after: a } = result;
  const i = tickers.indexOf(ticker);
  const wb = i >= 0 ? b.weights[i] * 100 : 0;
  const wa = i >= 0 ? a.weights[i] * 100 : 0;
  const moved = a.sleeves.filter((s, k) => Math.abs(s.pct - b.sleeves[k].pct) > 0.005);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[26rem] text-left text-sm">
          <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Measure</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Now</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">After</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Change</th>
              <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <Row label={`${ticker} weight`} before={`${wb.toFixed(1)}%`} after={`${wa.toFixed(1)}%`} delta={change(wb, wa, 1, " pts")} />
            {moved.map((s) => {
              const prev = b.sleeves.find((x) => x.id === s.id)!;
              return (
                <Row
                  key={s.id}
                  label={`${s.name} sleeve`}
                  before={`${prev.pct.toFixed(1)}%`}
                  after={`${s.pct.toFixed(1)}%`}
                  delta={change(prev.pct, s.pct, 1, " pts")}
                  note={
                    <span className={cn("font-medium", STATUS_TONE[s.status])}>
                      {STATUS_LABEL[s.status]} ({s.min}–{s.max}%)
                    </span>
                  }
                />
              );
            })}
            <Row
              label="Cash"
              before={money(b.cash)}
              after={a.cash < 0 ? signedMoney(a.cash) : money(a.cash)}
              delta={`${a.cashPct < 0 ? "−" : ""}${Math.abs(a.cashPct).toFixed(1)}% of fund`}
              note={a.cash < 0 ? <span className="font-medium text-neg">needs funding</span> : undefined}
            />
            <Row label="Volatility (annual)" before={`${b.volPct.toFixed(1)}%`} after={`${a.volPct.toFixed(1)}%`} delta={change(b.volPct, a.volPct, 2, " pts")} />
            <Row label="Beta to S&P 500" before={b.beta.toFixed(2)} after={a.beta.toFixed(2)} delta={change(b.beta, a.beta, 3)} />
            <Row label="Tracking error" before={`${b.tePct.toFixed(1)}%`} after={`${a.tePct.toFixed(1)}%`} delta={change(b.tePct, a.tePct, 2, " pts")} />
            <Row
              label={`Fund if S&P falls ${IMPACT_SHOCK}%`}
              before={signedMoney(shockLoss(b))}
              after={signedMoney(shockLoss(a))}
              delta={(() => {
                const d = shockLoss(a) - shockLoss(b);
                return Math.abs(d) < 0.5 ? "no change" : `${d > 0 ? "+" : "−"}${money(Math.abs(d))}`;
              })()}
              note={<span className="text-faint">everyday beta</span>}
            />
            <Row
              label="Largest position"
              before={`${b.largest.ticker} ${b.largest.pct.toFixed(1)}%`}
              after={`${a.largest.ticker} ${a.largest.pct.toFixed(1)}%`}
            />
            <Row label="Effective positions" before={b.effectiveN.toFixed(1)} after={a.effectiveN.toFixed(1)} delta={change(b.effectiveN, a.effectiveN, 1)} />
          </tbody>
        </table>
      </div>
      {result.warnings.map((w) => (
        <p key={w} className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-ink">
          {w}
        </p>
      ))}
    </div>
  );
}
