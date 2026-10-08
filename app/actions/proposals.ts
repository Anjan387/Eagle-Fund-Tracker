"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor, requireUser } from "@/lib/auth";
import {
  deleteAttachment,
  MAX_ATTACHMENT_BYTES,
  uploadAttachment,
} from "@/lib/attachments";
import {
  castVote,
  createProposal,
  decideProposal,
  getProposalById,
  getStrategyById,
} from "@/lib/store";
import type { TradeAction, VoteChoice } from "@/lib/types";

const VOTE_CHOICES: VoteChoice[] = ["in_favor", "against", "needs_review"];

export interface ProposalFormState {
  error?: string;
  ok?: boolean;
  message?: string;
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
  const file = formData.get("file");

  if (!ticker) return { error: "Ticker is required." };
  if (action !== "buy" && action !== "sell") return { error: "Choose buy or sell." };
  if (!Number.isFinite(shares) || shares <= 0) return { error: "Shares must be a positive number." };
  if (!(await getStrategyById(strategyId))) return { error: "Choose a strategy." };
  if (rationale.length < 20) return { error: "Give at least a sentence or two of rationale." };
  if (file instanceof File && file.size > MAX_ATTACHMENT_BYTES) {
    return { error: `That attachment is larger than the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB limit.` };
  }

  const proposal = await createProposal({ ticker, action, shares, strategyId, rationale, proposedBy: user.id });

  let message = "Proposal submitted to the advisor queue.";
  if (file instanceof File && file.size > 0) {
    try {
      await uploadAttachment({ proposalId: proposal.id, file, uploadedBy: user.id });
      message = "Proposal submitted, with your attachment.";
    } catch (e) {
      // The proposal itself is already saved - don't lose it over a failed
      // upload. Just tell the PM they'll need to attach it again below.
      message = `Proposal submitted, but the attachment failed to upload (${
        e instanceof Error ? e.message : "unknown error"
      }) - attach it again below.`;
    }
  }

  revalidatePath("/proposals");
  return { ok: true, message };
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

// PMs only, per spec — the advisor is the audience for the vote tally, not a
// voter. Only while a proposal is still pending; the real status is always
// re-checked here rather than trusted from the client.
export async function castProposalVote(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "pm") return;

  const proposalId = String(formData.get("proposalId") ?? "");
  const vote = String(formData.get("vote") ?? "") as VoteChoice;
  if (!proposalId || !VOTE_CHOICES.includes(vote)) return;

  const proposal = await getProposalById(proposalId);
  if (!proposal || proposal.status !== "pending") return;

  await castVote({ proposalId, voterId: user.id, vote });
  revalidatePath("/proposals");
}

export interface AttachmentFormState {
  error?: string;
  ok?: boolean;
}

// Any PM or the advisor can attach supporting files (research, an Excel
// model, a term sheet) to any proposal - not just one's own, since due
// diligence is meant to be shared.
export async function attachFileToProposal(
  _prev: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const user = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const file = formData.get("file");

  if (!proposalId) return { error: "Unknown proposal." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to attach." };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: `That file is larger than the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB limit.` };
  }

  try {
    await uploadAttachment({ proposalId, file, uploadedBy: user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
  revalidatePath("/proposals");
  return { ok: true };
}

// Only the person who uploaded a file, or the advisor, can remove it.
export async function removeAttachment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const uploadedBy = String(formData.get("uploadedBy") ?? "");
  if (!attachmentId) return;
  if (user.role !== "advisor" && user.id !== uploadedBy) return;
  await deleteAttachment(attachmentId);
  revalidatePath("/proposals");
}
