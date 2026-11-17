// Historical episodes: what would today's holdings have returned between two
// past dates? (See EPISODES in content/analytics.ts.)
//
// For each holding the answer comes from, in order:
//   1. its own closes on the two dates, if it traded then;
//   2. otherwise the stand-ins listed in PROXIES (which may have stand-ins of
//      their own);
//   3. otherwise 0% - held flat, and flagged so the reader knows.
//
// Old closes are fetched from the market-data API once and kept in the price
// cache for good. "This ticker has no data for that episode" is remembered
// too, as a marker row whose ticker starts with NO_DATA - a name no real
// lookup can ever ask for - so the API is not asked the same question on
// every page view. Real tickers are upper-case, so the marker cannot collide.

import "server-only";
import { BENCHMARK, DEFAULT_PROXY, EPISODES, MARKET, PROXIES, type Episode } from "@/content/analytics";
import { fetchCloses } from "@/lib/prices";
import { admin } from "@/lib/supabase/admin";

const NO_DATA = "nodata_"; // real tickers are upper-case letters and dots only
const API_BUDGET = 6; // new lookups per page view; the free tier allows 8 a minute

export type EpisodeSource = "own" | "proxy" | "flat" | "pending";

export interface EpisodeRow {
  ticker: string;
  name: string;
  sleeveName: string;
  weightPct: number;
  /** return over the episode, %; null while its prices are still being fetched */
  retPct: number | null;
  /** dollars gained or lost on today's position */
  usd: number | null;
  source: EpisodeSource;
  /** what the return was built from, in words */
  basis: string;
}

export interface EpisodeResult extends Episode {
  marketPct: number | null;
  benchPct: number | null;
  fundPct: number | null;
  fundUsd: number | null;
  rows: EpisodeRow[];
  sleeves: { name: string; pts: number }[];
  /** share of the fund priced from each source, % */
  coverage: Record<EpisodeSource, number>;
  pending: number;
}

type Close = number | "none" | undefined; // undefined = not known yet

interface Resolved {
  ret: number;
  source: Exclude<EpisodeSource, "pending">;
  basis: string;
}

export async function loadEpisodes(
  holdings: { ticker: string; name: string; sleeveName: string; value: number; weightPct: number }[],
): Promise<EpisodeResult[]> {
  // every ticker that could be needed: holdings, benchmark, market, and the stand-in chains
  const tickers = new Set<string>([...holdings.map((h) => h.ticker), ...BENCHMARK.map((b) => b.ticker), MARKET.ticker]);
  const queue = [...tickers, ...DEFAULT_PROXY.map(([t]) => t)];
  while (queue.length) {
    const t = queue.pop()!;
    tickers.add(t);
    for (const [p] of PROXIES[t] ?? []) if (!tickers.has(p)) queue.push(p);
  }

  // ---- what the cache already knows ------------------------------------------------
  // Episode dates are trading days, so every lookup is for the close on exactly
  // that date: the peak day and the trough day, never a neighbor.
  const dates = [...new Set(EPISODES.flatMap((e) => [e.start, e.end]))];
  const closes = new Map<string, number>(); // `${ticker}|${date}` -> close
  const noData = new Set<string>(); // `${ticker}|${date}`
  await Promise.all(
    [...tickers].map(async (t) => {
      const { data } = await admin()
        .from("price_cache")
        .select("ticker,date,close")
        .in("ticker", [t, NO_DATA + t])
        .in("date", dates);
      for (const r of data ?? []) {
        const key = `${t}|${String(r.date).slice(0, 10)}`;
        if (r.ticker === t) closes.set(key, Number(r.close));
        else noData.add(key);
      }
    }),
  );
  const closeOn = (t: string, date: string): Close =>
    closes.get(`${t}|${date}`) ?? (noData.has(`${t}|${date}`) ? "none" : undefined);

  // ---- fill gaps from the API, a few per page view -----------------------------------
  let budget = API_BUDGET;
  const markNoData = async (t: string, date: string) => {
    noData.add(`${t}|${date}`);
    await admin().from("price_cache").upsert([{ ticker: NO_DATA + t, date, close: 0 }], { onConflict: "ticker,date" });
  };
  const fetched = new Set<string>();
  async function ensure(t: string, e: Episode): Promise<void> {
    const key = `${t}|${e.id}`;
    if (fetched.has(key)) return;
    fetched.add(key);
    const s = closeOn(t, e.start);
    if (s === "none") return; // did not trade at the start: the end does not matter
    if (s !== undefined && closeOn(t, e.end) !== undefined) return;
    if (budget <= 0) return;
    budget--;
    // one request for the whole episode; only its first and last day are kept
    const points = await fetchCloses(t, e.start, e.end, (d) => d === e.start || d === e.end);
    if (points === null) return; // rate limit or network: try again on a later view
    for (const p of points) if (p.date === e.start || p.date === e.end) closes.set(`${t}|${p.date}`, p.close);
    if (closeOn(t, e.start) === undefined) await markNoData(t, e.start);
    else if (closeOn(t, e.end) === undefined) await markNoData(t, e.end);
  }

  // ---- resolve one ticker's return over one episode ------------------------------------
  async function resolve(t: string, e: Episode, depth = 0): Promise<Resolved | "pending"> {
    await ensure(t, e);
    const s = closeOn(t, e.start);
    const x = s === "none" ? "none" : closeOn(t, e.end);
    if (typeof s === "number" && typeof x === "number") {
      return { ret: x / s - 1, source: "own", basis: "its own prices" };
    }
    if (s === undefined || x === undefined) return "pending";

    const proxies = PROXIES[t] ?? DEFAULT_PROXY;
    if (proxies.length === 0 || depth >= 3) {
      return { ret: 0, source: "flat", basis: "nothing comparable existed; held flat" };
    }
    let ret = 0;
    const parts: { ticker: string; weight: number; r: Resolved }[] = [];
    for (const [p, weight] of proxies) {
      const r = await resolve(p, e, depth + 1);
      if (r === "pending") return "pending";
      ret += weight * r.ret;
      parts.push({ ticker: p, weight, r });
    }
    // every stand-in was itself held flat: so is this holding, and it says so
    if (parts.every((x) => x.r.source === "flat")) {
      return { ret: 0, source: "flat", basis: `nothing comparable existed (not even ${parts.map((x) => x.ticker).join(", ")}); held flat` };
    }
    const label = ({ ticker, weight, r }: (typeof parts)[number]) => {
      const name = weight === 1 ? ticker : `${Math.round(weight * 100)}% ${ticker}`;
      if (r.source === "flat") return `${name} (held flat)`;
      // a stand-in that is itself built from stand-ins names them
      return r.source === "proxy" ? `${name} (via ${r.basis.replace(/^stand-in: /, "")})` : name;
    };
    return { ret, source: "proxy", basis: `stand-in: ${parts.map(label).join(" + ")}` };
  }

  const results: EpisodeResult[] = [];
  for (const e of EPISODES) {
    const rows: EpisodeRow[] = [];
    for (const h of holdings) {
      const r = await resolve(h.ticker, e);
      rows.push(
        r === "pending"
          ? { ticker: h.ticker, name: h.name, sleeveName: h.sleeveName, weightPct: h.weightPct, retPct: null, usd: null, source: "pending", basis: "prices still loading" }
          : { ticker: h.ticker, name: h.name, sleeveName: h.sleeveName, weightPct: h.weightPct, retPct: r.ret * 100, usd: h.value * r.ret, source: r.source, basis: r.basis },
      );
    }
    const pending = rows.filter((r) => r.source === "pending").length;

    let benchPct: number | null = 0;
    for (const b of BENCHMARK) {
      const r = await resolve(b.ticker, e);
      benchPct = r === "pending" || benchPct === null ? null : benchPct + b.weight * r.ret * 100;
    }
    const mkt = await resolve(MARKET.ticker, e);

    const coverage: Record<EpisodeSource, number> = { own: 0, proxy: 0, flat: 0, pending: 0 };
    for (const r of rows) coverage[r.source] += r.weightPct;
    const sleeveNames = [...new Set(rows.map((r) => r.sleeveName))];

    results.push({
      ...e,
      marketPct: mkt === "pending" ? null : mkt.ret * 100,
      benchPct,
      // weights are of total fund value, so cash counts as flat
      fundPct: pending ? null : rows.reduce((s, r) => s + (r.weightPct / 100) * (r.retPct ?? 0), 0),
      fundUsd: pending ? null : rows.reduce((s, r) => s + (r.usd ?? 0), 0),
      rows: rows.sort((a, b) => (a.usd ?? 0) - (b.usd ?? 0)),
      sleeves: sleeveNames.map((name) => ({
        name,
        pts: rows.filter((r) => r.sleeveName === name).reduce((s, r) => s + (r.weightPct / 100) * (r.retPct ?? 0), 0),
      })),
      coverage,
      pending,
    });
  }
  return results;
}
