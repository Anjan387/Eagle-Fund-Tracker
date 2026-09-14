// Derived fund figures. Everything here is computed from the store + the live
// price service; nothing is hand-typed except the two optional advisor
// overrides in fund_meta (see computeReturns below).

import { getHistoricalClose, getQuotes } from "./prices";
import {
  getCashBalance,
  getFundValueHistory,
  getHoldings,
  getMeta,
  getSnapshots,
  getStrategies,
} from "./store";
import type { FundValueSnapshot, Holding, Strategy } from "./types";

export interface HoldingRow extends Holding {
  strategy: Strategy;
  price: number;
  changePct: number;
  marketValue: number;
  costPerShare: number;
  gainAbs: number;
  gainPct: number;
  weightPct: number; // of total fund value
}

export interface StrategyAllocation {
  strategy: Strategy;
  marketValue: number;
  weightPct: number; // of total fund value
  status: "under" | "in-range" | "over";
}

// How a trailing-return figure was produced:
//  - "trailing-12mo": a true rolling 12-month return from daily fund-value
//    history (needs ~a year of accumulated snapshots).
//  - "since-rebuild": a stand-in used until that history exists — total
//    return since the April 2026 post-liquidation rebuild.
//  - "override": the advisor typed in a correction on the Admin page.
export type ReturnBasis = "trailing-12mo" | "since-rebuild" | "override";

export interface FundOverview {
  fundValue: number;
  investedValue: number;
  cashBalance: number;
  cashWeightPct: number;
  totalCostBasis: number;
  totalGainAbs: number;
  totalGainPct: number;
  fundTrailingReturnPct: number;
  fundReturnBasis: ReturnBasis;
  benchmarkTrailingReturnPct: number;
  benchmarkReturnBasis: ReturnBasis;
  outperformancePct: number;
  allocations: StrategyAllocation[];
  aum: { year: number; value: number; live: boolean }[];
}

// The fund's most recent full liquidation + redeployment. A trailing-12-month
// return spanning this date would be comparing two different portfolios, so
// "since-rebuild" is used as the interim figure instead, until a rolling
// 12-month window no longer needs to cross it.
const REBUILD_DATE = "2026-04-14";
const BENCHMARK_WEIGHTS = { ACWI: 0.8, AGG: 0.2 } as const;

export async function getHoldingRows(): Promise<HoldingRow[]> {
  const [holdings, strategies, cashBalance] = await Promise.all([
    getHoldings(),
    getStrategies(),
    getCashBalance(),
  ]);
  const quotes = await getQuotes(holdings.map((h) => h.ticker));
  const stratById = new Map(strategies.map((s) => [s.id, s]));

  const withValues = holdings.map((h) => {
    const q = quotes[h.ticker];
    const price = q?.price ?? 0;
    const marketValue = price * h.shares;
    const costPerShare = h.shares > 0 ? h.costBasis / h.shares : 0;
    const gainAbs = marketValue - h.costBasis;
    return {
      ...h,
      strategy: stratById.get(h.strategyId)!,
      price,
      changePct: q?.changePct ?? 0,
      marketValue,
      costPerShare,
      gainAbs,
      gainPct: h.costBasis > 0 ? (gainAbs / h.costBasis) * 100 : 0,
    };
  });

  const fundValue = withValues.reduce((sum, r) => sum + r.marketValue, 0) + cashBalance;

  return withValues
    .map((r) => ({ ...r, weightPct: fundValue > 0 ? (r.marketValue / fundValue) * 100 : 0 }))
    .sort(
      (a, b) =>
        a.strategy.name.localeCompare(b.strategy.name) || b.marketValue - a.marketValue,
    );
}

/** Latest history snapshot dated on or before `targetDate`, if any. */
function valueAsOf(history: FundValueSnapshot[], targetDate: string): FundValueSnapshot | null {
  let best: FundValueSnapshot | null = null;
  for (const row of history) {
    if (row.date <= targetDate && (!best || row.date > best.date)) best = row;
  }
  return best;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * The automated trailing-return + benchmark engine. Prefers a true rolling
 * 12-month return once fund_value_history has ~a year of daily snapshots;
 * until then, falls back to a since-the-rebuild total return so the Overview
 * page always shows a live, derived number instead of a blank one. Either can
 * be replaced by an advisor override (see the Admin page).
 */
async function computeReturns(
  fundValue: number,
  totalGainPct: number,
  overrides: { fundTrailingReturnOverridePct: number | null; benchmarkTrailingReturnOverridePct: number | null },
  history: FundValueSnapshot[],
  holdingRows: HoldingRow[],
): Promise<{
  fundTrailingReturnPct: number;
  fundReturnBasis: ReturnBasis;
  benchmarkTrailingReturnPct: number;
  benchmarkReturnBasis: ReturnBasis;
}> {
  const trailingStart = valueAsOf(history, daysAgo(365));

  let fundTrailingReturnPct: number;
  let fundReturnBasis: ReturnBasis;
  let windowStartDate: string;
  if (trailingStart && trailingStart.fundValue > 0) {
    fundTrailingReturnPct = ((fundValue - trailingStart.fundValue) / trailingStart.fundValue) * 100;
    fundReturnBasis = "trailing-12mo";
    windowStartDate = trailingStart.date;
  } else {
    // Not a year of history yet — total return since the rebuild is the best
    // available derived figure (unrealized gain vs. cost basis).
    fundTrailingReturnPct = totalGainPct;
    fundReturnBasis = "since-rebuild";
    windowStartDate = REBUILD_DATE;
  }

  const benchmarkTicker = (t: keyof typeof BENCHMARK_WEIGHTS) =>
    holdingRows.find((r) => r.ticker === t)?.price ?? null;

  let benchmarkTrailingReturnPct = 0;
  let benchmarkReturnBasis: ReturnBasis = fundReturnBasis;
  const acwiNow = benchmarkTicker("ACWI");
  const aggNow = benchmarkTicker("AGG");
  const [acwiBase, aggBase] =
    fundReturnBasis === "trailing-12mo"
      ? await Promise.all([
          getHistoricalClose("ACWI", windowStartDate),
          getHistoricalClose("AGG", windowStartDate),
        ])
      : await Promise.all([
          getHistoricalClose("ACWI", REBUILD_DATE),
          getHistoricalClose("AGG", REBUILD_DATE),
        ]);

  if (acwiNow && aggNow && acwiBase && aggBase) {
    const acwiReturn = ((acwiNow - acwiBase) / acwiBase) * 100;
    const aggReturn = ((aggNow - aggBase) / aggBase) * 100;
    benchmarkTrailingReturnPct =
      BENCHMARK_WEIGHTS.ACWI * acwiReturn + BENCHMARK_WEIGHTS.AGG * aggReturn;
  } else {
    // Couldn't price the blend (API unreachable, no key configured) — hold at
    // 0 rather than showing a misleading number.
    benchmarkTrailingReturnPct = 0;
  }

  if (overrides.fundTrailingReturnOverridePct != null) {
    fundTrailingReturnPct = overrides.fundTrailingReturnOverridePct;
    fundReturnBasis = "override";
  }
  if (overrides.benchmarkTrailingReturnOverridePct != null) {
    benchmarkTrailingReturnPct = overrides.benchmarkTrailingReturnOverridePct;
    benchmarkReturnBasis = "override";
  }

  return { fundTrailingReturnPct, fundReturnBasis, benchmarkTrailingReturnPct, benchmarkReturnBasis };
}

/**
 * Just the fund-value components, with none of the trailing-return/benchmark
 * work getFundOverview does. Used by the price-refresh cron to write today's
 * fund_value_history row cheaply — that route already spends most of its
 * ~60s budget on Twelve Data's rate limit, with no room left for the extra
 * (and here, unneeded) historical-price lookups computeReturns makes.
 */
export async function getCurrentFundValue(): Promise<{
  fundValue: number;
  investedValue: number;
  cashBalance: number;
}> {
  const [rows, cashBalance] = await Promise.all([getHoldingRows(), getCashBalance()]);
  const investedValue = rows.reduce((s, r) => s + r.marketValue, 0);
  return { fundValue: investedValue + cashBalance, investedValue, cashBalance };
}

export async function getFundOverview(): Promise<FundOverview> {
  const [rows, strategies, meta, snapshots, cashBalance, history] = await Promise.all([
    getHoldingRows(),
    getStrategies(),
    getMeta(),
    getSnapshots(),
    getCashBalance(),
    getFundValueHistory(),
  ]);

  const investedValue = rows.reduce((s, r) => s + r.marketValue, 0);
  const fundValue = investedValue + cashBalance;
  const totalCostBasis = rows.reduce((s, r) => s + r.costBasis, 0);
  const totalGainAbs = investedValue - totalCostBasis;
  const totalGainPct = totalCostBasis > 0 ? (totalGainAbs / totalCostBasis) * 100 : 0;

  const allocations: StrategyAllocation[] = strategies.map((strategy) => {
    const marketValue = rows
      .filter((r) => r.strategyId === strategy.id)
      .reduce((s, r) => s + r.marketValue, 0);
    const weightPct = fundValue > 0 ? (marketValue / fundValue) * 100 : 0;
    const status: StrategyAllocation["status"] =
      weightPct < strategy.targetMinPct
        ? "under"
        : weightPct > strategy.targetMaxPct
          ? "over"
          : "in-range";
    return { strategy, marketValue, weightPct, status };
  });

  const historical = snapshots
    .filter((s) => s.year < new Date().getFullYear())
    .map((s) => ({ year: s.year, value: s.totalValue, live: false }));
  const aum = [
    ...historical,
    { year: new Date().getFullYear(), value: Math.round(fundValue), live: true },
  ];

  const { fundTrailingReturnPct, fundReturnBasis, benchmarkTrailingReturnPct, benchmarkReturnBasis } =
    await computeReturns(fundValue, totalGainPct, meta, history, rows);

  return {
    fundValue,
    investedValue,
    cashBalance,
    cashWeightPct: fundValue > 0 ? (cashBalance / fundValue) * 100 : 0,
    totalCostBasis,
    totalGainAbs,
    totalGainPct,
    fundTrailingReturnPct,
    fundReturnBasis,
    benchmarkTrailingReturnPct,
    benchmarkReturnBasis,
    outperformancePct: fundTrailingReturnPct - benchmarkTrailingReturnPct,
    allocations,
    aum,
  };
}
