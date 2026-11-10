"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createDecision,
  createDocumentUpload,
  deleteDecision,
  deleteDocument,
  getDecisionById,
  getDocumentById,
  recordDocument,
  setDocumentNote,
  updateDecision,
} from "@/lib/decisions";
import {
  DECISION_STATUSES,
  DOCUMENT_KINDS,
  extensionOf,
  MAX_DOCUMENT_BYTES,
  REVIEW_OUTCOMES,
  thesisIsEmpty,
  type DecisionInput,
  type DecisionStatus,
  type ReviewOutcome,
} from "@/lib/decision-types";
import { searchSymbols } from "@/lib/prices";
import { getStrategyById } from "@/lib/store";

// Server side of the Decision Log. Any signed-in member can add and edit
// decisions and file documents; deleting a decision is for advisors (anyone
// may delete the labelled sample), and a document can be removed by whoever
// uploaded it or by an advisor.

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string | null {
  const s = typeof value === "string" ? value.trim().slice(0, max) : "";
  return s || null;
}
function isDay(value: unknown): value is string {
  return typeof value === "string" && DAY.test(value) && !Number.isNaN(Date.parse(value));
}

/** Checks everything that came from the browser and returns a clean record, or what's wrong. */
async function clean(raw: DecisionInput, selfId: string | null): Promise<DecisionInput | string> {
  const ticker = String(raw.ticker ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker)) return "Enter a ticker.";
  if (raw.action !== "buy" && raw.action !== "sell") return "Choose Buy or Sell.";
  if (!isDay(raw.decisionDate)) return "Enter the decision date.";
  const thesisSummary = text(raw.thesisSummary, 240);
  if (!thesisSummary) return "Add a one-line thesis summary.";
  if (!DECISION_STATUSES.includes(raw.status as DecisionStatus)) return "Choose a status.";

  const strategyId = text(raw.strategyId, 60);
  if (strategyId && !(await getStrategyById(strategyId))) return "Choose a sleeve from the list.";

  const numbers = {
    shares: raw.shares,
    price: raw.price,
    positionPct: raw.positionPct,
    votesFor: raw.votesFor,
    votesAgainst: raw.votesAgainst,
    votesAbstain: raw.votesAbstain,
    intrinsicValue: raw.intrinsicValue,
    priceTarget: raw.priceTarget,
    reviewReturnPct: raw.reviewReturnPct,
    reviewBenchmarkPct: raw.reviewBenchmarkPct,
  };
  for (const [name, value] of Object.entries(numbers)) {
    if (value == null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) return `"${name}" must be a number.`;
    if (!name.startsWith("review") && value < 0) return `"${name}" can't be negative.`;
    if (name.startsWith("votes") && !Number.isInteger(value)) return "Vote counts must be whole numbers.";
  }

  let thesis = raw.thesis ?? null;
  if (thesis && (typeof thesis !== "object" || thesis.type !== "doc")) return "The thesis couldn't be read.";
  if (thesis && JSON.stringify(thesis).length > 300_000) return "The thesis is too long to save.";
  if (thesisIsEmpty(thesis)) thesis = null;

  for (const link of [raw.relatedDecisionId, raw.proposalId, raw.tradeId]) {
    if (link != null && !UUID.test(link)) return "One of the linked records couldn't be read.";
  }
  if (raw.relatedDecisionId && raw.relatedDecisionId === selfId) return "A decision can't be linked to itself.";
  if (raw.reviewOutcome != null && !REVIEW_OUTCOMES.includes(raw.reviewOutcome as ReviewOutcome)) {
    return "Choose a review outcome from the list.";
  }
  if (raw.reviewedOn != null && !isDay(raw.reviewedOn)) return "Enter a valid review date.";

  return {
    ticker,
    action: raw.action,
    decisionDate: raw.decisionDate,
    thesisSummary,
    status: raw.status,
    companyName: text(raw.companyName, 160),
    strategyId,
    ...numbers,
    analysts: text(raw.analysts, 300),
    thesis,
    valuationMethod: text(raw.valuationMethod, 300),
    reviewOutcome: raw.reviewOutcome ?? null,
    reviewNotes: text(raw.reviewNotes, 5000),
    reviewLessons: text(raw.reviewLessons, 5000),
    reviewedOn: raw.reviewedOn ?? null,
    relatedDecisionId: raw.relatedDecisionId ?? null,
    proposalId: raw.proposalId ?? null,
    tradeId: raw.tradeId ?? null,
  };
}

/** Creates a decision (id = null) or saves changes to one. */
export async function saveDecision(id: string | null, raw: DecisionInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const input = await clean(raw, id);
  if (typeof input === "string") return fail(input);

  if (!input.companyName) {
    // best effort: fill in the company's name from the same search the ticker box uses
    try {
      input.companyName = (await searchSymbols(input.ticker)).find((r) => r.symbol === input.ticker)?.name ?? null;
    } catch {
      /* leave it blank */
    }
  }

  try {
    if (id) {
      if (!(await getDecisionById(id))) return fail("That decision no longer exists.");
      await updateDecision(id, input, user.id);
    } else {
      id = await createDecision(input, user.id);
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't save the decision.");
  }
  revalidatePath("/decisions");
  return { ok: true, id };
}

export async function removeDecision(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const decision = await getDecisionById(id);
  if (!decision) return { ok: true };
  if (user.role !== "advisor" && !decision.isSample) return fail("Only a faculty advisor can delete a decision.");
  try {
    await deleteDecision(id);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't delete the decision.");
  }
  revalidatePath("/decisions");
  return { ok: true };
}

/** Step 1 of an upload: checks the file and hands the browser a one-off upload token. */
export async function startDocumentUpload(input: {
  decisionId: string;
  fileName: string;
  sizeBytes: number;
}): Promise<ActionResult<{ bucket: string; path: string; token: string }>> {
  await requireUser();
  if (!DOCUMENT_KINDS[extensionOf(input.fileName)]) {
    return fail("That file type isn't supported. Use PDF, Excel, PowerPoint, Word or an image.");
  }
  if (!(input.sizeBytes > 0)) return fail("That file is empty.");
  if (input.sizeBytes > MAX_DOCUMENT_BYTES) {
    return fail(`That file is larger than the ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB limit.`);
  }
  if (!UUID.test(input.decisionId) || !(await getDecisionById(input.decisionId))) {
    return fail("That decision no longer exists.");
  }
  try {
    return { ok: true, ...(await createDocumentUpload(input.decisionId, input.fileName)) };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't start the upload.");
  }
}

/** Step 2: the file is in Storage; file it under the decision. */
export async function finishDocumentUpload(input: {
  decisionId: string;
  path: string;
  fileName: string;
  note: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID.test(input.decisionId) || !input.path.startsWith(`${input.decisionId}/`) || input.path.includes("..")) {
    return fail("That upload doesn't belong to this decision.");
  }
  try {
    await recordDocument({
      decisionId: input.decisionId,
      path: input.path,
      fileName: input.fileName.slice(0, 200),
      note: text(input.note, 300),
      uploadedBy: user.id,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't file the document.");
  }
  revalidatePath("/decisions");
  return { ok: true };
}

export async function saveDocumentNote(id: string, note: string): Promise<ActionResult> {
  await requireUser();
  try {
    await setDocumentNote(id, text(note, 300));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't save the note.");
  }
  revalidatePath("/decisions");
  return { ok: true };
}

export async function removeDocument(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const doc = await getDocumentById(id);
  if (!doc) return { ok: true };
  if (user.role !== "advisor" && doc.uploadedBy !== user.id) {
    return fail("Only the person who uploaded a document, or a faculty advisor, can remove it.");
  }
  await deleteDocument(id);
  revalidatePath("/decisions");
  return { ok: true };
}
