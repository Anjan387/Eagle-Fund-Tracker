import { NextResponse, type NextRequest } from "next/server";
import { getCurrentFundValue } from "@/lib/fund";
import { refreshDaily } from "@/lib/prices";
import { upsertFundValueSnapshot } from "@/lib/store";
import { trackedTickers } from "@/lib/tickers";

// Evening price refresh. Vercel Cron (see vercel.json) calls this once a day,
// after the US close, with `Authorization: Bearer $CRON_SECRET`.
// Manual run: /api/refresh-prices?key=<CRON_SECRET>
// Brings every tracked ticker up to the last completed session's close.
// `?max=` caps how many tickers one run touches; `?force=1` re-fetches tickers
// that already look current.
//
// Also records today's fund value in fund_value_history — the daily
// snapshots the automated trailing-12-month return engine (lib/fund.ts)
// needs. This is the only thing that makes that engine "go live" over time,
// so it must run even on a day when every ticker was already current. It uses
// getCurrentFundValue (not getFundOverview) deliberately: getFundOverview's
// trailing-return computation makes its own extra (network-bound)
// historical-price lookups that would compete with the refresh for API
// credits — they run lazily instead, the next time a page actually needs a
// computed return.

// The refresh goes in bursts a minute apart (see refreshDaily), so the full
// tracked set takes three to four minutes.
export const maxDuration = 300;

async function recordSnapshot() {
  const { fundValue, investedValue, cashBalance } = await getCurrentFundValue();
  await upsertFundValueSnapshot({
    date: new Date().toISOString().slice(0, 10),
    fundValue,
    investedValue,
    cashBalance,
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !secret ||
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("key") === secret;

  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const max = Number(params.get("max")) || undefined;
  const tickers = await trackedTickers();
  const result = await refreshDaily(tickers, {
    max,
    force: params.get("force") === "1",
    // An early snapshot, in case the run is cut short before the final one below.
    afterFirstBurst: recordSnapshot,
  });
  await recordSnapshot();

  return NextResponse.json({
    ok: true,
    ...result,
    checked: tickers.length,
    ranAt: new Date().toISOString(),
  });
}
