// Intraday quotes — the "moves with the market" layer on top of the daily
// closes in price_cache.
//
// There is no background worker here (Vercel Hobby cron is once a day), so
// quotes are refreshed on demand: while someone has Overview or Holdings open,
// the page polls /api/live-quotes, and each poll refreshes the few held
// tickers that are due. The latest quote per ticker lives in the live_quotes
// table, shared by every viewer, so ten people watching cost the same API
// credits as one.
//
// Only what the fund actually holds is tracked live, and never mutual funds —
// those publish one price a day, after the close.

import "server-only";
import { admin } from "./supabase/admin";
import { heldTickers } from "./tickers";

const API = "https://api.twelvedata.com";
const KEY = process.env.MARKET_DATA_API_KEY ?? "";

// Sized for Twelve Data's free tier (8 credits/minute, 800/day):
//  - 15 exchange-traded holdings x one quote every ~10 minutes over a 6.5-hour
//    session is ~585 credits, leaving room for the evening close refresh,
//    symbol search, and research lookups.
//  - at most 5 quotes in any one minute, leaving 3 for those same things.
// On a paid plan these two numbers are the only thing that needs to change.
const QUOTE_TTL_MS = 10 * 60_000;
const QUOTES_PER_MINUTE = 5;

// ---- US market clock (regular session, Eastern time) ----------------------
// Holidays aren't modelled: on one, the pill still reads "Live" and the quotes
// simply don't change.
const ET = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const GRACE_MIN = 20; // keep polling briefly after the bell so the last quote is the close

function etClock(now: Date) {
  const p = Object.fromEntries(ET.formatToParts(now).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: p.weekday !== "Sat" && p.weekday !== "Sun",
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

export function todayET(now = new Date()): string {
  return etClock(now).date;
}

/** True between the opening and closing bell on a weekday. */
export function isRegularSession(now = new Date()): boolean {
  const c = etClock(now);
  return c.weekday && c.minutes >= OPEN_MIN && c.minutes < CLOSE_MIN;
}

function inLiveWindow(now = new Date()): boolean {
  const c = etClock(now);
  return c.weekday && c.minutes >= OPEN_MIN && c.minutes < CLOSE_MIN + GRACE_MIN;
}

/** Date of the most recent weekday session that has already closed. */
export function lastCompletedSession(now = new Date()): string {
  const c = etClock(now);
  if (c.weekday && c.minutes >= CLOSE_MIN) return c.date;
  const d = new Date(`${c.date}T12:00:00Z`);
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

/** US mutual funds trade under five letters ending in X (VISGX, REMIX). */
function isMutualFund(ticker: string): boolean {
  return /^[A-Z]{4}X$/.test(ticker);
}

// ---- reads ----------------------------------------------------------------
export interface LiveQuote {
  ticker: string;
  price: number;
  prevClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  quoteDate: string;
  fetchedAt: string;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return value != null && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Latest intraday quote per ticker, for those that have one. Best-effort: an
 * empty map if the table isn't there yet (migration 005 not run) or the read
 * fails, so pricing just falls back to daily closes.
 */
export async function readLiveQuotes(tickers: string[]): Promise<Map<string, LiveQuote>> {
  const map = new Map<string, LiveQuote>();
  if (tickers.length === 0) return map;
  const { data, error } = await admin()
    .from("live_quotes")
    .select("ticker,price,prev_close,day_high,day_low,quote_date,fetched_at")
    .in("ticker", tickers);
  if (error) {
    console.error("readLiveQuotes:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const price = num(row.price);
    if (price == null || !row.quote_date || !row.fetched_at) continue;
    map.set(row.ticker, {
      ticker: row.ticker,
      price,
      prevClose: num(row.prev_close),
      dayHigh: num(row.day_high),
      dayLow: num(row.day_low),
      quoteDate: String(row.quote_date).slice(0, 10),
      fetchedAt: row.fetched_at,
    });
  }
  return map;
}

// ---- refresh --------------------------------------------------------------
interface QuoteRow {
  price: number;
  prev_close: number | null;
  day_high: number | null;
  day_low: number | null;
  quote_date: string;
}

/** One batched /quote call — a credit per symbol. Symbols that fail are just absent. */
async function fetchQuotes(tickers: string[]): Promise<Record<string, QuoteRow>> {
  const out: Record<string, QuoteRow> = {};
  try {
    const res = await fetch(
      `${API}/quote?symbol=${tickers.map(encodeURIComponent).join(",")}&apikey=${KEY}`,
      { cache: "no-store" },
    );
    const j = (await res.json()) as Record<string, unknown>;
    // A single symbol comes back as the quote itself; several come back keyed by symbol.
    const bySymbol = (tickers.length === 1 ? { [tickers[0]]: j } : j) as Record<
      string,
      Record<string, unknown> | undefined
    >;
    for (const t of tickers) {
      const q = bySymbol[t];
      const price = num(q?.close);
      if (!q || q.code || price == null || !q.datetime) continue;
      out[t] = {
        price,
        prev_close: num(q.previous_close),
        day_high: num(q.high),
        day_low: num(q.low),
        quote_date: String(q.datetime).slice(0, 10),
      };
    }
  } catch {
    /* rate-limited or offline: nothing updated this round */
  }
  return out;
}

export interface LiveStatus {
  /** false until migration 005 has been run */
  ready: boolean;
  /** the regular session is open right now */
  marketOpen: boolean;
  /** quotes are still being refreshed (session, plus a short grace after the close) */
  polling: boolean;
  /** when the most recent quote was fetched */
  asOf: string | null;
  /** tickers refreshed by this call */
  updated: string[];
}

/**
 * Refreshes the held tickers whose quote is older than QUOTE_TTL_MS, within
 * the per-minute budget, and reports where things stand. Safe to call from
 * many viewers at once: a ticker is claimed (claimed_at bumped, atomically per
 * row) before it is fetched, so two simultaneous polls don't both pay for it.
 * `force` skips the market-hours check (the TTL and budget still apply).
 */
export async function refreshDueQuotes(opts: { force?: boolean } = {}): Promise<LiveStatus> {
  const status: LiveStatus = {
    ready: true,
    marketOpen: isRegularSession(),
    polling: inLiveWindow(),
    asOf: null,
    updated: [],
  };
  const tickers = (await heldTickers()).filter((t) => !isMutualFund(t));
  const db = admin();

  const { data, error } = await db
    .from("live_quotes")
    .select("ticker,price,fetched_at,claimed_at")
    .in("ticker", tickers);
  if (error) {
    console.error("refreshDueQuotes:", error.message);
    return { ...status, ready: false };
  }
  const rows = data ?? [];
  for (const row of rows) {
    if (row.price != null && row.fetched_at && (!status.asOf || row.fetched_at > status.asOf)) {
      status.asOf = row.fetched_at;
    }
  }
  if (!KEY || tickers.length === 0 || !(status.polling || opts.force)) return status;

  // a newly bought ticker has no row yet: add one, already due
  const known = new Set(rows.map((r) => r.ticker));
  const missing = tickers.filter((t) => !known.has(t));
  if (missing.length) {
    await db
      .from("live_quotes")
      .upsert(missing.map((ticker) => ({ ticker })), { onConflict: "ticker", ignoreDuplicates: true });
  }

  const now = Date.now();
  const attempts = [
    ...rows.map((r) => ({ ticker: r.ticker as string, at: Date.parse(r.claimed_at) })),
    ...missing.map((ticker) => ({ ticker, at: 0 })),
  ];
  const budget = QUOTES_PER_MINUTE - attempts.filter((a) => now - a.at < 60_000).length;
  const due = attempts
    .filter((a) => now - a.at >= QUOTE_TTL_MS)
    .sort((a, b) => a.at - b.at || a.ticker.localeCompare(b.ticker))
    .slice(0, Math.max(0, budget))
    .map((a) => a.ticker);
  if (due.length === 0) return status;

  const stamp = new Date(now).toISOString();
  const { data: claimed } = await db
    .from("live_quotes")
    .update({ claimed_at: stamp })
    .in("ticker", due)
    .lt("claimed_at", new Date(now - QUOTE_TTL_MS).toISOString())
    .select("ticker");
  const mine = (claimed ?? []).map((r) => r.ticker as string);
  if (mine.length === 0) return status;

  const quotes = await fetchQuotes(mine);
  const fresh = mine
    .filter((t) => quotes[t])
    .map((t) => ({ ticker: t, ...quotes[t], fetched_at: stamp, claimed_at: stamp }));
  if (fresh.length) {
    const { error: writeError } = await db.from("live_quotes").upsert(fresh, { onConflict: "ticker" });
    if (!writeError) {
      status.updated = fresh.map((r) => r.ticker);
      status.asOf = stamp;
    }
  }
  return status;
}
