// ============================================================================
// Analytics page — every hand-maintained assumption, in one place.
//
// The Analytics page (app/(app)/analytics/page.tsx) computes almost everything
// from the price history the tracker already keeps. The few things prices
// cannot tell it are written here. Edit this file to change them; the page
// lists these same assumptions under "Method & assumptions" so readers can
// see what was assumed.
//
// Nothing here is a forecast. Where a number is an estimate, it says so.
// ============================================================================

// ---- Benchmark ---------------------------------------------------------------
// The IPS benchmark (Investment Policy, Section 4). Must add up to 1.
export const BENCHMARK: { ticker: string; weight: number }[] = [
  { ticker: "ACWI", weight: 0.8 },
  { ticker: "AGG", weight: 0.2 },
];

/** The market the equity stress tests shock. */
export const MARKET = { ticker: "SPY", label: "S&P 500" };

// ---- Risk-free rate ----------------------------------------------------------
// Sharpe and Sortino need a cash return. BOXX holds 1-3 month box spreads and
// pays no distributions, so its price return is a live T-bill-like rate (less a
// ~0.2% fee). If its prices are unavailable, the fallback rate is used.
export const RISK_FREE = { proxyTicker: "BOXX", fallbackAnnualPct: 4.0 };

// ---- Asset class of each holding (for attribution) ---------------------------
// Brinson attribution compares the fund with the benchmark by asset class.
// A ticker that is not listed is treated as "equity".
export type AssetClass = "equity" | "bonds" | "alternatives" | "cash";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  equity: "Equity",
  bonds: "Fixed income",
  alternatives: "Alternatives",
  cash: "Cash & equivalents",
};

export const ASSET_CLASS: Record<string, AssetClass> = {
  ACWI: "equity",
  VISGX: "equity",
  SPYC: "equity", // S&P 500 plus an options overlay
  AGG: "bonds",
  VGSH: "bonds",
  BOXX: "cash",
  GLD: "alternatives",
  GSG: "alternatives",
  RSST: "alternatives", // stocks plus managed futures
  RSBT: "alternatives", // bonds plus managed futures
  REMIX: "alternatives", // equities plus managed futures
  CAOS: "alternatives", // tail-risk hedge
};

/** Which benchmark leg each asset class is compared with (others have none). */
export const BENCHMARK_LEG: Partial<Record<AssetClass, string>> = {
  equity: "ACWI",
  bonds: "AGG",
};

// ---- Interest-rate sensitivity -----------------------------------------------
// Effective duration in years, from each fund's fact sheet. Used only by the
// interest-rate stress test: a +1.00% move in yields changes price by about
// -duration %. Tickers not listed are held flat in that test.
// Check these against the fact sheets once a year.
export const DURATION_YEARS: Record<string, number> = {
  AGG: 6.0,
  VGSH: 1.9,
  RSBT: 6.0, // its bond leg tracks the US aggregate; the futures leg is ignored
  BOXX: 0.1,
};

// ---- Hedge assumptions for the equity shock ----------------------------------
// Some holdings (tail-risk and options funds) are built to behave differently
// in a crash than on an ordinary day, so a beta measured on ordinary days
// understates them. If the class agrees on how one of them should behave, write
// it here and the stress test uses it instead of the statistical estimate.
//
// Each entry is a list of points: "if the S&P 500 falls by `spDrop` percent,
// this holding returns `ret` percent". Values between points are interpolated;
// beyond the last point the line continues at the same slope.
//
// Example (illustrative only, not a claim about the fund):
//   CAOS: [{ spDrop: 20, ret: 5 }, { spDrop: 40, ret: 25 }],
//
// Left empty on purpose: the page shows what each holding actually did in the
// worst market stretch on record, which is the evidence to set these from.
// Anyone can also type a temporary assumption straight into the stress test.
export const HEDGE_ASSUMPTIONS: Record<string, { spDrop: number; ret: number }[]> = {};

// ---- Historical episodes -----------------------------------------------------
// Each episode is replayed against today's holdings: what would these exact
// positions have returned between the two dates? Dates are the S&P 500's
// closing peak and trough.
export interface Episode {
  id: string;
  name: string;
  start: string; // ISO date, a trading day
  end: string;
  note: string;
}

export const EPISODES: Episode[] = [
  {
    id: "gfc-2008",
    name: "2008 financial crisis",
    start: "2007-10-09",
    end: "2009-03-09",
    note: "The S&P 500's peak to its trough, 17 months. Banks failed and credit froze.",
  },
  {
    id: "covid-2020",
    name: "2020 COVID crash",
    start: "2020-02-19",
    end: "2020-03-23",
    note: "The fastest bear market on record: about a third off stocks in 23 trading days.",
  },
  {
    id: "rates-2022",
    name: "2022 rate shock",
    start: "2022-01-03",
    end: "2022-10-12",
    note: "Inflation and fast rate rises. Stocks and bonds fell together.",
  },
  {
    id: "tariff-2025",
    name: "2025 tariff sell-off",
    start: "2025-02-19",
    end: "2025-04-08",
    note: "The largest S&P 500 drawdown in the tracker's own price history.",
  },
];

// ---- Stand-ins for holdings that did not exist yet ---------------------------
// When a holding has no price for an episode (the fund launched later), its
// return is built from these stand-ins instead: a list of [ticker, weight].
// Weights can add to more than 1 for "stacked" funds. A stand-in may itself
// have a stand-in. A ticker with no price and no entry here uses
// DEFAULT_PROXY. An empty list means "nothing comparable existed": the holding
// is held flat (0%) and flagged on the page.
//
// "No price" means the data provider has none, which is not always the same as
// "the fund did not exist": its history for GSG, for one, only starts in 2008.
export const PROXIES: Record<string, [string, number][]> = {
  RSST: [["SPY", 1], ["DBMF", 1]], // 100% US stocks + 100% managed futures
  RSBT: [["AGG", 1], ["DBMF", 1]], // 100% US bonds + 100% managed futures
  REMIX: [["ACWI", 0.5], ["DBMF", 0.5]], // rough mix of global stocks and trend following
  SPYC: [["SPY", 1]], // ignores the options overlay
  CAOS: [["TAIL", 1]], // another tail-risk fund; rough
  BOXX: [["BIL", 1]],
  VGSH: [["SHY", 1]],
  ACWI: [["SPY", 0.63], ["EFA", 0.27], ["VWO", 0.1]], // today's regional mix: US, developed, emerging
  GSG: [["DJP", 1]], // a broad commodity index note with a longer price history
  DBMF: [["RYMFX", 1]], // before 2019: an older managed-futures mutual fund; a rough stand-in
  TAIL: [], // no tail-risk fund existed before 2017
  RYMFX: [],
  DJP: [],
  BIL: [],
};

/** Used for any other holding with no price history in an episode (a later IPO, say). */
export const DEFAULT_PROXY: [string, number][] = [["SPY", 1]];

// ---- Style factors -----------------------------------------------------------
// Returns-based style analysis: the fund's daily returns are regressed on these
// factor returns. Each factor is one ETF's return minus another's (or just one
// ETF's return for the market itself).
export interface FactorDef {
  id: string;
  label: string;
  long: string;
  short?: string;
  meaning: string;
}

export const FACTORS: FactorDef[] = [
  { id: "market", label: "Market", long: "SPY", meaning: "Sensitivity to US large-cap stocks." },
  { id: "size", label: "Size", long: "IWM", short: "SPY", meaning: "Positive: tilts to small companies." },
  { id: "value", label: "Value", long: "IWD", short: "IWF", meaning: "Positive: tilts to value; negative: to growth." },
  { id: "momentum", label: "Momentum", long: "MTUM", short: "SPY", meaning: "Positive: tilts to recent winners." },
  { id: "quality", label: "Quality", long: "QUAL", short: "SPY", meaning: "Positive: tilts to profitable, stable firms." },
];

// ---- Risk limits -------------------------------------------------------------
// Numeric limits the fund may choose to adopt. The Investment Policy does not
// set any (it asks managers to avoid undue risk, Section 2). `null` means no
// limit: the Limits tab then shows the reading with "no limit set". Put a
// number here once the fund agrees one, and the tab starts checking it.
export const IPS_LIMITS: {
  maxPositionPct: number | null; // largest single position, % of fund
  maxDrawdownPct: number | null; // fall from peak, %
  maxTrackingErrorPct: number | null; // annualized, %
  minCashPct: number | null; // cash floor, % of fund
} = {
  maxPositionPct: null,
  maxDrawdownPct: null,
  maxTrackingErrorPct: null,
  minCashPct: null,
};
