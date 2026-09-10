import { NextResponse, type NextRequest } from "next/server";
import { refreshStale } from "@/lib/prices";
import { trackedTickers } from "@/lib/tickers";

// Price top-up. Vercel Cron (see vercel.json) calls this once a day with
// `Authorization: Bearer $CRON_SECRET`. Manual run: /api/refresh-prices?key=<CRON_SECRET>
// Refreshes the most-stale tickers, capped so the run fits in `maxDuration` and
// Twelve Data's 8-credits/minute free tier. `?max=` overrides the cap.

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

  return NextResponse.json({
    ok: true,
    ...result,
    checked: tickers.length,
    ranAt: new Date().toISOString(),
  });
}
