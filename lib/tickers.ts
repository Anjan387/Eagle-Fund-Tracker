import "server-only";
import { admin } from "./supabase/admin";

// Tickers shown on the Research desk's "Quick look" grid.
export const WATCHLIST = [
  "SPY", "QQQ", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "INTU", "BRK.B", "COST", "JPM", "V",
];

/** Distinct tickers of the fund's open holdings. */
export async function heldTickers(): Promise<string[]> {
  const { data } = await admin().from("holdings").select("ticker").eq("status", "open");
  return [...new Set((data ?? []).map((r) => r.ticker as string))];
}

/** Distinct open-holding tickers plus the watchlist — everything the app shows by default. */
export async function trackedTickers(): Promise<string[]> {
  return [...new Set([...(await heldTickers()), ...WATCHLIST])];
}
