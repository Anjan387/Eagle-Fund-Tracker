import { NextResponse, type NextRequest } from "next/server";
import { getFundOverview } from "@/lib/fund";
import { refreshStale } from "@/lib/prices";
import { upsertFundValueSnapshot } from "@/lib/store";
import { trackedTickers } from "@/lib/tickers";

// Price top-up. Vercel Cron (see vercel.json) calls this once a day with
// `Authorization: Bearer $CRON_SECRET`. Manual run: /api/refresh-prices?key=<CRON_SECRET>
// Refreshes the most-stale tickers, capped so the run fits in `maxDuration` and
// Twelve Data's 8-credits/minute free tier. `?max=` overrides the cap.
//
// Also records today's fund value in fund_value_history — the daily
// snapshots the automated trailing-12-month return engine (lib/fund.ts)
// needs. This is the only thing that makes that engine "go live" over time,
// so it must run even on a day when every ticker was already fresh.

export const maxDuration = 60;

const DEFAULT_MAX = 7;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !secret ||
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("key") === secret;

  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const max = Number(request.nextUrl.searchParams.get("max") ?? DEFAULT_MAX) || DEFAULT_MAX;
  const tickers = await trackedTickers();
  const result = await refreshStale(tickers, max);

  const overview = await getFundOverview();
  await upsertFundValueSnapshot({
    date: new Date().toISOString().slice(0, 10),
    fundValue: overview.fundValue,
    investedValue: overview.investedValue,
    cashBalance: overview.cashBalance,
  });

  return NextResponse.json({
    ok: true,
    ...result,
    checked: tickers.length,
    ranAt: new Date().toISOString(),
  });
}
