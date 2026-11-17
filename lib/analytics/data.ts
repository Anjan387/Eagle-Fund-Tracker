// Builds everything the Analytics page shows, from the price history the
// tracker already caches plus the assumptions in content/analytics.ts.
//
// Two views of the portfolio are used, on purpose:
//
//   "Today's mix"   today's weights applied to every past day. This is the
//                   forward-looking view: all risk numbers, betas and stress
//                   tests use it, so they describe the portfolio as it is now.
//
//   "These shares"  today's share counts priced on every past day. This is the
//                   backward-looking view: returns, Sharpe, drawdown and
//                   attribution use it. The trade ledger shows no net position
//                   change since `stableSince`, so from that date it is how the
//                   fund's actual positions moved.
//
// Prices are closes without dividends, so every return is a price return.
// Sharpe, Sortino and alpha add each holding's known yield back as a steady
// daily accrual, because the risk-free rate they are compared with is a total
// return.

import "server-only";
import { cache } from "react";
import {
  ASSET_CLASS,
  ASSET_CLASS_LABEL,
  BENCHMARK,
  BENCHMARK_LEG,
  DURATION_YEARS,
  FACTORS,
  HEDGE_ASSUMPTIONS,
  IPS_LIMITS,
  MARKET,
  RISK_FREE,
  type AssetClass,
} from "@/content/analytics";
import { REBUILD_DATE } from "@/lib/fund";
import { getSeries, knownCompanyName, knownYield } from "@/lib/prices";
import { getCashBalance, getHoldings, getProposals, getStrategies, getTrades } from "@/lib/store";
import { WATCHLIST } from "@/lib/tickers";
import type { PricePoint, Proposal } from "@/lib/types";
import { snapshot, tradeImpact, type RiskBase, type TradeResult, type WindowKey } from "./engine";
import {
  TRADING_DAYS,
  annualVol,
  compound,
  correlation,
  covMatrix,
  drawdown,
  matVec,
  mean,
  ols,
  olsMulti,
  quadForm,
  rollingVol,
  sharpe,
  sortino,
  toReturns,
  valueAtRisk,
} from "./math";

export const ROLLING_DAYS = 30;
const MIN_RETURNS = 20;

export interface HoldingStat {
  ticker: string;
  name: string;
  sleeveId: string;
  sleeveName: string;
  assetClass: AssetClass;
  shares: number;
  price: number;
  value: number;
  weightPct: number;
  /** annualized volatility, % */
  volPct: number;
  /** beta to the market, with its standard error */
  beta: number;
  betaSe: number;
  /** beta measured only on days the market fell */
  betaDown: number;
  /** correlation with the whole fund */
  corrFund: number;
  /** share of the fund's variance this position accounts for, % (can be negative) */
  riskPct: number;
  /** average return on the market's worst days in the window, % */
  worstDayAvgPct: number;
  /** return over the deepest market drawdown in the price history, %, and the beta it implies */
  crashRetPct: number | null;
  crashBeta: number | null;
  durationYears: number;
  yieldPct: number;
  hedgeCurve: { spDrop: number; ret: number }[] | null;
  /** price return of the position over the window, % */
  windowRetPct: number;
  /** its contribution to the fund's return over the window, in percentage points */
  contribPts: number;
}

export interface SleeveStat {
  id: string;
  name: string;
  min: number;
  max: number;
  weightPct: number;
  status: "under" | "in-range" | "over";
  riskPct: number;
  startWeightPct: number;
  retPct: number;
  contribPts: number;
}

export interface PerfStats {
  /** cumulative price return over the window, % */
  retPct: number;
  volPct: number;
  sharpe: number;
  sharpeSe: number;
  sortino: number;
  maxDdPct: number;
  ddPeak: string;
  ddTrough: string;
  currentDdPct: number;
  bestDayPct: number;
  worstDayPct: number;
  yieldPct: number;
}

export interface AttributionRow {
  cls: AssetClass;
  label: string;
  /** start-of-window weights and window returns, % */
  wp: number;
  wb: number;
  rp: number | null;
  rb: number | null;
  /** effects in percentage points */
  allocation: number;
  selection: number;
  interaction: number;
  total: number;
}

export interface FactorFit {
  rows: { id: string; label: string; meaning: string; beta: number; se: number; t: number }[];
  r2: number;
  /** annualized intercept, % */
  alphaPct: number;
  n: number;
}

export interface ProposalImpact {
  proposalId: string;
  result: TradeResult | { ok: false; reason: string };
}

export interface LimitReading {
  id: string;
  label: string;
  ips: string;
  /** current reading and limit, in % */
  value: number;
  limit: number | null;
  /** "max": breach when value > limit; "min": breach when value < limit */
  kind: "max" | "min";
  detail: string;
}

export interface AnalyticsModel {
  ok: true;
  window: {
    key: WindowKey;
    start: string;
    end: string;
    /** number of daily returns */
    days: number;
    /** how many of them fall on or before `stableSince` (positions differed then) */
    hypotheticalDays: number;
  };
  stableSince: string;
  rebuildDate: string;
  fundValue: number;
  cash: number;
  cashPct: number;
  /** open holdings with no usable price history; left out of every number */
  uncovered: { ticker: string; shares: number }[];
  holdings: HoldingStat[];
  sleeves: SleeveStat[];
  risk: {
    volPct: number;
    benchVolPct: number;
    marketVolPct: number;
    beta: number;
    betaSe: number;
    betaDown: number;
    downDays: number;
    crashBeta: number | null;
    benchBeta: number;
    benchBetaDown: number;
    benchCrashBeta: number | null;
    tePct: number;
    var95Pct: number;
    es95Pct: number;
    diversificationRatio: number;
    effectiveN: number;
    top5Pct: number;
    largest: { ticker: string; pct: number };
    rolling: { date: string; fund: number | null; bench: number | null }[];
    corr: { tickers: string[]; matrix: number[][] };
  };
  hedge: {
    worstDays: number;
    marketAvgPct: number;
    fundAvgPct: number;
    benchAvgPct: number;
    crash: { start: string; end: string; marketPct: number; fundPct: number; benchPct: number } | null;
  };
  perf: {
    rfAnnualPct: number;
    rfSource: string;
    fund: PerfStats;
    bench: PerfStats;
    marketRetPct: number;
    active: {
      excessPts: number;
      tePct: number;
      infoRatio: number;
      alphaPct: number;
      beta: number;
      upCapture: number | null;
      downCapture: number | null;
      hitRatePct: number;
    };
    series: { date: string; fund: number; bench: number; fundDd: number; benchDd: number }[];
  };
  attribution: {
    rows: AttributionRow[];
    fundRetPct: number;
    benchRetPct: number;
    allocation: number;
    selection: number;
    interaction: number;
  };
  factors: {
    fund: FactorFit | null;
    equity: FactorFit | null;
    /** factor ETFs with no usable prices yet */
    missing: string[];
  };
  base: RiskBase;
  proposals: ProposalImpact[];
  limits: LimitReading[];
}

export type Analytics = AnalyticsModel | { ok: false; reason: string };

const pct = (x: number) => x * 100;

function seriesMap(series: PricePoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of series) if (p.close > 0) m.set(p.date, p.close);
  return m;
}

/** The last day the ledger shows the fund's positions changing. */
async function positionsStableSince(openedDates: string[]): Promise<string> {
  const trades = await getTrades();
  const net = new Map<string, number>();
  for (const t of trades) {
    const k = `${t.tradeDate}|${t.ticker}`;
    net.set(k, (net.get(k) ?? 0) + (t.action === "buy" ? t.shares : -t.shares));
  }
  let last = "";
  // offsetting corrections on the same day net to zero and are not a change
  for (const [k, v] of net) if (Math.abs(v) > 1e-9 && k.slice(0, 10) > last) last = k.slice(0, 10);
  for (const d of openedDates) if (d > last) last = d;
  return last;
}

function perfStats(dates: string[], index: number[], excess: number[], returns: number[], yieldPct: number): PerfStats {
  const dd = drawdown(index);
  const sh = sharpe(excess);
  return {
    retPct: pct(index[index.length - 1] / index[0] - 1),
    volPct: pct(annualVol(returns)),
    sharpe: sh.ratio,
    sharpeSe: sh.se,
    sortino: sortino(excess),
    maxDdPct: pct(dd.max),
    ddPeak: dates[dd.peakIndex],
    ddTrough: dates[dd.troughIndex],
    currentDdPct: pct(dd.current),
    bestDayPct: pct(Math.max(...returns)),
    worstDayPct: pct(Math.min(...returns)),
    yieldPct,
  };
}

async function build(windowKey: WindowKey): Promise<Analytics> {
  const [rows, strategies, cash, proposals] = await Promise.all([
    getHoldings(),
    getStrategies(),
    getCashBalance(),
    getProposals(),
  ]);
  const held = rows.filter((r) => r.shares > 0);
  if (held.length === 0) return { ok: false, reason: "The fund has no open holdings to analyze." };
  const pending = proposals.filter((p) => p.status === "pending");

  // ---- load price history ----------------------------------------------------
  const benchTickers = BENCHMARK.map((b) => b.ticker);
  const factorTickers = [...new Set(FACTORS.flatMap((f) => (f.short ? [f.long, f.short] : [f.long])))];
  const heldTickers = [...new Set(held.map((r) => r.ticker))];
  const extras = [...new Set([RISK_FREE.proxyTicker, ...WATCHLIST, ...pending.map((p) => p.ticker.toUpperCase())])];
  const all = [...new Set([...heldTickers, ...benchTickers, MARKET.ticker, ...extras, ...factorTickers])];
  const loaded = await Promise.all(all.map((t) => getSeries(t).catch(() => [] as PricePoint[])));
  const px = new Map(all.map((t, i) => [t, seriesMap(loaded[i])]));
  const has = (t: string) => (px.get(t)?.size ?? 0) > MIN_RETURNS;

  for (const t of [...benchTickers, MARKET.ticker]) {
    if (!has(t)) return { ok: false, reason: `No price history for ${t} yet, which the analytics need.` };
  }
  const covered = held.filter((r) => has(r.ticker));
  const uncovered = held.filter((r) => !has(r.ticker)).map((r) => ({ ticker: r.ticker, shares: r.shares }));
  if (covered.length === 0) return { ok: false, reason: "None of the holdings have price history yet." };

  // ---- common dates, then the window -------------------------------------------
  const core = [...new Set([...covered.map((r) => r.ticker), ...benchTickers, MARKET.ticker])];
  // (getSeries returns only each ticker's recent unbroken run of days, never
  // the isolated old closes the stress tests keep, so no return here spans a gap.)
  const allDates = [...px.get(core[0])!.keys()].filter((d) => core.every((t) => px.get(t)!.has(d))).sort();
  let dates = allDates;
  if (windowKey === "rebuild") dates = allDates.filter((d) => d >= REBUILD_DATE);
  if (windowKey === "6m") dates = allDates.slice(-(TRADING_DAYS / 2 + 1));
  if (windowKey === "1y") dates = allDates.slice(-(TRADING_DAYS + 1));
  if (dates.length < MIN_RETURNS + 1) {
    return { ok: false, reason: "Not enough overlapping price history for this window yet." };
  }
  const T = dates.length;
  const retDates = dates.slice(1);
  const closes = (t: string, ds: string[] = dates) => ds.map((d) => px.get(t)!.get(d)!);

  // ---- the universe: everything with a price on every day of the window ----------
  const universe = [
    ...core,
    ...extras.filter((t) => !core.includes(t) && has(t) && dates.every((d) => px.get(t)!.has(d))),
  ];
  const N = universe.length;
  const ix = new Map(universe.map((t, i) => [t, i]));
  const P = universe.map((t) => closes(t));
  const R = P.map(toReturns);
  const cov = covMatrix(R);
  const mIdx = ix.get(MARKET.ticker)!;
  const rMkt = R[mIdx];

  // ---- positions ---------------------------------------------------------------------
  const sharesVec = new Array<number>(N).fill(0);
  const sleeveVec = new Array<string | null>(N).fill(null);
  for (const r of covered) {
    const i = ix.get(r.ticker)!;
    sharesVec[i] += r.shares;
    sleeveVec[i] = r.strategyId;
  }
  const lastPrice = P.map((p) => p[T - 1]);
  const benchVec = universe.map((t) => BENCHMARK.find((b) => b.ticker === t)?.weight ?? 0);

  const base: RiskBase = {
    asOf: dates[T - 1],
    tickers: universe,
    names: universe.map((t) => knownCompanyName(t) ?? t),
    cov,
    price: lastPrice,
    shares: sharesVec,
    sleeve: sleeveVec,
    cash,
    bench: benchVec,
    market: mIdx,
    sleeves: strategies.map((s) => ({ id: s.id, name: s.name, min: s.targetMinPct, max: s.targetMaxPct })),
  };
  const now = snapshot(base);
  const w = now.weights;
  const fundValue = now.value;

  // ---- "today's mix": today's weights on every past day ---------------------------------
  const rMix = retDates.map((_, t) => w.reduce((s, wi, i) => (wi ? s + wi * R[i][t] : s), 0));
  const rBenchMix = retDates.map((_, t) => benchVec.reduce((s, b, i) => (b ? s + b * R[i][t] : s), 0));

  const mixVsMkt = ols(rMix, rMkt);
  const benchVsMkt = ols(rBenchMix, rMkt);
  const downIdx = rMkt.map((r, t) => (r < 0 ? t : -1)).filter((t) => t >= 0);
  const pick = (x: number[], idx: number[]) => idx.map((t) => x[t]);
  const mktDown = pick(rMkt, downIdx);
  const betaDownOf = (x: number[]) => ols(pick(x, downIdx), mktDown).beta;

  // the market's worst tenth of days in the window
  const worstCount = Math.max(5, Math.round(retDates.length / 10));
  const worstIdx = rMkt
    .map((r, t) => ({ r, t }))
    .sort((a, b) => a.r - b.r)
    .slice(0, worstCount)
    .map((x) => x.t);

  // the deepest market drawdown anywhere in the price history (not just the window)
  const mktAll = closes(MARKET.ticker, allDates);
  const ddAll = drawdown(mktAll);
  const crash =
    ddAll.max < -0.08
      ? { from: allDates[ddAll.peakIndex], to: allDates[ddAll.troughIndex], market: ddAll.max }
      : null;
  const crashRet = (t: string) => {
    if (!crash) return null;
    const a = px.get(t)!.get(crash.from);
    const b = px.get(t)!.get(crash.to);
    return a && b ? b / a - 1 : null;
  };

  const sigma = Math.sqrt(quadForm(w, cov));
  const covW = matVec(cov, w);

  // ---- "these shares": today's share counts priced on every past day ----------------------
  const fundIdx = dates.map((_, t) => sharesVec.reduce((s, sh, i) => (sh ? s + sh * P[i][t] : s), 0) + cash);
  const benchIdx = dates.map((_, t) =>
    BENCHMARK.reduce((s, b) => s + (b.weight * P[ix.get(b.ticker)!][t]) / P[ix.get(b.ticker)!][0], 0),
  );
  const rFund = toReturns(fundIdx);
  const rBench = toReturns(benchIdx);
  const w0 = sharesVec.map((sh, i) => (sh * P[i][0]) / fundIdx[0]); // start-of-window weights
  const assetRet = P.map((p) => p[T - 1] / p[0] - 1);

  // ---- per-holding statistics -------------------------------------------------------------------
  const stratName = new Map(strategies.map((s) => [s.id, s.name]));
  const holdings: HoldingStat[] = [];
  const seen = new Set<string>();
  for (const r of covered) {
    if (seen.has(r.ticker)) continue; // lots of the same ticker are combined
    seen.add(r.ticker);
    const i = ix.get(r.ticker)!;
    const fit = ols(R[i], rMkt);
    const cr = crashRet(r.ticker);
    holdings.push({
      ticker: r.ticker,
      name: base.names[i],
      sleeveId: r.strategyId,
      sleeveName: stratName.get(r.strategyId) ?? "",
      assetClass: ASSET_CLASS[r.ticker] ?? "equity",
      shares: sharesVec[i],
      price: lastPrice[i],
      value: sharesVec[i] * lastPrice[i],
      weightPct: pct(w[i]),
      volPct: pct(annualVol(R[i])),
      beta: fit.beta,
      betaSe: fit.seBeta,
      betaDown: betaDownOf(R[i]),
      corrFund: correlation(R[i], rMix),
      riskPct: sigma > 0 ? pct((w[i] * covW[i]) / (sigma * sigma)) : 0,
      worstDayAvgPct: pct(mean(pick(R[i], worstIdx))),
      crashRetPct: cr == null ? null : pct(cr),
      crashBeta: cr == null || !crash ? null : cr / crash.market,
      durationYears: DURATION_YEARS[r.ticker] ?? 0,
      yieldPct: pct(knownYield(r.ticker) ?? 0),
      hedgeCurve: HEDGE_ASSUMPTIONS[r.ticker] ?? null,
      windowRetPct: pct(assetRet[i]),
      contribPts: pct(w0[i] * assetRet[i]),
    });
  }
  holdings.sort((a, b) => b.value - a.value);

  const sleeves: SleeveStat[] = now.sleeves.map((s) => {
    const members = holdings.filter((h) => h.sleeveId === s.id);
    const startW = members.reduce((a, h) => a + w0[ix.get(h.ticker)!], 0);
    const contrib = members.reduce((a, h) => a + h.contribPts, 0);
    return {
      id: s.id,
      name: s.name,
      min: s.min,
      max: s.max,
      weightPct: s.pct,
      status: s.status,
      riskPct: members.reduce((a, h) => a + h.riskPct, 0),
      startWeightPct: pct(startW),
      retPct: startW > 0 ? contrib / startW : 0,
      contribPts: contrib,
    };
  });

  // ---- risk ------------------------------------------------------------------------------------
  const active = rMix.map((r, t) => r - rBenchMix[t]);
  const tail = valueAtRisk(rMix, 0.95);
  const sortedW = [...w].sort((a, b) => b - a);
  const crashWeighted = (weights: number[]) => {
    if (!crash) return null;
    let s = 0;
    for (let i = 0; i < N; i++) {
      if (!weights[i]) continue;
      const cr = crashRet(universe[i]);
      if (cr == null) return null;
      s += weights[i] * cr;
    }
    return s;
  };
  const fundCrash = crashWeighted(w);
  const benchCrash = crashWeighted(benchVec);

  const rollFund = rollingVol(rMix, ROLLING_DAYS);
  const rollBench = rollingVol(rBenchMix, ROLLING_DAYS);
  const heldIdx = holdings.map((h) => ix.get(h.ticker)!);

  const risk: AnalyticsModel["risk"] = {
    volPct: now.volPct,
    benchVolPct: pct(annualVol(rBenchMix)),
    marketVolPct: pct(annualVol(rMkt)),
    beta: mixVsMkt.beta,
    betaSe: mixVsMkt.seBeta,
    betaDown: betaDownOf(rMix),
    downDays: downIdx.length,
    crashBeta: fundCrash == null || !crash ? null : fundCrash / crash.market,
    benchBeta: benchVsMkt.beta,
    benchBetaDown: betaDownOf(rBenchMix),
    benchCrashBeta: benchCrash == null || !crash ? null : benchCrash / crash.market,
    tePct: pct(annualVol(active)),
    var95Pct: pct(tail.var),
    es95Pct: pct(tail.es),
    diversificationRatio:
      sigma > 0 ? w.reduce((s, wi, i) => (wi ? s + wi * Math.sqrt(cov[i][i]) : s), 0) / sigma : 0,
    effectiveN: now.effectiveN,
    top5Pct: pct(sortedW.slice(0, 5).reduce((a, b) => a + b, 0)),
    largest: now.largest,
    rolling: retDates
      .map((date, t) => ({
        date,
        fund: rollFund[t] == null ? null : pct(rollFund[t]!),
        bench: rollBench[t] == null ? null : pct(rollBench[t]!),
      }))
      .filter((p) => p.fund != null),
    corr: {
      tickers: holdings.map((h) => h.ticker),
      matrix: heldIdx.map((i) => heldIdx.map((j) => (i === j ? 1 : correlation(R[i], R[j])))),
    },
  };

  const hedge: AnalyticsModel["hedge"] = {
    worstDays: worstCount,
    marketAvgPct: pct(mean(pick(rMkt, worstIdx))),
    fundAvgPct: pct(mean(pick(rMix, worstIdx))),
    benchAvgPct: pct(mean(pick(rBenchMix, worstIdx))),
    crash:
      crash && fundCrash != null && benchCrash != null
        ? { start: crash.from, end: crash.to, marketPct: pct(crash.market), fundPct: pct(fundCrash), benchPct: pct(benchCrash) }
        : null,
  };

  // ---- performance ---------------------------------------------------------------------------------
  const rfIdx = ix.get(RISK_FREE.proxyTicker);
  let rfDaily = Math.pow(1 + RISK_FREE.fallbackAnnualPct / 100, 1 / TRADING_DAYS) - 1;
  let rfSource = `assumed ${RISK_FREE.fallbackAnnualPct.toFixed(1)}%`;
  if (rfIdx != null) {
    const g = P[rfIdx][T - 1] / P[rfIdx][0];
    if (g > 0.9 && g < 1.3) {
      rfDaily = Math.pow(g, 1 / (T - 1)) - 1;
      rfSource = `${RISK_FREE.proxyTicker} price return`;
    }
  }
  const yieldOf = (weights: number[]) =>
    weights.reduce((s, wi, i) => (wi ? s + wi * (knownYield(universe[i]) ?? 0) : s), 0);
  const fundYield = yieldOf(w);
  const benchYield = yieldOf(benchVec);
  const exFund = rFund.map((r) => r + fundYield / TRADING_DAYS - rfDaily);
  const exBench = rBench.map((r) => r + benchYield / TRADING_DAYS - rfDaily);
  const jensen = ols(exFund, exBench);
  const activeBh = rFund.map((r, t) => r - rBench[t]);
  const upDays = rBench.map((r, t) => (r > 0 ? t : -1)).filter((t) => t >= 0);
  const dnDays = rBench.map((r, t) => (r < 0 ? t : -1)).filter((t) => t >= 0);
  const capture = (idx: number[]) => {
    const b = mean(pick(rBench, idx));
    return idx.length >= 5 && b !== 0 ? mean(pick(rFund, idx)) / b : null;
  };
  const fundPerf = perfStats(dates, fundIdx, exFund, rFund, pct(fundYield));
  const benchPerf = perfStats(dates, benchIdx, exBench, rBench, pct(benchYield));
  const teBh = annualVol(activeBh);
  const fundDd = drawdown(fundIdx).series;
  const benchDd = drawdown(benchIdx).series;

  const perf: AnalyticsModel["perf"] = {
    rfAnnualPct: pct(Math.pow(1 + rfDaily, TRADING_DAYS) - 1),
    rfSource,
    fund: fundPerf,
    bench: benchPerf,
    marketRetPct: pct(compound(rMkt)),
    active: {
      excessPts: fundPerf.retPct - benchPerf.retPct,
      tePct: pct(teBh),
      infoRatio: teBh > 0 ? (mean(activeBh) * TRADING_DAYS) / teBh : 0,
      alphaPct: pct(jensen.alpha * TRADING_DAYS),
      beta: jensen.beta,
      upCapture: capture(upDays),
      downCapture: capture(dnDays),
      hitRatePct: pct(activeBh.filter((a) => a > 0).length / activeBh.length),
    },
    series: dates.map((date, t) => ({
      date,
      fund: (fundIdx[t] / fundIdx[0]) * 100,
      bench: (benchIdx[t] / benchIdx[0]) * 100,
      fundDd: pct(fundDd[t]),
      benchDd: pct(benchDd[t]),
    })),
  };

  // ---- Brinson-Fachler attribution by asset class ----------------------------------------------------
  // One period, with start-of-window weights held to the end, so the effects
  // add up exactly to the fund's return minus the benchmark's.
  const fundRet = fundIdx[T - 1] / fundIdx[0] - 1;
  const benchRet = benchIdx[T - 1] / benchIdx[0] - 1;
  const classes: AssetClass[] = ["equity", "bonds", "alternatives", "cash"];
  const attributionRows: AttributionRow[] = classes.map((cls) => {
    const members = holdings.filter((h) => h.assetClass === cls).map((h) => ix.get(h.ticker)!);
    let wp = members.reduce((s, i) => s + w0[i], 0);
    const contrib = members.reduce((s, i) => s + w0[i] * assetRet[i], 0);
    if (cls === "cash") wp += cash / fundIdx[0]; // ledger cash earns nothing here
    const rp = wp > 0 ? contrib / wp : null;
    const leg = BENCHMARK_LEG[cls];
    const legWeight = leg ? (BENCHMARK.find((b) => b.ticker === leg)?.weight ?? 0) : 0;
    const wb = legWeight;
    // A class the benchmark does not hold has no benchmark return of its own;
    // by convention it is given the fund's return there, which makes the whole
    // effect of holding it an allocation effect.
    const rb = wb > 0 ? assetRet[ix.get(leg!)!] : rp;
    const rpEff = rp ?? rb ?? benchRet;
    const rbEff = rb ?? benchRet;
    const allocation = (wp - wb) * (rbEff - benchRet);
    const selection = wb * (rpEff - rbEff);
    const interaction = (wp - wb) * (rpEff - rbEff);
    return {
      cls,
      label: ASSET_CLASS_LABEL[cls],
      wp: pct(wp),
      wb: pct(wb),
      rp: rp == null ? null : pct(rp),
      rb: wb > 0 ? pct(rbEff) : null,
      allocation: pct(allocation),
      selection: pct(selection),
      interaction: pct(interaction),
      total: pct(allocation + selection + interaction),
    };
  });
  const attribution: AnalyticsModel["attribution"] = {
    rows: attributionRows,
    fundRetPct: pct(fundRet),
    benchRetPct: pct(benchRet),
    allocation: attributionRows.reduce((s, r) => s + r.allocation, 0),
    selection: attributionRows.reduce((s, r) => s + r.selection, 0),
    interaction: attributionRows.reduce((s, r) => s + r.interaction, 0),
  };

  // ---- style factors ---------------------------------------------------------------------------------
  const missingFactors = factorTickers.filter((t) => !has(t));
  let fundFit: FactorFit | null = null;
  let equityFit: FactorFit | null = null;
  if (missingFactors.length === 0) {
    const fDates = dates.filter((d) => factorTickers.every((t) => px.get(t)!.has(d)));
    if (fDates.length > 60) {
      const ret = (t: string) => toReturns(closes(t, fDates));
      const factorRets = FACTORS.map((f) => {
        const long = ret(f.long);
        if (!f.short) return long;
        const short = ret(f.short);
        return long.map((r, t) => r - short[t]);
      });
      const heldRets = holdings.map((h) => ret(h.ticker));
      const fit = (weights: number[]): FactorFit | null => {
        const y = factorRets[0].map((_, t) => weights.reduce((s, wi, k) => (wi ? s + wi * heldRets[k][t] : s), 0));
        const m = olsMulti(y, factorRets);
        if (!m) return null;
        return {
          rows: FACTORS.map((f, k) => ({
            id: f.id,
            label: f.label,
            meaning: f.meaning,
            beta: m.betas[k],
            se: m.se[k],
            t: m.tStats[k],
          })),
          r2: m.r2,
          alphaPct: pct(m.alpha * TRADING_DAYS),
          n: m.n,
        };
      };
      // the whole fund keeps its cash drag (weights of total fund value);
      // the equity book is rescaled to 100% so its betas read on their own
      fundFit = fit(holdings.map((h) => h.weightPct / 100));
      const equityTotal = holdings.reduce((s, h) => (h.assetClass === "equity" ? s + h.weightPct : s), 0);
      equityFit =
        equityTotal > 0 ? fit(holdings.map((h) => (h.assetClass === "equity" ? h.weightPct / equityTotal : 0))) : null;
    }
  }

  // ---- pending proposals ---------------------------------------------------------------------------------
  const proposalImpacts: ProposalImpact[] = pending.map((p: Proposal) => ({
    proposalId: p.id,
    result: tradeImpact(base, { ticker: p.ticker, action: p.action, shares: p.shares, strategyId: p.strategyId }),
  }));

  // ---- IPS limits ---------------------------------------------------------------------------------------
  const limits: LimitReading[] = [
    {
      id: "position",
      label: "Largest single position",
      ips: "IPS 8.1",
      value: now.largest.pct,
      limit: IPS_LIMITS.maxPositionPct,
      kind: "max",
      detail: `${now.largest.ticker} is the largest holding.`,
    },
    {
      id: "drawdown",
      label: "Drawdown from peak",
      ips: "IPS 3.2",
      value: -fundPerf.currentDdPct,
      limit: IPS_LIMITS.maxDrawdownPct,
      kind: "max",
      detail: `Deepest in this window: ${(-fundPerf.maxDdPct).toFixed(1)}%.`,
    },
    {
      id: "te",
      label: "Tracking error vs benchmark",
      ips: "IPS 3.2",
      value: risk.tePct,
      limit: IPS_LIMITS.maxTrackingErrorPct,
      kind: "max",
      detail: "Annualized, today's mix.",
    },
    {
      id: "cash",
      label: "Cash",
      ips: "IPS 8.4",
      value: now.cashPct,
      limit: IPS_LIMITS.minCashPct,
      kind: "min",
      detail: "Ledger cash as a share of the fund.",
    },
  ];

  const stableSince = await positionsStableSince(held.map((r) => r.openedDate));

  return {
    ok: true,
    window: {
      key: windowKey,
      start: dates[0],
      end: dates[T - 1],
      days: retDates.length,
      hypotheticalDays: retDates.filter((d) => d <= stableSince).length,
    },
    stableSince,
    rebuildDate: REBUILD_DATE,
    fundValue,
    cash,
    cashPct: now.cashPct,
    uncovered,
    holdings,
    sleeves,
    risk,
    hedge,
    perf,
    attribution,
    factors: { fund: fundFit, equity: equityFit, missing: missingFactors },
    base,
    proposals: proposalImpacts,
    limits,
  };
}

/** Everything for the Analytics page; computed once per request per window. */
export const loadAnalytics = cache(build);

/** Tickers the analytics use that the nightly refresh does not already cover. */
export function analyticsOnlyTickers(): string[] {
  return [
    ...new Set([
      ...BENCHMARK.map((b) => b.ticker),
      MARKET.ticker,
      RISK_FREE.proxyTicker,
      ...FACTORS.flatMap((f) => (f.short ? [f.long, f.short] : [f.long])),
    ]),
  ];
}

