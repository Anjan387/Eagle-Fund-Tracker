import { NextResponse, type NextRequest } from "next/server";
import { refreshStale } from "@/lib/prices";
import { trackedTickers } from "@/lib/tickers";

// Hourly price top-up. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
// For a manual run:  /api/refresh-prices?key=<CRON_SECRET>
// Each call refreshes up to 6 of the most stale tickers to stay within the
// serverless time limit and Twelve Data's 8-credits/minute free tier.

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !secret ||
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("key") === secret;

  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const max = Number(request.nextUrl.searchParams.get("max") ?? 6) || 6;
  const tickers = await trackedTickers();
  const result = await refreshStale(tickers, max);

  return NextResponse.json({
    ok: true,
    ...result,
    checked: tickers.length,
    ranAt: new Date().toISOString(),
  });
}
