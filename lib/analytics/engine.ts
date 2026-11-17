// Portfolio-level risk from a covariance matrix. Pure, so the same code runs on
// the server (Proposals page, Analytics page) and in the browser (the what-if
// trade tool recalculates as you type).

import { TRADING_DAYS, matVec, quadForm } from "./math";

export type WindowKey = "rebuild" | "6m" | "1y" | "max";

export const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "rebuild", label: "Since rebuild" },
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
  { key: "max", label: "All history" },
];

export interface SleeveRange {
  id: string;
  name: string;
  min: number;
  max: number;
}

/** Everything needed to re-price the portfolio's risk under different positions. */
export interface RiskBase {
  asOf: string;
  /** every ticker with enough price history: holdings, benchmark, market, watchlist, pending proposals */
  tickers: string[];
  names: string[];
  /** daily covariance of returns over the selected window, in `tickers` order */
  cov: number[][];
  /** last common close */
  price: number[];
  /** shares held today (0 if not held) */
  shares: number[];
  /** strategy id of each held ticker, null otherwise */
  sleeve: (string | null)[];
  cash: number;
  /** benchmark weight of each ticker (0 for most) */
  bench: number[];
  /** index of the market ticker (S&P 500) */
  market: number;
  sleeves: SleeveRange[];
}

export interface Snapshot {
  value: number;
  cash: number;
  cashPct: number;
  weights: number[];
  /** annualized volatility, % */
  volPct: number;
  /** beta to the market */
  beta: number;
  /** annualized tracking error vs the benchmark, % */
  tePct: number;
  largest: { ticker: string; pct: number };
  /** 1 / sum of squared weights: how many equal positions this is like */
  effectiveN: number;
  sleeves: (SleeveRange & { pct: number; status: "under" | "in-range" | "over" })[];
}

/** Risk of the portfolio defined by `shares`, `cash` and `sleeve`. */
export function snapshot(
  base: RiskBase,
  shares: number[] = base.shares,
  cash: number = base.cash,
  sleeve: (string | null)[] = base.sleeve,
): Snapshot {
  const values = shares.map((s, i) => s * base.price[i]);
  const value = values.reduce((a, b) => a + b, 0) + cash;
  const weights = values.map((v) => (value > 0 ? v / value : 0));

  const variance = quadForm(weights, base.cov);
  const m = base.market;
  const beta = base.cov[m][m] > 0 ? matVec(base.cov, weights)[m] / base.cov[m][m] : 0;
  const active = weights.map((w, i) => w - base.bench[i]);
  const teVar = quadForm(active, base.cov);

  let largest = { ticker: "", pct: 0 };
  let hhi = 0;
  weights.forEach((w, i) => {
    if (w * 100 > largest.pct) largest = { ticker: base.tickers[i], pct: w * 100 };
    hhi += w * w;
  });

  return {
    value,
    cash,
    cashPct: value > 0 ? (cash / value) * 100 : 0,
    weights,
    volPct: Math.sqrt(Math.max(variance, 0) * TRADING_DAYS) * 100,
    beta,
    tePct: Math.sqrt(Math.max(teVar, 0) * TRADING_DAYS) * 100,
    largest,
    effectiveN: hhi > 0 ? 1 / hhi : 0,
    sleeves: base.sleeves.map((s) => {
      const pct = weights.reduce((a, w, i) => (sleeve[i] === s.id ? a + w * 100 : a), 0);
      return { ...s, pct, status: pct < s.min ? "under" : pct > s.max ? "over" : "in-range" };
    }),
  };
}

export interface TradeInput {
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  /** the sleeve a newly bought ticker goes into */
  strategyId?: string;
}

export interface TradeResult {
  ok: true;
  before: Snapshot;
  after: Snapshot;
  /** trade value at the last close */
  notional: number;
  price: number;
  /** shares held after the trade */
  sharesAfter: number;
  warnings: string[];
}

/**
 * The portfolio before and after one trade, priced at the last close. A buy is
 * paid for from cash and a sale adds to it; nothing else is rebalanced.
 */
export function tradeImpact(base: RiskBase, trade: TradeInput): TradeResult | { ok: false; reason: string } {
  const i = base.tickers.indexOf(trade.ticker.trim().toUpperCase());
  if (i < 0) return { ok: false, reason: "Not enough price history for this ticker to estimate its risk." };
  if (!(trade.shares > 0)) return { ok: false, reason: "Enter a number of shares." };

  const warnings: string[] = [];
  const shares = [...base.shares];
  const sleeve = [...base.sleeve];
  let qty = trade.shares;
  if (trade.action === "sell" && qty > shares[i]) {
    warnings.push(
      shares[i] > 0
        ? `The fund holds ${shares[i].toLocaleString()} shares; the sale is capped there.`
        : "The fund does not hold this ticker, so there is nothing to sell.",
    );
    qty = shares[i];
  }
  const notional = qty * base.price[i];
  shares[i] += trade.action === "buy" ? qty : -qty;
  const cash = base.cash + (trade.action === "buy" ? -notional : notional);
  if (trade.action === "buy" && !sleeve[i]) sleeve[i] = trade.strategyId ?? null;
  if (shares[i] === 0) sleeve[i] = base.sleeve[i]; // keep the label; its weight is zero anyway
  if (cash < 0) {
    warnings.push(
      `Cash would go ${Math.round(-cash).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} negative: something must be sold to fund this.`,
    );
  }

  return {
    ok: true,
    before: snapshot(base),
    after: snapshot(base, shares, cash, sleeve),
    notional,
    price: base.price[i],
    sharesAfter: shares[i],
    warnings,
  };
}
