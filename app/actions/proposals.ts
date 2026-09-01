"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor, requireUser } from "@/lib/auth";
import { createProposal, decideProposal, getStrategyById } from "@/lib/store";
import type { TradeAction } from "@/lib/types";

export interface ProposalFormState {
  error?: string;
  ok?: boolean;
}

export async function submitProposal(
  _prev: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  const user = await requireUser();

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const action = String(formData.get("action") ?? "") as TradeAction;
  const shares = Number(formData.get("shares"));
  const strategyId = String(formData.get("strategyId") ?? "");
  const rationale = String(formData.get("rationale") ?? "").trim();

  if (!ticker) return { error: "Ticker is required." };
  if (action !== "buy" && action !== "sell") return { error: "Choose buy or sell." };
  if (!Number.isFinite(shares) || shares <= 0) return { error: "Shares must be a positive number." };
  if (!(await getStrategyById(strategyId))) return { error: "Choose a strategy." };
  if (rationale.length < 20) return { error: "Give at least a sentence or two of rationale." };

  await createProposal({ ticker, action, shares, strategyId, rationale, proposedBy: user.id });
  revalidatePath("/proposals");
  return { ok: true };
}

export async function resolveProposal(formData: FormData): Promise<void> {
  const advisor = await requireAdvisor();
  const proposalId = String(formData.get("proposalId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const decisionNote = String(formData.get("decisionNote") ?? "").trim();
  if (!proposalId || (decision !== "approved" && decision !== "rejected")) return;

  await decideProposal({ proposalId, decision, decidedBy: advisor.id, decisionNote });
  revalidatePath("/proposals");
}
