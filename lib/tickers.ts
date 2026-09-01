import "server-only";
import { admin } from "./supabase/admin";

// Tickers shown on the Research desk's "Quick look" grid.
export const WATCHLIST = [
  "SPY", "QQQ", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "INTU", "BRK.B", "COST", "JPM", "V",
];

/** Distinct open-holding tickers plus the watchlist — everything the app shows by default. */
export async function trackedTickers(): Promise<string[]> {
  const { data } = await admin().from("holdings").select("ticker").eq("status", "open");
  const held = (data ?? []).map((r) => r.ticker as string);
  return [...new Set([...held, ...WATCHLIST])];
}
