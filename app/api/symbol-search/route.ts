import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchSymbols } from "@/lib/prices";

// Backs the autocomplete search box (components/StockSearch.tsx). A thin
// proxy so that "use client" component can reach the server-only Twelve Data
// key. Signed-in users only — returns 401 JSON rather than redirecting, since
// this is called from fetch(), not a page navigation.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  const results = await searchSymbols(q);
  return NextResponse.json({ results });
}
