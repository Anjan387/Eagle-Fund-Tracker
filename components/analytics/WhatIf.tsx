"use client";

import { useMemo, useState } from "react";
import { longDate, money, money2 } from "@/lib/format";
import { tradeImpact, type RiskBase } from "@/lib/analytics/engine";
import { cn, inputClass, labelClass } from "@/components/ui";
import { ImpactTable } from "./ImpactTable";

// Try a trade before proposing it: the fund's risk before and after, worked
// out in the browser from the same covariance matrix the page uses.

export function WhatIf({ base }: { base: RiskBase }) {
  const held = base.tickers.filter((_, i) => base.shares[i] > 0);
  const others = base.tickers.filter((_, i) => base.shares[i] === 0).sort();
  const [ticker, setTicker] = useState(held[0] ?? base.tickers[0]);
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("5000");
  const [unit, setUnit] = useState<"usd" | "shares">("usd");
  const [strategyId, setStrategyId] = useState(base.sleeves[0]?.id ?? "");

  const i = base.tickers.indexOf(ticker);
  const price = base.price[i] ?? 0;
  const isNew = i >= 0 && base.shares[i] === 0;
  const qty = unit === "shares" ? Number(amount) : price > 0 ? Number(amount) / price : 0;

  const result = useMemo(
    () =>
      Number.isFinite(qty) && qty > 0
        ? tradeImpact(base, { ticker, action, shares: qty, strategyId: isNew ? strategyId : undefined })
        : null,
    [base, ticker, action, qty, strategyId, isNew],
  );

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto]">
        <div>
          <label htmlFor="wi-ticker" className={labelClass}>
            Ticker
          </label>
          <select id="wi-ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} className={cn(inputClass, "mt-1")}>
            <optgroup label="Held now">
              {held.map((t) => (
                <option key={t} value={t}>
                  {t} · {base.names[base.tickers.indexOf(t)]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Not held">
              {others.map((t) => (
                <option key={t} value={t}>
                  {t} · {base.names[base.tickers.indexOf(t)]}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <span className={labelClass}>Action</span>
          <div className="mt-1 flex rounded-md border border-line-strong p-0.5">
            {(["buy", "sell"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={action === a}
                onClick={() => setAction(a)}
                className={cn(
                  "rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  action === a ? "bg-brand text-brand-contrast" : "text-muted hover:text-ink",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="wi-amount" className={labelClass}>
            Amount
          </label>
          <input
            id="wi-amount"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(inputClass, "mt-1 tnum")}
          />
        </div>
        <div>
          <span className={labelClass}>In</span>
          <div className="mt-1 flex rounded-md border border-line-strong p-0.5">
            {(
              [
                ["usd", "Dollars"],
                ["shares", "Shares"],
              ] as const
            ).map(([u, label]) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  unit === u ? "bg-brand text-brand-contrast" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isNew && action === "buy" ? (
        <div className="max-w-xs">
          <label htmlFor="wi-sleeve" className={labelClass}>
            Sleeve for the new position
          </label>
          <select id="wi-sleeve" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={cn(inputClass, "mt-1")}>
            {base.sleeves.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {result && result.ok ? (
        <>
          <p className="text-sm text-muted tnum">
            <span className="font-medium capitalize text-ink">{action}</span>{" "}
            {/* the quantity actually traded: a sale is capped at the shares held */}
            {(result.price > 0 ? result.notional / result.price : qty).toLocaleString("en-US", { maximumFractionDigits: 2 })} shares of{" "}
            <span className="font-medium text-ink">{ticker}</span> at {money2(result.price)} = {money(result.notional)}
          </p>
          <ImpactTable ticker={ticker} result={result} tickers={base.tickers} />
        </>
      ) : (
        <p className="text-sm text-muted">{result && !result.ok ? result.reason : "Enter an amount to see the effect."}</p>
      )}

      <p className="text-[11px] leading-relaxed text-faint">
        Priced at the last common close ({longDate(base.asOf)}). A buy is paid from cash and a sale adds to it; nothing else is
        rebalanced. Covers current holdings, the watchlist and any ticker with a pending proposal. Risk figures use
        the same window as the rest of this page.
      </p>
    </div>
  );
}
