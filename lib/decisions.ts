// Decision Log data access — the `decisions` and `decision_documents` tables
// (migration 006) and the private "decision-documents" Storage bucket.
//
// Files never pass through this app's server: the browser uploads straight to
// Storage with a one-off signed URL issued here (Vercel caps request bodies at
// about 4.5MB, well under a pitch deck), and reads go through short-lived
// signed URLs.

import "server-only";
import { admin } from "./supabase/admin";
import {
  extensionOf,
  thesisText,
  type Decision,
  type DecisionDocument,
  type DecisionInput,
} from "./decision-types";

const BUCKET = "decision-documents";

type Row = Record<string, any>;

const num = (v: unknown): number | null => (v == null ? null : Number(v));
const day = (v: unknown): string | null => (v == null ? null : String(v).slice(0, 10));

function rowToDecision(r: Row): Decision {
  return {
    id: r.id,
    ticker: r.ticker,
    companyName: r.company_name,
    action: r.action,
    decisionDate: String(r.decision_date).slice(0, 10),
    status: r.status,
    strategyId: r.strategy_id,
    thesisSummary: r.thesis_summary,
    shares: num(r.shares),
    price: num(r.price),
    positionPct: num(r.position_pct),
    analysts: r.analysts,
    votesFor: num(r.votes_for),
    votesAgainst: num(r.votes_against),
    votesAbstain: num(r.votes_abstain),
    thesis: r.thesis,
    thesisText: r.thesis_text ?? "",
    valuationMethod: r.valuation_method,
    intrinsicValue: num(r.intrinsic_value),
    priceTarget: num(r.price_target),
    reviewOutcome: r.review_outcome,
    reviewNotes: r.review_notes,
    reviewReturnPct: num(r.review_return_pct),
    reviewBenchmarkPct: num(r.review_benchmark_pct),
    reviewLessons: r.review_lessons,
    reviewedOn: day(r.reviewed_on),
    relatedDecisionId: r.related_decision_id,
    proposalId: r.proposal_id,
    tradeId: r.trade_id,
    isSample: !!r.is_sample,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function rowToDocument(r: Row): DecisionDocument {
  return {
    id: r.id,
    decisionId: r.decision_id,
    fileName: r.file_name,
    contentType: r.content_type,
    sizeBytes: Number(r.size_bytes),
    note: r.note,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  };
}

function inputToRow(input: DecisionInput): Row {
  return {
    ticker: input.ticker,
    company_name: input.companyName,
    action: input.action,
    decision_date: input.decisionDate,
    status: input.status,
    strategy_id: input.strategyId,
    thesis_summary: input.thesisSummary,
    shares: input.shares,
    price: input.price,
    position_pct: input.positionPct,
    analysts: input.analysts,
    votes_for: input.votesFor,
    votes_against: input.votesAgainst,
    votes_abstain: input.votesAbstain,
    thesis: input.thesis,
    thesis_text: thesisText(input.thesis),
    valuation_method: input.valuationMethod,
    intrinsic_value: input.intrinsicValue,
    price_target: input.priceTarget,
    review_outcome: input.reviewOutcome,
    review_notes: input.reviewNotes,
    review_return_pct: input.reviewReturnPct,
    review_benchmark_pct: input.reviewBenchmarkPct,
    review_lessons: input.reviewLessons,
    reviewed_on: input.reviewedOn,
    related_decision_id: input.relatedDecisionId,
    proposal_id: input.proposalId,
    trade_id: input.tradeId,
  };
}

// ---- reads --------------------------------------------------------------------

/**
 * The whole log, newest decision first. `ready` is false while migration 006
 * hasn't been run, so the page can say so instead of failing.
 */
export async function getDecisionLog(): Promise<{
  ready: boolean;
  decisions: Decision[];
  documents: DecisionDocument[];
}> {
  const [decisions, documents] = await Promise.all([
    admin()
      .from("decisions")
      .select("*")
      .order("decision_date", { ascending: false })
      .order("created_at", { ascending: false }),
    admin().from("decision_documents").select("*").order("created_at", { ascending: false }),
  ]);
  if (decisions.error || documents.error) {
    console.error(`getDecisionLog: ${(decisions.error ?? documents.error)!.message}`);
    return { ready: false, decisions: [], documents: [] };
  }
  return {
    ready: true,
    decisions: (decisions.data ?? []).map(rowToDecision),
    documents: (documents.data ?? []).map(rowToDocument),
  };
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const { data } = await admin().from("decisions").select("*").eq("id", id).maybeSingle();
  return data ? rowToDecision(data) : null;
}

export async function getDocumentsForDecision(decisionId: string): Promise<DecisionDocument[]> {
  const { data } = await admin()
    .from("decision_documents")
    .select("*")
    .eq("decision_id", decisionId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToDocument);
}

// ---- writes -------------------------------------------------------------------

export async function createDecision(input: DecisionInput, userId: string): Promise<string> {
  const { data, error } = await admin()
    .from("decisions")
    .insert({ ...inputToRow(input), created_by: userId, updated_by: userId })
    .select("id")
    .single();
  if (error) throw new Error(`createDecision: ${error.message}`);
  return data.id;
}

export async function updateDecision(id: string, input: DecisionInput, userId: string): Promise<void> {
  const { error } = await admin()
    .from("decisions")
    .update({ ...inputToRow(input), updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateDecision: ${error.message}`);
}

/** Deletes the folder and everything filed in it. */
export async function deleteDecision(id: string): Promise<void> {
  const { data: docs } = await admin().from("decision_documents").select("storage_path").eq("decision_id", id);
  const { error } = await admin().from("decisions").delete().eq("id", id); // documents rows cascade
  if (error) throw new Error(`deleteDecision: ${error.message}`);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await admin().storage.from(BUCKET).remove(paths);
}

// ---- documents ------------------------------------------------------------------

/** A one-off URL token the browser uses to upload one file straight to Storage. */
export async function createDocumentUpload(
  decisionId: string,
  fileName: string,
): Promise<{ bucket: string; path: string; token: string }> {
  const ext = extensionOf(fileName);
  const path = `${decisionId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createDocumentUpload: ${error?.message ?? "no upload URL"}`);
  return { bucket: BUCKET, path, token: data.token };
}

/**
 * Files an uploaded object under its decision. Size and content type are read
 * back from Storage rather than taken from the browser's word, since the
 * content type decides whether the file may be previewed in the page.
 */
export async function recordDocument(input: {
  decisionId: string;
  path: string;
  fileName: string;
  note: string | null;
  uploadedBy: string;
}): Promise<void> {
  const { data: info, error: infoError } = await admin().storage.from(BUCKET).info(input.path);
  if (infoError || !info) throw new Error("That file didn't finish uploading. Try again.");

  const { error } = await admin().from("decision_documents").insert({
    decision_id: input.decisionId,
    storage_path: input.path,
    file_name: input.fileName,
    content_type: info.contentType ?? null,
    size_bytes: info.size ?? 0,
    note: input.note,
    uploaded_by: input.uploadedBy,
  });
  if (error) {
    await admin().storage.from(BUCKET).remove([input.path]); // don't leave an orphaned file behind
    throw new Error(`recordDocument: ${error.message}`);
  }
}

export async function getDocumentById(
  id: string,
): Promise<(DecisionDocument & { storagePath: string }) | null> {
  const { data } = await admin().from("decision_documents").select("*").eq("id", id).maybeSingle();
  return data ? { ...rowToDocument(data), storagePath: data.storage_path } : null;
}

export async function setDocumentNote(id: string, note: string | null): Promise<void> {
  const { error } = await admin().from("decision_documents").update({ note }).eq("id", id);
  if (error) throw new Error(`setDocumentNote: ${error.message}`);
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await getDocumentById(id);
  if (!doc) return;
  await admin().from("decision_documents").delete().eq("id", id);
  await admin().storage.from(BUCKET).remove([doc.storagePath]);
}

/**
 * A short-lived signed URL for one document. `inline` lets the browser show
 * it (the caller only asks for that for PDFs and images); otherwise the URL
 * forces a download under the original file name.
 */
export async function getDocumentUrl(storagePath: string, fileName: string, inline: boolean): Promise<string | null> {
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(storagePath, inline ? 300 : 60, inline ? undefined : { download: fileName });
  return error || !data ? null : data.signedUrl;
}
