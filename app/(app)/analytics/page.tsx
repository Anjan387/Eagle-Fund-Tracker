import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import type { ReactNode } from "react";
import {
  ASSET_CLASS_LABEL,
  BENCHMARK,
  DURATION_YEARS,
  FACTORS,
  HEDGE_ASSUMPTIONS,
  MARKET,
  PROXIES,
  type AssetClass,
} from "@/content/analytics";
import { requireUser } from "@/lib/auth";
import { ROLLING_DAYS, analyticsOnlyTickers, loadAnalytics, type AnalyticsModel, type FactorFit } from "@/lib/analytics/data";
import { WINDOWS, type WindowKey } from "@/lib/analytics/engine";
import { loadEpisodes, type EpisodeResult } from "@/lib/analytics/episodes";
import { longDate, money, signedPct } from "@/lib/format";
import { refreshDaily } from "@/lib/prices";
import { getProposals } from "@/lib/store";
import { FundVsBenchChart } from "@/components/analytics/FundVsBenchChart";
import { ImpactTable } from "@/components/analytics/ImpactTable";
import { RatesLab } from "@/components/analytics/RatesLab";
import { ShockLab } from "@/components/analytics/ShockLab";
import { WhatIf } from "@/components/analytics/WhatIf";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatTile, cn } from "@/components/ui";

// Risk, stress tests, performance and what-if tools for the fund. All of the
// numbers come from lib/analytics; the hand-kept assumptions behind them are
// in content/analytics.ts. This file only lays them out.

export const metadata: Metadata = { title: "Analytics · Eagle Fund" };

// The stress tab may fetch a few old prices from the market-data API the first
// time a new holding appears; give it room.
export const maxDuration = 60;

const TABS = [
  { key: "risk", label: "Risk" },
  { key: "stress", label: "Stress tests" },
  { key: "performance", label: "Performance" },
  { key: "exposures", label: "Exposures" },
  { key: "whatif", label: "What-if" },
  { key: "limits", label: "Limits" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** Signed percent; a value that rounds to zero is shown as plain zero, never "-0.0%". */
const sp = (n: number, d = 1) => {
  const r = Number(n.toFixed(d));
  return r === 0 ? `${(0).toFixed(d)}%` : signedPct(r, d);
};
/** Plain percent to one decimal, with no "-0.0%". */
const p1 = (n: number) => {
  const r = Number(n.toFixed(1));
  return `${(r === 0 ? 0 : r).toFixed(1)}%`;
};
/** A risk share small enough to print as zero is not treated as a hedge. */
const lowersRisk = (riskPct: number) => riskPct <= -0.05;
/** Signed percentage points. */
const pts = (n: number, d = 2) => `${sp(n, d).slice(0, -1)} pts`;
const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;
const tone = (n: number) => (n >= 0.005 ? "text-pos" : n <= -0.005 ? "text-neg" : "text-ink");

const th = "px-3 py-2 font-medium";
const thR = "px-3 py-2 text-right font-medium";
const td = "px-3 py-2 text-right tnum";

function Table({ min = "40rem", head, children }: { min?: string; head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm" style={{ minWidth: min }}>
        <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">{head}</thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

function TickerCell({ ticker, sub }: { ticker: string; sub?: string }) {
  return (
    <th scope="row" className="px-3 py-2 text-left font-normal">
      <span className="font-mono text-[13px] font-semibold text-ink">{ticker}</span>
      {sub ? <span className="ml-2 text-xs text-faint">{sub}</span> : null}
    </th>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-faint">{children}</p>;
}

function Mini({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tnum">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted tnum">{sub}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- risk */

function RiskTab({ a }: { a: AnalyticsModel }) {
  const byRisk = [...a.holdings].sort((x, y) => y.riskPct - x.riskPct);
  const scale = Math.max(...a.holdings.map((h) => Math.max(h.weightPct, Math.abs(h.riskPct))), 1);
  const { tickers, matrix } = a.risk.corr;

  return (
    <>
      <Card>
        <CardHeader
          title={`Volatility over time (rolling ${ROLLING_DAYS} trading days)`}
          description="How much today's mix of holdings would have swung, annualized, against the 80/20 benchmark."
        />
        <div className="px-3 py-4">
          <FundVsBenchChart data={a.risk.rolling} unit="pct" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Where the risk comes from"
          description="Each holding's share of the fund's money against its share of the fund's risk. A holding that takes more risk than money is driving the swings."
        />
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-line-strong" /> Share of money
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-brand" /> Share of risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-pos" /> Lowers risk
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {byRisk.map((h) => (
              <div key={h.ticker} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3">
                <span className="font-mono text-[13px] font-semibold text-ink">{h.ticker}</span>
                <div className="flex flex-col gap-0.5">
                  <div className="h-2 rounded-sm bg-line-strong" style={{ width: `${Math.max((h.weightPct / scale) * 100, 0.5)}%` }} />
                  <div
                    className={cn("h-2 rounded-sm", lowersRisk(h.riskPct) ? "bg-pos" : "bg-brand")}
                    style={{ width: `${Math.max((Math.abs(h.riskPct) / scale) * 100, 0.5)}%` }}
                  />
                </div>
                <span className="text-right text-xs text-muted tnum">
                  {h.weightPct.toFixed(1)}% <span className="text-faint">→</span>{" "}
                  <span className="font-medium text-ink">{p1(h.riskPct)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-4">
            <Table
              min="30rem"
              head={
                <tr>
                  <th scope="col" className={th}>Sleeve</th>
                  <th scope="col" className={thR}>Share of money</th>
                  <th scope="col" className={thR}>Share of risk</th>
                </tr>
              }
            >
              {a.sleeves.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{s.name}</th>
                  <td className={cn(td, "text-muted")}>{s.weightPct.toFixed(1)}%</td>
                  <td className={cn(td, "font-medium text-ink")}>{s.riskPct.toFixed(1)}%</td>
                </tr>
              ))}
            </Table>
          </div>
          <Note>
            Risk share is each position&apos;s contribution to the fund&apos;s variance: its weight times its covariance
            with the whole fund. The shares add to 100%. A negative share means the holding tends to move against
            the rest and lowers total risk.
          </Note>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Mini label="Largest position" value={`${a.risk.largest.pct.toFixed(1)}%`} sub={a.risk.largest.ticker} />
        <Mini label="Top five positions" value={`${a.risk.top5Pct.toFixed(1)}%`} sub="of the fund" />
        <Mini
          label="Effective positions"
          value={a.risk.effectiveN.toFixed(1)}
          sub={`of ${a.holdings.length} held; equal weights would give ${a.holdings.length}`}
        />
        <Mini
          label="Diversification ratio"
          value={a.risk.diversificationRatio.toFixed(2)}
          sub="average holding volatility ÷ fund volatility"
        />
        <Mini
          label="1-day value at risk (95%)"
          value={money((a.risk.var95Pct / 100) * a.fundValue)}
          sub={`${a.risk.var95Pct.toFixed(2)}% of the fund; about 1 day in 20 was worse`}
        />
        <Mini
          label="Expected shortfall (95%)"
          value={money((a.risk.es95Pct / 100) * a.fundValue)}
          sub={`${a.risk.es95Pct.toFixed(2)}%: the average of those worse days`}
        />
      </div>

      <Card>
        <CardHeader title="Risk by holding" description={`Measured against the ${MARKET.label}, over the window above.`} />
        <div className="px-5 py-5">
          <Table
            min="52rem"
            head={
              <tr>
                <th scope="col" className={th}>Holding</th>
                <th scope="col" className={thR}>Weight</th>
                <th scope="col" className={thR}>Volatility</th>
                <th scope="col" className={thR}>Beta</th>
                <th scope="col" className={thR}>Down-day beta</th>
                <th scope="col" className={thR}>Corr. to fund</th>
                <th scope="col" className={thR}>Risk share</th>
              </tr>
            }
          >
            {a.holdings.map((h) => (
              <tr key={h.ticker}>
                <TickerCell ticker={h.ticker} sub={h.sleeveName} />
                <td className={cn(td, "text-muted")}>{h.weightPct.toFixed(1)}%</td>
                <td className={cn(td, "text-ink")}>{h.volPct.toFixed(1)}%</td>
                <td className={cn(td, "text-ink")}>
                  {h.beta.toFixed(2)} <span className="text-xs text-faint">±{(2 * h.betaSe).toFixed(2)}</span>
                </td>
                <td className={cn(td, "text-ink")}>{h.betaDown.toFixed(2)}</td>
                <td className={cn(td, "text-ink")}>{h.corrFund.toFixed(2)}</td>
                <td className={cn(td, "font-medium", lowersRisk(h.riskPct) ? "text-pos" : "text-ink")}>{p1(h.riskPct)}</td>
              </tr>
            ))}
          </Table>
          <div className="mt-3">
            <Note>
              Beta is the holding&apos;s move per 1% move in the {MARKET.label}; the ± is two standard errors.
              Down-day beta uses only the {a.risk.downDays} days the market fell.
            </Note>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="How the holdings move together"
          description="Correlation of daily returns. Near +1: they rise and fall together. Near 0: unrelated. Below 0: one tends to rise when the other falls."
        />
        <div className="px-5 py-5">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0.5 text-[11px] tnum">
              <thead>
                <tr>
                  <td />
                  {tickers.map((t) => (
                    <th key={t} scope="col" className="h-14 w-10 align-bottom font-mono font-medium text-muted">
                      <span className="inline-block origin-bottom-left translate-x-5 -rotate-45 whitespace-nowrap">{t}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={tickers[i]}>
                    <th scope="row" className="pr-2 text-right font-mono font-medium text-muted">{tickers[i]}</th>
                    {row.map((c, j) => {
                      const strength = Math.min(Math.abs(c), 1);
                      return (
                        <td
                          key={j}
                          title={`${tickers[i]} and ${tickers[j]}: ${c.toFixed(2)}`}
                          className="h-9 w-10 rounded-sm text-center"
                          style={
                            i === j
                              ? { background: "var(--surface-2)", color: "var(--faint)" }
                              : {
                                  background: `color-mix(in srgb, var(${c >= 0 ? "--brand" : "--neg"}) ${Math.round(strength * 88)}%, var(--surface))`,
                                  color: strength > 0.6 ? "var(--brand-contrast)" : "var(--ink)",
                                }
                          }
                        >
                          {i === j ? "1" : Math.abs(c) < 0.005 ? ".00" : c.toFixed(2).replace(/^(-?)0\./, "$1.")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-brand" /> Move together
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-line bg-surface" /> Unrelated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-neg" /> Move opposite
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}

/* ----------------------------------------------------------------- stress */

function verdict(ratio: number): { label: string; tone: "pos" | "neutral" | "warn" | "neg" } {
  if (ratio < 0) return { label: "Gained", tone: "pos" };
  if (ratio < 0.25) return { label: "Held up", tone: "pos" };
  if (ratio < 0.9) return { label: "Fell less", tone: "neutral" };
  if (ratio <= 1.1) return { label: "Fell in line", tone: "neutral" };
  return { label: "Fell more", tone: "neg" };
}

function Episode({ e, fundValue }: { e: EpisodeResult; fundValue: number }) {
  return (
    <Card>
      <CardHeader
        title={e.name}
        description={`${longDate(e.start)} to ${longDate(e.end)}. ${e.note}`}
        action={e.pending ? <Badge tone="warn">loading prices</Badge> : undefined}
      />
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-2/60 px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Today&apos;s holdings</p>
            <p className={cn("mt-1.5 text-xl font-semibold tracking-tight tnum", e.fundPct == null ? "text-faint" : tone(e.fundPct))}>
              {e.fundPct == null ? "…" : sp(e.fundPct)}
            </p>
            <p className="text-xs text-muted tnum">
              {e.fundUsd == null ? "waiting for prices" : `${signedMoney(e.fundUsd)} on ${money(fundValue)}`}
            </p>
          </div>
          <Mini label="80/20 benchmark" value={e.benchPct == null ? "…" : sp(e.benchPct)} />
          <Mini label={MARKET.label} value={e.marketPct == null ? "…" : sp(e.marketPct)} />
        </div>

        {e.pending ? (
          <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-ink">
            Prices for {e.pending} holding{e.pending === 1 ? "" : "s"} from this period are still being fetched (the
            data plan allows a few lookups a minute). Reload in a minute.
          </p>
        ) : null}

        <p className="text-xs text-muted tnum">
          Priced from: own history {e.coverage.own.toFixed(0)}% of the fund · stand-ins {e.coverage.proxy.toFixed(0)}%
          {e.coverage.flat > 0.05 ? ` · held flat ${e.coverage.flat.toFixed(0)}%` : ""}
          {e.coverage.pending > 0.05 ? ` · loading ${e.coverage.pending.toFixed(0)}%` : ""}
        </p>

        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">
            <span className="group-open:hidden">Show every holding</span>
            <span className="hidden group-open:inline">Hide holdings</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Table
              min="44rem"
              head={
                <tr>
                  <th scope="col" className={th}>Holding</th>
                  <th scope="col" className={thR}>Weight</th>
                  <th scope="col" className={thR}>Return</th>
                  <th scope="col" className={thR}>Dollars</th>
                  <th scope="col" className={th}>Priced from</th>
                </tr>
              }
            >
              {e.rows.map((r) => (
                <tr key={r.ticker}>
                  <TickerCell ticker={r.ticker} sub={r.sleeveName} />
                  <td className={cn(td, "text-muted")}>{r.weightPct.toFixed(1)}%</td>
                  <td className={cn(td, r.retPct == null ? "text-faint" : tone(r.retPct))}>{r.retPct == null ? "…" : sp(r.retPct)}</td>
                  <td className={cn(td, "font-medium", r.usd == null ? "text-faint" : tone(r.usd))}>{r.usd == null ? "…" : signedMoney(r.usd)}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {r.source === "flat" ? <span className="font-medium text-warn">{r.basis}</span> : r.basis}
                  </td>
                </tr>
              ))}
            </Table>
            <Table
              min="24rem"
              head={
                <tr>
                  <th scope="col" className={th}>Sleeve</th>
                  <th scope="col" className={thR}>Contribution to the fund&apos;s return</th>
                </tr>
              }
            >
              {e.sleeves.map((s) => (
                <tr key={s.name}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{s.name}</th>
                  <td className={cn(td, tone(s.pts))}>{pts(s.pts)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </details>
      </div>
    </Card>
  );
}

function StressTab({ a, episodes }: { a: AnalyticsModel; episodes: EpisodeResult[] }) {
  const crash = a.hedge.crash;
  const benchDuration = BENCHMARK.reduce((s, b) => s + b.weight * (DURATION_YEARS[b.ticker] ?? 0), 0);
  return (
    <>
      <Card>
        <CardHeader
          title={`Equity shock: what if the ${MARKET.label} falls?`}
          description="Applied to today's holdings, three ways. Drag the slider or pick a size."
        />
        <ShockLab
          fundValue={a.fundValue}
          marketLabel={MARKET.label}
          holdings={a.holdings.map((h) => ({
            ticker: h.ticker,
            name: h.name,
            sleeveName: h.sleeveName,
            value: h.value,
            weightPct: h.weightPct,
            beta: h.beta,
            betaDown: h.betaDown,
            crashBeta: h.crashBeta,
            hedgeCurve: h.hedgeCurve,
          }))}
          bench={{ beta: a.risk.benchBeta, betaDown: a.risk.benchBetaDown, crashBeta: a.risk.benchCrashBeta }}
          fundBetaSe={a.risk.betaSe}
          crash={crash ? { start: crash.start, end: crash.end, marketPct: crash.marketPct } : null}
        />
      </Card>

      <Card>
        <CardHeader
          title="Did the hedges hedge?"
          description={`How each holding actually behaved on the ${MARKET.label}'s ${a.hedge.worstDays} worst days in this window${
            crash ? `, and through its deepest fall in the price history (${longDate(crash.start)} to ${longDate(crash.end)})` : ""
          }.`}
        />
        <div className="flex flex-col gap-3 px-5 py-5">
          <Table
            min="48rem"
            head={
              <tr>
                <th scope="col" className={th}>Holding</th>
                <th scope="col" className={thR}>Weight</th>
                <th scope="col" className={thR}>Avg. on worst days</th>
                {crash ? <th scope="col" className={thR}>Through the sell-off</th> : null}
                {crash ? <th scope="col" className={thR}>Per 1% of S&amp;P loss</th> : null}
                <th scope="col" className={th}>Verdict</th>
              </tr>
            }
          >
            <tr className="bg-surface-2/60">
              <th scope="row" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">{MARKET.label}</th>
              <td className={td} />
              <td className={cn(td, "font-medium text-ink")}>{sp(a.hedge.marketAvgPct, 2)}</td>
              {crash ? <td className={cn(td, "font-medium text-ink")}>{sp(crash.marketPct)}</td> : null}
              {crash ? <td className={cn(td, "text-muted")}>−1.00%</td> : null}
              <td />
            </tr>
            <tr className="bg-surface-2/60">
              <th scope="row" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">Whole fund</th>
              <td className={cn(td, "text-muted")}>100%</td>
              <td className={cn(td, "font-medium text-ink")}>{sp(a.hedge.fundAvgPct, 2)}</td>
              {crash ? <td className={cn(td, "font-medium text-ink")}>{sp(crash.fundPct)}</td> : null}
              {crash ? <td className={cn(td, "text-muted")}>{sp(-(crash.fundPct / crash.marketPct), 2)}</td> : null}
              <td />
            </tr>
            {[...a.holdings]
              .sort((x, y) => y.worstDayAvgPct - x.worstDayAvgPct)
              .map((h) => {
                const v = verdict(a.hedge.marketAvgPct !== 0 ? h.worstDayAvgPct / a.hedge.marketAvgPct : 0);
                return (
                  <tr key={h.ticker}>
                    <TickerCell ticker={h.ticker} sub={h.sleeveName} />
                    <td className={cn(td, "text-muted")}>{h.weightPct.toFixed(1)}%</td>
                    <td className={cn(td, tone(h.worstDayAvgPct))}>{sp(h.worstDayAvgPct, 2)}</td>
                    {crash ? (
                      <td className={cn(td, h.crashRetPct == null ? "text-faint" : tone(h.crashRetPct))}>
                        {h.crashRetPct == null ? "n/a" : sp(h.crashRetPct)}
                      </td>
                    ) : null}
                    {crash ? (
                      <td className={cn(td, "text-muted")}>{h.crashBeta == null ? "n/a" : sp(-h.crashBeta, 2)}</td>
                    ) : null}
                    <td className="px-3 py-2">
                      <Badge tone={v.tone}>{v.label}</Badge>
                    </td>
                  </tr>
                );
              })}
          </Table>
          <Note>
            The verdict compares the holding&apos;s average with the market&apos;s on those worst days: gained, held up
            (lost under a quarter as much), fell less, fell in line (within a tenth of the market), or fell more. This is the evidence to set hedge assumptions
            from. It is one window of history, not a guarantee.
          </Note>
        </div>
      </Card>

      <Card>
        <CardHeader title="Interest-rate shock" description="A parallel move in yields, through each bond holding's duration." />
        <RatesLab
          fundValue={a.fundValue}
          holdings={a.holdings.map((h) => ({
            ticker: h.ticker,
            name: h.name,
            value: h.value,
            weightPct: h.weightPct,
            durationYears: h.durationYears,
          }))}
          benchDuration={benchDuration}
        />
      </Card>

      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">Historical episodes</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          What today&apos;s exact positions would have returned through past sell-offs, peak to trough. A holding that
          did not exist yet is priced from a stand-in; each row says which. Price returns only: bond coupons and
          dividends are left out, which makes long episodes look slightly worse than they were.
        </p>
      </div>
      {episodes.map((e) => (
        <Episode key={e.id} e={e} fundValue={a.fundValue} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------ performance */

function PerfRow({ label, fund, bench, hint }: { label: string; fund: ReactNode; bench: ReactNode; hint?: string }) {
  return (
    <tr>
      <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
        {label}
        {hint ? <span className="mt-0.5 block text-[11px] text-faint">{hint}</span> : null}
      </th>
      <td className={cn(td, "font-medium text-ink")}>{fund}</td>
      <td className={cn(td, "text-ink")}>{bench}</td>
    </tr>
  );
}

function PerformanceTab({ a }: { a: AnalyticsModel }) {
  const { fund, bench, active } = a.perf;
  const short = a.window.days < 252;
  const ci = (s: { sharpe: number; sharpeSe: number }) =>
    `${s.sharpe.toFixed(2)} (${(s.sharpe - 1.96 * s.sharpeSe).toFixed(1)} to ${(s.sharpe + 1.96 * s.sharpeSe).toFixed(1)})`;
  const movers = [...a.holdings].sort((x, y) => y.contribPts - x.contribPts);

  return (
    <>
      <div className="rounded-lg border border-line bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
        <p>
          <span className="font-medium text-ink">What this measures.</span> Today&apos;s share counts, priced on every
          day from {longDate(a.window.start)} to {longDate(a.window.end)}. The trade ledger shows no change in
          positions since {longDate(a.stableSince)}, so from then on this is how the fund&apos;s actual holdings moved.
          {a.window.hypotheticalDays > 0
            ? ` The ${a.window.hypotheticalDays} trading days before that are hypothetical: the fund held something else then.`
            : ""}{" "}
          Returns are price returns; the Overview page&apos;s return is gain on cost, so the two differ.
        </p>
      </div>

      <Card>
        <CardHeader title="Fund against benchmark" description="Growth of $100, and how far each fell from its high along the way." />
        <div className="grid gap-6 px-3 py-4 lg:grid-cols-2">
          <div>
            <p className="px-2 pb-1 text-xs font-medium text-muted">Growth of $100</p>
            <FundVsBenchChart data={a.perf.series.map((p) => ({ date: p.date, fund: p.fund, bench: p.bench }))} unit="index" baseline={100} />
          </div>
          <div>
            <p className="px-2 pb-1 text-xs font-medium text-muted">Drawdown from the high</p>
            <FundVsBenchChart
              data={a.perf.series.map((p) => ({ date: p.date, fund: p.fundDd, bench: p.benchDd }))}
              unit="pct"
              baseline={0}
              fill
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Return and risk" description={`${a.window.days} trading days.`} />
          <div className="flex flex-col gap-3 px-5 py-5">
            <Table
              min="24rem"
              head={
                <tr>
                  <th scope="col" className={th}>Measure</th>
                  <th scope="col" className={thR}>Fund</th>
                  <th scope="col" className={thR}>Benchmark</th>
                </tr>
              }
            >
              <PerfRow label="Price return" fund={sp(fund.retPct)} bench={sp(bench.retPct)} hint={short ? "over the window, not annualized" : undefined} />
              <PerfRow label="Estimated income yield" fund={`${fund.yieldPct.toFixed(1)}%`} bench={`${bench.yieldPct.toFixed(1)}%`} hint="a year; added for the ratios below" />
              <PerfRow label="Volatility" fund={`${fund.volPct.toFixed(1)}%`} bench={`${bench.volPct.toFixed(1)}%`} hint="annualized" />
              <PerfRow label="Sharpe ratio" fund={ci(fund)} bench={ci(bench)} hint="with its 95% range" />
              <PerfRow label="Sortino ratio" fund={fund.sortino.toFixed(2)} bench={bench.sortino.toFixed(2)} />
              <PerfRow
                label="Deepest drawdown"
                fund={`${fund.maxDdPct.toFixed(1)}%`}
                bench={`${bench.maxDdPct.toFixed(1)}%`}
                hint={`fund: ${longDate(fund.ddPeak)} to ${longDate(fund.ddTrough)}`}
              />
              <PerfRow label="Drawdown now" fund={`${fund.currentDdPct.toFixed(1)}%`} bench={`${bench.currentDdPct.toFixed(1)}%`} />
              <PerfRow label="Best day" fund={sp(fund.bestDayPct, 2)} bench={sp(bench.bestDayPct, 2)} />
              <PerfRow label="Worst day" fund={sp(fund.worstDayPct, 2)} bench={sp(bench.worstDayPct, 2)} />
            </Table>
            <Note>
              Risk-free rate: {a.perf.rfAnnualPct.toFixed(2)}% a year ({a.perf.rfSource}). {MARKET.label} price
              return over the same days: {sp(a.perf.marketRetPct)}.
            </Note>
            {short ? (
              <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-ink">
                <span className="font-semibold">Low confidence.</span> With under a year of data a Sharpe ratio is
                mostly noise: the range in brackets is what the data can actually support.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Against the benchmark" description="What the fund did differently from 80/20 ACWI/AGG." />
          <div className="flex flex-col gap-3 px-5 py-5">
            <Table
              min="22rem"
              head={
                <tr>
                  <th scope="col" className={th}>Measure</th>
                  <th scope="col" className={thR}>Value</th>
                </tr>
              }
            >
              {(
                [
                  ["Return above benchmark", pts(active.excessPts, 1), "price return, over the window"],
                  ["Tracking error", `${active.tePct.toFixed(1)}%`, "annualized"],
                  ["Information ratio", active.infoRatio.toFixed(2), "excess return per unit of tracking error"],
                  ["Alpha", `${sp(active.alphaPct)} a year`, "return not explained by benchmark exposure"],
                  ["Beta to benchmark", active.beta.toFixed(2), undefined],
                  ["Up-market capture", active.upCapture == null ? "n/a" : `${(active.upCapture * 100).toFixed(0)}%`, "share of the benchmark's gains on its up days"],
                  ["Down-market capture", active.downCapture == null ? "n/a" : `${(active.downCapture * 100).toFixed(0)}%`, "share of its losses on its down days"],
                  ["Days ahead of benchmark", `${active.hitRatePct.toFixed(0)}%`, undefined],
                ] as [string, string, string | undefined][]
              ).map(([label, value, hint]) => (
                <tr key={label}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                    {label}
                    {hint ? <span className="mt-0.5 block text-[11px] text-faint">{hint}</span> : null}
                  </th>
                  <td className={cn(td, "font-medium text-ink")}>{value}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Attribution by asset class (Brinson-Fachler)"
          description="Splits the gap to the benchmark into allocation (holding more or less of an asset class) and selection (what was held inside it)."
        />
        <div className="flex flex-col gap-3 px-5 py-5">
          <Table
            min="54rem"
            head={
              <tr>
                <th scope="col" className={th}>Asset class</th>
                <th scope="col" className={thR}>Fund weight</th>
                <th scope="col" className={thR}>Bench. weight</th>
                <th scope="col" className={thR}>Fund return</th>
                <th scope="col" className={thR}>Bench. return</th>
                <th scope="col" className={thR}>Allocation</th>
                <th scope="col" className={thR}>Selection</th>
                <th scope="col" className={thR}>Interaction</th>
                <th scope="col" className={thR}>Total</th>
              </tr>
            }
          >
            {a.attribution.rows.map((r) => (
              <tr key={r.cls}>
                <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{r.label}</th>
                <td className={cn(td, "text-muted")}>{r.wp.toFixed(1)}%</td>
                <td className={cn(td, "text-muted")}>{r.wb.toFixed(1)}%</td>
                <td className={cn(td, "text-ink")}>{r.rp == null ? "n/a" : sp(r.rp)}</td>
                <td className={cn(td, "text-ink")}>{r.rb == null ? "n/a" : sp(r.rb)}</td>
                <td className={cn(td, tone(r.allocation))}>{sp(r.allocation, 2)}</td>
                <td className={cn(td, tone(r.selection))}>{sp(r.selection, 2)}</td>
                <td className={cn(td, tone(r.interaction))}>{sp(r.interaction, 2)}</td>
                <td className={cn(td, "font-medium", tone(r.total))}>{sp(r.total, 2)}</td>
              </tr>
            ))}
            <tr className="bg-surface-2/60">
              <th scope="row" className="px-3 py-2 text-left font-semibold text-ink">Total</th>
              <td className={td} />
              <td className={td} />
              <td className={cn(td, "font-medium text-ink")}>{sp(a.attribution.fundRetPct)}</td>
              <td className={cn(td, "font-medium text-ink")}>{sp(a.attribution.benchRetPct)}</td>
              <td className={cn(td, "font-medium", tone(a.attribution.allocation))}>{sp(a.attribution.allocation, 2)}</td>
              <td className={cn(td, "font-medium", tone(a.attribution.selection))}>{sp(a.attribution.selection, 2)}</td>
              <td className={cn(td, "font-medium", tone(a.attribution.interaction))}>{sp(a.attribution.interaction, 2)}</td>
              <td className={cn(td, "font-semibold", tone(a.attribution.fundRetPct - a.attribution.benchRetPct))}>
                {sp(a.attribution.fundRetPct - a.attribution.benchRetPct, 2)}
              </td>
            </tr>
          </Table>
          <Note>
            Effects are in percentage points and add up exactly to the fund&apos;s return minus the benchmark&apos;s.
            Weights are taken at the start of the window and held. The benchmark holds no alternatives or cash, so
            those classes have no benchmark return to select against: their whole effect is counted as allocation.
            Attribution is by asset class, not by sleeve, because the benchmark has asset classes, not sleeves.
          </Note>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contribution by sleeve" description="Each sleeve's part of the fund's price return over the window." />
          <div className="px-5 py-5">
            <Table
              min="26rem"
              head={
                <tr>
                  <th scope="col" className={th}>Sleeve</th>
                  <th scope="col" className={thR}>Start weight</th>
                  <th scope="col" className={thR}>Return</th>
                  <th scope="col" className={thR}>Contribution</th>
                </tr>
              }
            >
              {a.sleeves.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{s.name}</th>
                  <td className={cn(td, "text-muted")}>{s.startWeightPct.toFixed(1)}%</td>
                  <td className={cn(td, tone(s.retPct))}>{sp(s.retPct)}</td>
                  <td className={cn(td, "font-medium", tone(s.contribPts))}>{pts(s.contribPts)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Contribution by holding" description="Largest helpers first, largest detractors last." />
          <div className="px-5 py-5">
            <Table
              min="24rem"
              head={
                <tr>
                  <th scope="col" className={th}>Holding</th>
                  <th scope="col" className={thR}>Return</th>
                  <th scope="col" className={thR}>Contribution</th>
                </tr>
              }
            >
              {movers.map((h) => (
                <tr key={h.ticker}>
                  <TickerCell ticker={h.ticker} sub={h.sleeveName} />
                  <td className={cn(td, tone(h.windowRetPct))}>{sp(h.windowRetPct)}</td>
                  <td className={cn(td, "font-medium", tone(h.contribPts))}>{pts(h.contribPts)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- exposures */

function FactorTable({ fit }: { fit: FactorFit }) {
  const scale = Math.max(...fit.rows.map((r) => Math.abs(r.beta) + 2 * r.se), 0.5);
  const x = (v: number) => 50 + (v / scale) * 50; // % across, zero in the middle
  return (
    <div className="flex flex-col gap-3">
      <Table
        min="40rem"
        head={
          <tr>
            <th scope="col" className={th}>Factor</th>
            <th scope="col" className={thR}>Exposure</th>
            <th scope="col" className={cn(th, "w-[38%]")}>
              <span className="flex justify-between">
                <span>−{scale.toFixed(1)}</span>
                <span>0</span>
                <span>+{scale.toFixed(1)}</span>
              </span>
            </th>
            <th scope="col" className={thR}>t-stat</th>
            <th scope="col" className={th}>Reading</th>
          </tr>
        }
      >
        {fit.rows.map((r) => {
          const significant = Math.abs(r.t) >= 2;
          return (
            <tr key={r.id}>
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="font-medium text-ink">{r.label}</span>
                <span className="mt-0.5 block text-[11px] text-faint">{r.meaning}</span>
              </th>
              <td className={cn(td, "font-medium text-ink")}>
                {r.beta >= 0 ? "+" : ""}
                {r.beta.toFixed(2)}
              </td>
              <td className="px-3 py-2">
                <div className="relative h-5">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                  {/* the estimate's range: two standard errors either side */}
                  <div
                    className="absolute top-1/2 h-px -translate-y-1/2 bg-muted"
                    style={{ left: `${x(r.beta - 2 * r.se)}%`, width: `${x(r.beta + 2 * r.se) - x(r.beta - 2 * r.se)}%` }}
                  />
                  <div
                    className={cn("absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm", significant ? "bg-brand" : "bg-line-strong")}
                    style={{ left: `${Math.min(x(0), x(r.beta))}%`, width: `${Math.max(Math.abs(x(r.beta) - x(0)), 0.6)}%` }}
                  />
                </div>
              </td>
              <td className={cn(td, "text-muted")}>{r.t.toFixed(1)}</td>
              <td className="px-3 py-2">
                <Badge tone={significant ? "brand" : "neutral"}>{significant ? "Clear tilt" : "Not distinguishable from zero"}</Badge>
              </td>
            </tr>
          );
        })}
      </Table>
      <p className="text-xs text-muted tnum">
        These factors explain {(fit.r2 * 100).toFixed(0)}% of the daily moves ({fit.n} days). Return they do not
        explain: {sp(fit.alphaPct)} a year.
      </p>
    </div>
  );
}

function ExposuresTab({ a }: { a: AnalyticsModel }) {
  const classes = (Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).map((cls) => {
    const members = a.holdings.filter((h) => h.assetClass === cls);
    const weight = members.reduce((s, h) => s + h.weightPct, 0) + (cls === "cash" ? a.cashPct : 0);
    const benchWeight = a.attribution.rows.find((r) => r.cls === cls)?.wb ?? 0;
    return { cls, label: ASSET_CLASS_LABEL[cls], weight, benchWeight, members };
  });
  const scale = Math.max(...classes.map((c) => Math.max(c.weight, c.benchWeight)), 1);

  return (
    <>
      <Card>
        <CardHeader title="Asset class mix" description="Today's weights against the benchmark's 80% equity, 20% bonds." />
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-brand" /> Fund
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-gold" /> Benchmark
            </span>
          </div>
          {classes.map((c) => (
            <div key={c.cls} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-x-3">
              <div>
                <p className="text-sm text-ink">{c.label}</p>
                <p className="text-[11px] text-faint">{c.members.map((h) => h.ticker).join(", ") || (c.cls === "cash" ? "ledger cash" : "none")}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="h-2 rounded-sm bg-brand" style={{ width: `${Math.max((c.weight / scale) * 100, 0.5)}%` }} />
                <div className="h-2 rounded-sm bg-gold" style={{ width: `${Math.max((c.benchWeight / scale) * 100, 0.5)}%` }} />
              </div>
              <span className="text-right text-xs text-muted tnum">
                <span className="font-medium text-ink">{c.weight.toFixed(1)}%</span> vs {c.benchWeight.toFixed(0)}%
              </span>
            </div>
          ))}
          <Note>Asset classes are assigned in content/analytics.ts. A ticker not listed there counts as equity.</Note>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Style exposures"
          description="Which kinds of stocks the fund behaves like, estimated from how its daily returns move with each factor (not from company fundamentals)."
        />
        <div className="flex flex-col gap-6 px-5 py-5">
          {a.factors.missing.length ? (
            <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-ink">
              Price history for {a.factors.missing.join(", ")} is still being fetched. Reload in a minute.
            </p>
          ) : !a.factors.fund ? (
            <EmptyState title="Not enough overlapping history for the factor funds yet" hint="Try a longer window." />
          ) : (
            <>
              {a.factors.equity ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink">Equity holdings only</h3>
                  <FactorTable fit={a.factors.equity} />
                </div>
              ) : null}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Whole fund</h3>
                <FactorTable fit={a.factors.fund} />
              </div>
            </>
          )}
          <Note>
            Each factor is one fund&apos;s return minus another&apos;s:{" "}
            {FACTORS.map((f) => `${f.label} = ${f.long}${f.short ? ` − ${f.short}` : ""}`).join("; ")}. An exposure of
            +0.20 to Size means the fund moves 0.2% for each 1% small companies beat large ones. The thin line is the
            range the data supports; a bar is only colored when that range clears zero. This is a rough read: factor
            funds overlap, and a few months of data cannot pin small tilts down.
          </Note>
        </div>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- what-if */

async function WhatIfTab({ a }: { a: AnalyticsModel }) {
  const proposals = await getProposals();
  const byId = new Map(proposals.map((p) => [p.id, p]));
  return (
    <>
      <Card>
        <CardHeader
          title="Try a trade"
          description="See what a buy or sell does to the fund's risk before proposing it. Nothing here is saved or sent."
        />
        <WhatIf base={a.base} />
      </Card>

      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">Pending proposals</h2>
        <p className="mt-1 text-sm text-muted">
          The same before-and-after for every proposal awaiting a decision. It also appears on the{" "}
          <Link href="/proposals" className="text-brand hover:underline">
            Proposals
          </Link>{" "}
          page.
        </p>
      </div>
      {a.proposals.length === 0 ? (
        <EmptyState title="No proposals are waiting for a decision" />
      ) : (
        a.proposals.map((imp) => {
          const p = byId.get(imp.proposalId);
          if (!p) return null;
          return (
            <Card key={imp.proposalId} className="px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-ink">
                {p.action.toUpperCase()} {p.shares.toLocaleString()} {p.ticker}
              </p>
              {imp.result.ok ? (
                <ImpactTable ticker={p.ticker.toUpperCase()} result={imp.result} tickers={a.base.tickers} />
              ) : (
                <p className="text-sm text-muted">{imp.result.reason}</p>
              )}
            </Card>
          );
        })
      )}
    </>
  );
}

/* ----------------------------------------------------------------- limits */

function LimitsTab({ a }: { a: AnalyticsModel }) {
  return (
    <>
      <Card>
        <CardHeader title="Sleeve ranges" description="Each sleeve's weight against the target range in the tracker." />
        <div className="px-5 py-5">
          <Table
            min="34rem"
            head={
              <tr>
                <th scope="col" className={th}>Sleeve</th>
                <th scope="col" className={thR}>Weight</th>
                <th scope="col" className={thR}>Range</th>
                <th scope="col" className={thR}>Room</th>
                <th scope="col" className={th}>Status</th>
              </tr>
            }
          >
            {a.sleeves.map((s) => {
              const room =
                s.status === "in-range"
                  ? `${Math.min(s.weightPct - s.min, s.max - s.weightPct).toFixed(1)} pts to the nearer edge`
                  : s.status === "under"
                    ? `${(s.min - s.weightPct).toFixed(1)} pts below`
                    : `${(s.weightPct - s.max).toFixed(1)} pts above`;
              return (
                <tr key={s.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{s.name}</th>
                  <td className={cn(td, "font-medium text-ink")}>{s.weightPct.toFixed(1)}%</td>
                  <td className={cn(td, "text-muted")}>{s.min}–{s.max}%</td>
                  <td className={cn(td, "text-muted")}>{room}</td>
                  <td className="px-3 py-2">
                    <Badge tone={s.status === "in-range" ? "pos" : s.status === "under" ? "warn" : "neg"}>
                      {s.status === "in-range" ? "In range" : s.status === "under" ? "Below range" : "Above range"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">Cash</th>
              <td className={cn(td, "font-medium text-ink")}>{a.cashPct.toFixed(1)}%</td>
              <td className={cn(td, "text-muted")}>none</td>
              <td className={td} />
              <td />
            </tr>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Risk limits"
          description="Readings the fund could set limits on. A limit shows here once the fund adopts a number for it."
        />
        <div className="flex flex-col gap-3 px-5 py-5">
          <Table
            min="38rem"
            head={
              <tr>
                <th scope="col" className={th}>Measure</th>
                <th scope="col" className={thR}>Now</th>
                <th scope="col" className={thR}>Limit</th>
                <th scope="col" className={th}>Status</th>
              </tr>
            }
          >
            {a.limits.map((l) => {
              const breach = l.limit != null && (l.kind === "max" ? l.value > l.limit : l.value < l.limit);
              return (
                <tr key={l.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="text-ink">{l.label}</span>
                    <span className="mt-0.5 block text-[11px] text-faint">
                      {l.detail}
                    </span>
                  </th>
                  <td className={cn(td, "font-medium text-ink")}>{l.value.toFixed(1)}%</td>
                  <td className={cn(td, "text-muted")}>
                    {l.limit == null ? "not set" : `${l.kind === "max" ? "at most" : "at least"} ${l.limit}%`}
                  </td>
                  <td className="px-3 py-2">
                    {l.limit == null ? (
                      <Badge>No limit set</Badge>
                    ) : (
                      <Badge tone={breach ? "neg" : "pos"}>{breach ? "Breach" : "Within limit"}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
          <Note>
            The <Link href="/ips" className="text-brand hover:underline">Investment Policy</Link> does not set numeric limits for these; it asks managers to avoid undue risk (Section 2).
            The readings above are what a limit would be measured against: use them to choose sensible numbers, then
            enter the limits in IPS_LIMITS in content/analytics.ts and this table starts checking them.
          </Note>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------- page */

function Method({ a }: { a: AnalyticsModel }) {
  const proxyList = Object.entries(PROXIES)
    .filter(([, v]) => v.length)
    .map(([t, v]) => `${t} = ${v.map(([p, w]) => (w === 1 ? p : `${Math.round(w * 100)}% ${p}`)).join(" + ")}`)
    .join("; ");
  const hedged = Object.keys(HEDGE_ASSUMPTIONS);
  return (
    <details className="rounded-lg border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink">Method &amp; assumptions</summary>
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">
        <p>
          <span className="font-medium text-ink">Data.</span> Daily closing prices from the tracker&apos;s price cache,
          on the {a.window.days + 1} days from {longDate(a.window.start)} to {longDate(a.window.end)} when every holding
          and the benchmark have a price. Prices exclude dividends, so every return is a price return. A fund that
          pays a large year-end distribution shows a one-day drop that was not a real loss.
        </p>
        <p>
          <span className="font-medium text-ink">Two views.</span> Risk, betas and stress tests use today&apos;s
          weights applied to every past day, so they describe the portfolio as it is now. Returns, Sharpe, drawdown
          and attribution use today&apos;s share counts priced on every past day. Positions last changed on{" "}
          {longDate(a.stableSince)}.
        </p>
        <p>
          <span className="font-medium text-ink">Benchmark.</span>{" "}
          {BENCHMARK.map((b) => `${Math.round(b.weight * 100)}% ${b.ticker}`).join(", ")}. Market for betas and equity
          shocks: {MARKET.ticker}.
        </p>
        <p>
          <span className="font-medium text-ink">Ratios.</span> Volatility is the standard deviation of daily returns
          times √252. Sharpe and Sortino use returns above the risk-free rate ({a.perf.rfAnnualPct.toFixed(2)}%,{" "}
          {a.perf.rfSource}) and add each holding&apos;s known yield as a steady daily accrual, since the risk-free
          rate is a total return. The Sharpe range is ±1.96 standard errors (Lo, 2002). Value at risk is the
          historical 5th-percentile day.
        </p>
        <p>
          <span className="font-medium text-ink">Hand-kept assumptions</span> (content/analytics.ts). Durations:{" "}
          {Object.entries(DURATION_YEARS).map(([t, d]) => `${t} ${d}`).join(", ")} years. Stand-ins for episodes:{" "}
          {proxyList}. Hedge assumptions: {hedged.length ? hedged.join(", ") : "none set"}.
        </p>
        <p>
          <span className="font-medium text-ink">What this is not.</span> A forecast. Everything here describes how
          these holdings behaved in the past; the next sell-off will differ.
        </p>
      </div>
    </details>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; w?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === params.tab) ? (params.tab as TabKey) : "risk";
  const windowKey: WindowKey = WINDOWS.some((w) => w.key === params.w) ? (params.w as WindowKey) : "1y";
  const href = (t: TabKey, w: WindowKey) => `/analytics?tab=${t}&w=${w}`;

  // Keep the benchmark and factor funds' prices current without holding up the page.
  after(async () => {
    try {
      await refreshDaily(analyticsOnlyTickers(), { max: 6 });
    } catch (e) {
      console.error("analytics: price top-up failed:", e);
    }
  });

  const a = await loadAnalytics(windowKey);

  const windowPicker = (
    <div className="flex rounded-md border border-line-strong bg-surface p-0.5">
      {WINDOWS.map((w) => (
        <Link
          key={w.key}
          href={href(tab, w.key)}
          aria-current={w.key === windowKey ? "true" : undefined}
          className={cn(
            "whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
            w.key === windowKey ? "bg-brand text-brand-contrast" : "text-muted hover:text-ink",
          )}
        >
          {w.label}
        </Link>
      ))}
    </div>
  );

  if (!a.ok) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Analytics" description="Risk, stress tests and performance for the fund." action={windowPicker} />
        <EmptyState title="Analytics can't be calculated right now" hint={a.reason} />
      </div>
    );
  }

  const episodes = tab === "stress"
    ? await loadEpisodes(
        a.holdings.map((h) => ({ ticker: h.ticker, name: h.name, sleeveName: h.sleeveName, value: h.value, weightPct: h.weightPct })),
      )
    : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Analytics"
        description="How much risk the fund is taking, where it comes from, what a sell-off would do to it, and whether the return has been worth it. Estimates from price history, not forecasts."
        action={windowPicker}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Volatility (annual)" value={`${a.risk.volPct.toFixed(1)}%`} sub={`benchmark ${a.risk.benchVolPct.toFixed(1)}% · ${MARKET.label} ${a.risk.marketVolPct.toFixed(1)}%`} />
        <StatTile
          label={`Beta to ${MARKET.label}`}
          value={a.risk.beta.toFixed(2)}
          sub={`±${(2 * a.risk.betaSe).toFixed(2)} · benchmark ${a.risk.benchBeta.toFixed(2)}`}
        />
        <StatTile label="Tracking error" value={`${a.risk.tePct.toFixed(1)}%`} sub="vs 80/20 benchmark, annual" />
        <StatTile
          label="1-day value at risk (95%)"
          value={money((a.risk.var95Pct / 100) * a.fundValue)}
          sub={`${a.risk.var95Pct.toFixed(2)}% of ${money(a.fundValue)}`}
        />
        <StatTile
          label="Deepest drawdown"
          value={`${a.perf.fund.maxDdPct.toFixed(1)}%`}
          sub={`benchmark ${a.perf.bench.maxDdPct.toFixed(1)}% · now ${a.perf.fund.currentDdPct.toFixed(1)}%`}
        />
        <StatTile
          label="Sharpe ratio"
          value={a.perf.fund.sharpe.toFixed(2)}
          sub={`±${(1.96 * a.perf.fund.sharpeSe).toFixed(2)} · benchmark ${a.perf.bench.sharpe.toFixed(2)}`}
        />
      </div>

      <p className="-mt-4 text-xs text-muted tnum">
        {longDate(a.window.start)} to {longDate(a.window.end)} · {a.window.days} trading days · prices as of the{" "}
        {longDate(a.window.end)} close.
        {a.window.hypotheticalDays > 0
          ? ` Includes ${a.window.hypotheticalDays} days before positions last changed (${longDate(a.stableSince)}): today's holdings priced back.`
          : ""}
        {a.uncovered.length
          ? ` Not included (no price history): ${a.uncovered.map((u) => `${u.ticker} (${u.shares.toLocaleString()} shares)`).join(", ")}.`
          : ""}
      </p>

      <nav aria-label="Analytics sections" className="-mb-2 flex gap-1 overflow-x-auto border-b border-line pb-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key, windowKey)}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors",
              t.key === tab ? "bg-brand font-medium text-brand-contrast" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "risk" ? <RiskTab a={a} /> : null}
      {tab === "stress" ? <StressTab a={a} episodes={episodes} /> : null}
      {tab === "performance" ? <PerformanceTab a={a} /> : null}
      {tab === "exposures" ? <ExposuresTab a={a} /> : null}
      {tab === "whatif" ? <WhatIfTab a={a} /> : null}
      {tab === "limits" ? <LimitsTab a={a} /> : null}

      <Method a={a} />
    </div>
  );
}
