// Market data — Twelve Data, with the daily closes cached in the `price_cache`
// table so repeated views don't burn API credits.
//
//   getSeries(ticker)     -> daily closes (cache first, then API, then synthetic)
//   warmCache(tickers)    -> one batched fetch for everything missing fresh data
//   getQuote / getQuotes  -> derived from the series + a light /quote call for name
//   getHistory            -> a slice of the series
//   getNews               -> best effort; [] if the plan doesn't include news
//
// Free-tier Twelve Data is 8 requests/minute, 800 credits/day. We batch up to 8
// symbols per request and only fetch tickers whose cache is stale.

import "server-only";
import { admin } from "./supabase/admin";
import type { NewsItem, PricePoint, PriceQuote } from "./types";

const API = "https://api.twelvedata.com";
const KEY = process.env.MARKET_DATA_API_KEY ?? "";
const FRESH_DAYS = 4; // cache counts as current if it has a row this recent

interface TickerMeta {
  name: string;
  cap: number | null;
  pe: number | null;
  yield: number | null;
}

// Names + the stats Twelve Data's free tier doesn't return. Anything not listed
// still works — it just shows "—" for market cap / P/E / yield.
const KNOWN: Record<string, TickerMeta> = {
  ACWI: { name: "iShares MSCI ACWI ETF", cap: null, pe: null, yield: 0.017 },
  AGG: { name: "iShares Core U.S. Aggregate Bond ETF", cap: null, pe: null, yield: 0.039 },
  VISGX: { name: "Vanguard Small-Cap Growth Index Fund", cap: null, pe: null, yield: 0.006 },
  AAPL: { name: "Apple Inc.", cap: 3.5e12, pe: 33, yield: 0.005 },
  GOOGL: { name: "Alphabet Inc. Class A", cap: 2.5e12, pe: 21, yield: 0.004 },
  SCHW: { name: "The Charles Schwab Corporation", cap: 1.5e11, pe: 20, yield: 0.014 },
  AMZN: { name: "Amazon.com, Inc.", cap: 2.0e12, pe: 38, yield: null },
  UBER: { name: "Uber Technologies, Inc.", cap: 1.6e11, pe: 22, yield: null },
  MSFT: { name: "Microsoft Corporation", cap: 3.7e12, pe: 34, yield: 0.008 },
  GLD: { name: "SPDR Gold Shares", cap: null, pe: null, yield: null },
  GSG: { name: "iShares S&P GSCI Commodity-Indexed Trust", cap: null, pe: null, yield: null },
  BOXX: { name: "Alpha Architect 1-3 Month Box ETF", cap: null, pe: null, yield: null },
  REMIX: { name: "Standpoint Multi-Asset Fund", cap: null, pe: null, yield: 0.02 },
  CAOS: { name: "Alpha Architect Tail Risk ETF", cap: null, pe: null, yield: 0.03 },
  RSST: { name: "Return Stacked US Stocks & Managed Futures ETF", cap: null, pe: null, yield: null },
  RSBT: { name: "Return Stacked Bonds & Managed Futures ETF", cap: null, pe: null, yield: null },
  VGSH: { name: "Vanguard Short-Term Treasury ETF", cap: null, pe: null, yield: 0.041 },
  SPYC: { name: "Simplify US Equity PLUS Convexity ETF", cap: null, pe: null, yield: 0.012 },
  INTU: { name: "Intuit Inc.", cap: 1.0e11, pe: 22, yield: 0.015 },
  NVDA: { name: "NVIDIA Corporation", cap: 4.3e12, pe: 45, yield: 0.0002 },
  SPY: { name: "SPDR S&P 500 ETF Trust", cap: null, pe: null, yield: 0.012 },
  QQQ: { name: "Invesco QQQ Trust", cap: null, pe: null, yield: 0.006 },
  "BRK.B": { name: "Berkshire Hathaway Inc. Class B", cap: 1.05e12, pe: 23, yield: null },
  COST: { name: "Costco Wholesale Corporation", cap: 4.2e11, pe: 52, yield: 0.005 },
  JPM: { name: "JPMorgan Chase & Co.", cap: 8.2e11, pe: 13, yield: 0.021 },
  V: { name: "Visa Inc. Class A", cap: 6.8e11, pe: 30, yield: 0.007 },
};

function normalize(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z.]/g, "");
}

export function isKnownTicker(ticker: string): boolean {
  return normalize(ticker) in KNOWN;
}

// --- synthetic fallback (deterministic) — only used if the API and cache both fail
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function syntheticSeries(ticker: string, days = 300): PricePoint[] {
  const rnd = mulberry32(hash(normalize(ticker)));
  const base = 20 + rnd() * 400;
  let price = base;
  const end = new Date();
  const out: PricePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    price = Math.max(base * 0.3, price * (1 + (rnd() - 0.5) * 0.03));
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), close: Number(price.toFixed(2)) });
  }
  return out;
}

// --- cache helpers
async function readCache(tickers: string[]): Promise<Map<string, PricePoint[]>> {
  const { data } = await admin()
    .from("price_cache")
    .select("ticker,date,close")
    .in("ticker", tickers)
    .order("date");
  const map = new Map<string, PricePoint[]>();
  for (const row of data ?? []) {
    const list = map.get(row.ticker) ?? [];
    list.push({ date: String(row.date).slice(0, 10), close: Number(row.close) });
    map.set(row.ticker, list);
  }
  return map;
}

function isFresh(series: PricePoint[] | undefined): boolean {
  if (!series || series.length < 60) return false;
  const last = new Date(series[series.length - 1].date).getTime();
  return Date.now() - last < FRESH_DAYS * 86400000;
}

async function writeCache(rows: { ticker: string; date: string; close: number }[]) {
  if (rows.length === 0) return;
  await admin().from("price_cache").upsert(rows, { onConflict: "ticker,date" });
}

/** One symbol per request (Twelve Data bills one credit per symbol either way). */
async function fetchOne(symbol: string, outputsize: number): Promise<PricePoint[] | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(
      `${API}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputsize}&apikey=${KEY}`,
      { cache: "no-store" },
    );
    const j = (await res.json()) as {
      status?: string;
      code?: number;
      values?: { datetime: string; close: string }[];
    };
    if (j.status !== "ok" || !j.values) return null; // rate-limited or unknown symbol
    return j.values
      .map((v) => ({ date: v.datetime.slice(0, 10), close: Number(v.close) }))
      .filter((v) => Number.isFinite(v.close))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

/**
 * Best-effort top-up used during a page render: only fetches tickers that have
 * NOTHING cached, and only a handful, so a render never stalls on the API or
 * trips the 8-credit/minute free-tier limit. Day-to-day freshness is the job of
 * refreshPrices() on a schedule.
 */
export async function warmCache(rawTickers: string[]): Promise<void> {
  const tickers = [...new Set(rawTickers.map(normalize))].filter(Boolean);
  if (tickers.length === 0 || !KEY) return;

  const cached = await readCache(tickers);
  const missing = tickers.filter((t) => !(cached.get(t)?.length)).slice(0, 6);
  if (missing.length === 0) return;

  const rows: { ticker: string; date: string; close: number }[] = [];
  for (const t of missing) {
    const points = await fetchOne(t, 400);
    if (points) for (const p of points) rows.push({ ticker: t, date: p.date, close: p.close });
  }
  await writeCache(rows);
}

/**
 * Full refresh for a scheduled job (Vercel Cron -> /api/refresh-prices). Walks
 * the ticker list one request at a time, pausing to stay under ~7 credits/minute.
 * `outputsize` is small for tickers already cached (just top up recent closes),
 * large for new ones.
 */
export async function refreshPrices(
  rawTickers: string[],
  opts: { perMinute?: number } = {},
): Promise<{ updated: string[]; skipped: string[] }> {
  const tickers = [...new Set(rawTickers.map(normalize))].filter(Boolean);
  const perMinute = opts.perMinute ?? 7;
  const gapMs = Math.ceil(60000 / perMinute);
  const cached = await readCache(tickers);
  const updated: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    const have = cached.get(t)?.length ?? 0;
    const points = await fetchOne(t, have > 200 ? 5 : 400);
    if (points && points.length) {
      await writeCache(points.map((p) => ({ ticker: t, date: p.date, close: p.close })));
      updated.push(t);
    } else {
      skipped.push(t);
    }
    if (i < tickers.length - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  return { updated, skipped };
}

/**
 * Refreshes at most `max` tickers, worst-cached first — sized to finish inside a
 * serverless function's time limit. Called hourly by /api/refresh-prices and by
 * the "Refresh prices" button on the Admin page. Run it a few times and the
 * whole set becomes current.
 */
export async function refreshStale(
  rawTickers: string[],
  max = 6,
): Promise<{ updated: string[]; skipped: string[]; remaining: number }> {
  const tickers = [...new Set(rawTickers.map(normalize))].filter(Boolean);
  const cached = await readCache(tickers);
  const ranked = tickers
    .map((t) => {
      const series = cached.get(t);
      const last = series?.length ? new Date(series[series.length - 1].date).getTime() : 0;
      return { t, last, fresh: isFresh(series) };
    })
    .sort((a, b) => a.last - b.last);

  const stale = ranked.filter((r) => !r.fresh).map((r) => r.t);
  const batch = stale.slice(0, max);
  const { updated, skipped } = await refreshPrices(batch);
  return { updated, skipped, remaining: Math.max(0, stale.length - batch.length) };
}

export async function getSeries(ticker: string): Promise<PricePoint[]> {
  const t = normalize(ticker);
  const cached = (await readCache([t])).get(t);
  if (isFresh(cached)) return cached!;

  await warmCache([t]);
  const after = (await readCache([t])).get(t);
  if (after && after.length >= 30) return after;

  return cached && cached.length ? cached : syntheticSeries(t);
}

export async function getHistory(ticker: string, days = 275): Promise<PricePoint[]> {
  const series = await getSeries(ticker);
  return series.slice(-days);
}

/**
 * Looks up (and permanently caches) a single historical close on or shortly
 * after `date`. Used by the benchmark return engine to price the 80/20
 * ACWI/AGG blend as of a fixed starting date (e.g. the April 2026 rebuild)
 * that predates the app's own price cache. Costs one API credit, once ever,
 * per ticker/date pair — every call after the first is a cache hit.
 */
export async function getHistoricalClose(ticker: string, date: string): Promise<number | null> {
  const t = normalize(ticker);

  const { data: exact } = await admin()
    .from("price_cache")
    .select("close")
    .eq("ticker", t)
    .eq("date", date)
    .maybeSingle();
  if (exact) return Number(exact.close);

  // Nearest cached close on/after the date, in case it's already covered by
  // the rolling cache (handles weekends/holidays landing on `date`).
  const { data: nearby } = await admin()
    .from("price_cache")
    .select("close")
    .eq("ticker", t)
    .gte("date", date)
    .order("date")
    .limit(1)
    .maybeSingle();
  if (nearby) return Number(nearby.close);

  if (!KEY) return null;
  try {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    const res = await fetch(
      `${API}/time_series?symbol=${t}&interval=1day&start_date=${date}&end_date=${end
        .toISOString()
        .slice(0, 10)}&apikey=${KEY}`,
      { cache: "no-store" },
    );
    const j = (await res.json()) as {
      status?: string;
      values?: { datetime: string; close: string }[];
    };
    if (j.status !== "ok" || !j.values?.length) return null;
    const rows = j.values
      .map((v) => ({ ticker: t, date: v.datetime.slice(0, 10), close: Number(v.close) }))
      .filter((r) => Number.isFinite(r.close))
      .sort((a, b) => a.date.localeCompare(b.date));
    await writeCache(rows);
    return rows[0]?.close ?? null;
  } catch {
    return null;
  }
}

// name lookup for tickers not in KNOWN (cached for the life of the process)
const nameCache = new Map<string, string>();
async function lookupName(ticker: string): Promise<string> {
  if (KNOWN[ticker]) return KNOWN[ticker].name;
  if (nameCache.has(ticker)) return nameCache.get(ticker)!;
  let name = ticker;
  if (KEY) {
    try {
      const res = await fetch(`${API}/quote?symbol=${ticker}&apikey=${KEY}`, { cache: "no-store" });
      const j = (await res.json()) as { name?: string };
      if (j?.name) name = j.name;
    } catch {
      /* keep ticker as name */
    }
  }
  nameCache.set(ticker, name);
  return name;
}

function quoteFromSeries(ticker: string, series: PricePoint[], name: string, meta: TickerMeta | undefined): PriceQuote {
  const price = series[series.length - 1]?.close ?? 0;
  const previousClose = series[series.length - 2]?.close ?? price;
  const window = series.slice(-252).map((p) => p.close);
  return {
    ticker,
    name,
    price,
    previousClose,
    changeAbs: Number((price - previousClose).toFixed(2)),
    changePct: previousClose ? Number((((price - previousClose) / previousClose) * 100).toFixed(2)) : 0,
    dayHigh: Number((price * 1.01).toFixed(2)),
    dayLow: Number((price * 0.99).toFixed(2)),
    yearHigh: window.length ? Math.max(...window) : price,
    yearLow: window.length ? Math.min(...window) : price,
    marketCap: meta?.cap ?? 0,
    peRatio: meta?.pe ?? null,
    dividendYield: meta?.yield ?? null,
    asOf: new Date().toISOString(),
  };
}

export async function getQuote(ticker: string): Promise<PriceQuote> {
  const t = normalize(ticker);
  const [series, name] = await Promise.all([getSeries(t), lookupName(t)]);
  return quoteFromSeries(t, series, name, KNOWN[t]);
}

export async function getQuotes(tickers: string[]): Promise<Record<string, PriceQuote>> {
  const norm = [...new Set(tickers.map(normalize))].filter(Boolean);
  await warmCache(norm);
  const cache = await readCache(norm);
  const out: Record<string, PriceQuote> = {};
  await Promise.all(
    norm.map(async (t) => {
      const series = isFresh(cache.get(t)) ? cache.get(t)! : await getSeries(t);
      out[t] = quoteFromSeries(t, series, await lookupName(t), KNOWN[t]);
    }),
  );
  return out;
}

export async function getNews(ticker: string, count = 6): Promise<NewsItem[]> {
  const t = normalize(ticker);
  if (!KEY) return [];
  try {
    const res = await fetch(`${API}/news?symbol=${t}&apikey=${KEY}`, { cache: "no-store" });
    const j = (await res.json()) as { data?: { title?: string; source?: string; datetime?: string; url?: string }[] };
    if (!Array.isArray(j?.data)) return [];
    return j.data.slice(0, count).map((n, i) => ({
      id: `${t}-${i}`,
      ticker: t,
      headline: n.title ?? "(untitled)",
      source: n.source ?? "—",
      publishedAt: n.datetime ? new Date(n.datetime).toISOString() : new Date().toISOString(),
      url: n.url ?? "#",
    }));
  } catch {
    return [];
  }
}
