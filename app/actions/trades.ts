"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor } from "@/lib/auth";
import { addTrade, getStrategyById } from "@/lib/store";
import type { TradeAction } from "@/lib/types";

export interface TradeFormState {
  error?: string;
  ok?: boolean;
}

export async function recordTrade(
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  const advisor = await requireAdvisor();

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const action = String(formData.get("action") ?? "") as TradeAction;
  const shares = Number(formData.get("shares"));
  const price = Number(formData.get("price"));
  const tradeDate = String(formData.get("tradeDate") ?? "");
  const strategyId = String(formData.get("strategyId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const proposalId = String(formData.get("proposalId") ?? "").trim() || undefined;

  if (!ticker) return { error: "Ticker is required." };
  if (action !== "buy" && action !== "sell") return { error: "Choose buy or sell." };
  if (!Number.isFinite(shares) || shares <= 0) return { error: "Shares must be a positive number." };
  if (!Number.isFinite(price) || price <= 0) return { error: "Price must be a positive number." };
  if (!tradeDate) return { error: "Trade date is required." };
  if (!(await getStrategyById(strategyId))) return { error: "Choose a strategy." };

  await addTrade({
    ticker,
    action,
    shares,
    price,
    tradeDate,
    strategyId,
    enteredBy: advisor.id,
    source: proposalId ? "approved_proposal" : "advisor_entry",
    notes: notes || undefined,
    proposalId,
  });

  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/overview");
  revalidatePath("/proposals");
  return { ok: true };
}
