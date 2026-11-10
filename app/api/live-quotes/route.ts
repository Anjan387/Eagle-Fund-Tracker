import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { refreshDueQuotes } from "@/lib/live";

// Polled by components/LiveStatus.tsx while Overview or Holdings is open. Each
// call refreshes the held tickers whose intraday quote is due (lib/live.ts
// keeps that inside the Twelve Data budget however many people are watching)
// and reports whether anything changed, so the page knows to re-render.
// Signed-in users only — 401 JSON rather than a redirect, since this is called
// from fetch(). For testing outside market hours:
// /api/live-quotes?key=<CRON_SECRET>&force=1
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const keyed = !!secret && request.nextUrl.searchParams.get("key") === secret;
  if (!keyed && !(await getCurrentUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = keyed && request.nextUrl.searchParams.get("force") === "1";
  return NextResponse.json(await refreshDueQuotes({ force }), {
    headers: { "Cache-Control": "no-store" },
  });
}
