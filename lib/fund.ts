// Derived fund figures. Everything here is computed from the store + the mock
// price service; nothing is persisted.

import { getQuotes } from "./prices";
import {
  getHoldings,
  getMeta,
  getSnapshots,
  getStrategies,
} from "./store";
import type { Holding, Strategy } from "./types";

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

export interface FundOverview {
  fundValue: number;
  investedValue: number;
  cashBalance: number;
  cashWeightPct: number;
  totalCostBasis: number;
  totalGainAbs: number;
  totalGainPct: number;
  fundTrailingReturnPct: number;
  benchmarkTrailingReturnPct: number;
  outperformancePct: number;
  allocations: StrategyAllocation[];
  aum: { year: number; value: number; live: boolean }[];
}

export async function getHoldingRows(): Promise<HoldingRow[]> {
  const [holdings, strategies, meta] = await Promise.all([
    getHoldings(),
    getStrategies(),
    getMeta(),
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

  const fundValue =
    withValues.reduce((sum, r) => sum + r.marketValue, 0) + meta.cashBalance;

  return withValues
    .map((r) => ({ ...r, weightPct: fundValue > 0 ? (r.marketValue / fundValue) * 100 : 0 }))
    .sort(
      (a, b) =>
        a.strategy.name.localeCompare(b.strategy.name) || b.marketValue - a.marketValue,
    );
}

export async function getFundOverview(): Promise<FundOverview> {
  const [rows, strategies, meta, snapshots] = await Promise.all([
    getHoldingRows(),
    getStrategies(),
    getMeta(),
    getSnapshots(),
  ]);

  const investedValue = rows.reduce((s, r) => s + r.marketValue, 0);
  const fundValue = investedValue + meta.cashBalance;
  const totalCostBasis = rows.reduce((s, r) => s + r.costBasis, 0);
  const totalGainAbs = investedValue - totalCostBasis;

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

  return {
    fundValue,
    investedValue,
    cashBalance: meta.cashBalance,
    cashWeightPct: fundValue > 0 ? (meta.cashBalance / fundValue) * 100 : 0,
    totalCostBasis,
    totalGainAbs,
    totalGainPct: totalCostBasis > 0 ? (totalGainAbs / totalCostBasis) * 100 : 0,
    fundTrailingReturnPct: meta.fundTrailingReturnPct,
    benchmarkTrailingReturnPct: meta.benchmarkTrailingReturnPct,
    outperformancePct: meta.fundTrailingReturnPct - meta.benchmarkTrailingReturnPct,
    allocations,
    aum,
  };
}
