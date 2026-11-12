"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardHeader, EmptyState, inputClass } from "@/components/ui";
import { cn } from "@/components/ui";
import { longDate, money, money2 } from "@/lib/format";

export interface TradeRow {
  id: string;
  date: string; // YYYY-MM-DD
  action: "buy" | "sell";
  ticker: string;
  company: string | null;
  shares: number;
  price: number;
  strategyId: string;
  strategy: string;
  enteredBy: string;
  fromProposal: boolean;
  notes: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PAGE = 40;

/** Everything a trade can be found by, as one lowercase string: dates are spelled every way people type them. */
function haystack(t: TradeRow): string {
  const [y, m, d] = t.date.split("-").map(Number);
  const month = MONTHS[m - 1];
  return [
    t.ticker,
    t.company ?? "",
    t.action,
    t.strategy,
    t.enteredBy,
    t.notes ?? "",
    t.fromProposal ? "from proposal" : "advisor entry",
    t.date, // 2026-04-09
    `${y}-${String(m).padStart(2, "0")}`, // 2026-04
    `${m}/${d}/${y}`, // 4/9/2026
    `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`, // 04/09/2026
    `${month} ${d}, ${y}`, // April 9, 2026
    `${month} ${d} ${y}`,
    `${d} ${month} ${y}`,
    `${month} ${y}`,
    month,
    String(y),
  ]
    .join(" | ")
    .toLowerCase();
}

/**
 * The trade log with a live search box and filters. The box takes any mix of
 * words, and a trade must match every one: "apple april", "2026-04", "sell
 * 2025", "alphabet inc", "buy aapl 4/9". Everything updates as you type.
 */
export function TradeLog({ rows, strategies }: { rows: TradeRow[]; strategies: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<"" | "buy" | "sell">("");
  const [strategy, setStrategy] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const indexed = useMemo(() => rows.map((t) => ({ t, text: haystack(t) })), [rows]);
  const years = useMemo(() => [...new Set(rows.map((t) => t.date.slice(0, 4)))].sort().reverse(), [rows]);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = indexed
    .filter(({ t, text }) => {
      if (action && t.action !== action) return false;
      if (strategy && t.strategyId !== strategy) return false;
      if (year && !t.date.startsWith(year)) return false;
      if (month && t.date.slice(5, 7) !== month) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return words.every((w) => text.includes(w));
    })
    .map(({ t }) => t);

  const filtered = !!(query || action || strategy || year || month || from || to);
  const bought = shown.filter((t) => t.action === "buy").reduce((s, t) => s + t.shares * t.price, 0);
  const sold = shown.filter((t) => t.action === "sell").reduce((s, t) => s + t.shares * t.price, 0);

  function clear() {
    setQuery("");
    setAction("");
    setStrategy("");
    setYear("");
    setMonth("");
    setFrom("");
    setTo("");
    setLimit(PAGE);
  }
  // any change to what is searched goes back to the first page of results
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  const select = cn(inputClass, "w-auto py-1.5 text-xs");

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`Trade log (${rows.length})`}
        description={filtered ? `${shown.length} of ${rows.length} trades match.` : "Most recent first."}
      />
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No trades recorded yet" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4">
            <label>
              <span className="sr-only">Search trades</span>
              <input
                type="search"
                value={query}
                onChange={(e) => reset(setQuery)(e.target.value)}
                placeholder="Search by ticker, company, date, month or year — e.g. apple, april 2026, 2025-09, sell"
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-xs text-muted">
              <label className="flex flex-col gap-1">
                Buy / Sell
                <select value={action} onChange={(e) => reset(setAction)(e.target.value as "" | "buy" | "sell")} className={select}>
                  <option value="">Both</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Strategy
                <select value={strategy} onChange={(e) => reset(setStrategy)(e.target.value)} className={select}>
                  <option value="">All strategies</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Year
                <select value={year} onChange={(e) => reset(setYear)(e.target.value)} className={select}>
                  <option value="">All years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Month
                <select value={month} onChange={(e) => reset(setMonth)(e.target.value)} className={select}>
                  <option value="">All months</option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={String(i + 1).padStart(2, "0")}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                From
                <input type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} className={select} />
              </label>
              <label className="flex flex-col gap-1">
                To
                <input type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} className={select} />
              </label>
              {filtered ? (
                <button type="button" onClick={clear} className="py-1.5 font-medium text-brand hover:underline">
                  Clear search
                </button>
              ) : null}
            </div>
            <p aria-live="polite" className="text-xs text-muted tnum">
              {shown.length} {shown.length === 1 ? "trade" : "trades"}
              {shown.length > 0 ? ` · bought ${money(bought)} · sold ${money(sold)}` : ""}
            </p>
          </div>

          {shown.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No trades match" hint="Try fewer words, a ticker, or a month and year like “april 2026”." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Ticker</th>
                    <th className="px-4 py-2.5 text-right font-medium">Shares</th>
                    <th className="px-4 py-2.5 text-right font-medium">Price</th>
                    <th className="px-4 py-2.5 text-right font-medium">Value</th>
                    <th className="px-4 py-2.5 font-medium">Strategy</th>
                    <th className="px-4 py-2.5 font-medium">Entered by</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, limit).map((t) => (
                    <tr key={t.id} className="border-b border-line align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 tnum text-muted">{longDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={t.action === "buy" ? "pos" : "neg"}>{t.action.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink">{t.ticker}</span>
                        {t.company ? <span className="block max-w-[14rem] truncate text-[11px] text-faint">{t.company}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-right tnum">{t.shares.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tnum">{money2(t.price)}</td>
                      <td className="px-4 py-3 text-right tnum">{money(t.shares * t.price)}</td>
                      <td className="px-4 py-3 text-muted">{t.strategy}</td>
                      <td className="px-4 py-3 text-muted">
                        {t.enteredBy}
                        <span className="block text-[11px] text-faint">
                          {t.fromProposal ? "from proposal" : "advisor entry"}
                        </span>
                        {t.notes ? <span className="mt-1 block max-w-xs text-[11px] text-faint">{t.notes}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shown.length > limit ? (
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
              <span>
                Showing {limit} of {shown.length}
              </span>
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="rounded-md border border-line-strong bg-surface px-3 py-1.5 font-medium text-ink hover:bg-surface-2"
              >
                Show {Math.min(PAGE, shown.length - limit)} more
              </button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
