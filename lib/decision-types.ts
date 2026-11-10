// Decision Log — the shapes shared by the server (lib/decisions.ts) and the
// page (components/decisions/*). No server-only code in here.
//
// A decision is one "folder": a buy or a sell, its thesis, and the documents
// filed with it. The database columns are documented in
// supabase/migrations/006_decision_log.sql; these are the same fields in
// camelCase.

export type DecisionAction = "buy" | "sell";

export const DECISION_STATUSES = ["draft", "pitched", "approved", "executed", "rejected", "closed"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  draft: "Draft",
  pitched: "Pitched",
  approved: "Approved",
  executed: "Executed",
  rejected: "Rejected",
  closed: "Closed",
};

export const REVIEW_OUTCOMES = ["played_out", "partly", "did_not"] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

export const OUTCOME_LABEL: Record<ReviewOutcome, string> = {
  played_out: "Yes, it played out",
  partly: "Partly",
  did_not: "No, it did not",
};

/** A node of the thesis document, as the rich-text editor (Tiptap) stores it. */
export interface ThesisNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ThesisNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

/** Everything a person can fill in. Only the first five are required. */
export interface DecisionInput {
  ticker: string;
  action: DecisionAction;
  decisionDate: string; // YYYY-MM-DD
  thesisSummary: string;
  status: DecisionStatus;
  companyName: string | null;
  strategyId: string | null;
  shares: number | null;
  price: number | null;
  positionPct: number | null;
  analysts: string | null;
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
  thesis: ThesisNode | null;
  valuationMethod: string | null;
  intrinsicValue: number | null;
  priceTarget: number | null;
  reviewOutcome: ReviewOutcome | null;
  reviewNotes: string | null;
  reviewReturnPct: number | null;
  reviewBenchmarkPct: number | null;
  reviewLessons: string | null;
  reviewedOn: string | null;
  relatedDecisionId: string | null;
  proposalId: string | null;
  tradeId: string | null;
}

export interface Decision extends DecisionInput {
  id: string;
  thesisText: string;
  isSample: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DecisionDocument {
  id: string;
  decisionId: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  note: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

// ---- documents --------------------------------------------------------------

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024; // the bucket's own limit

/** What may be filed, by extension: PDF, Excel, PowerPoint, Word, images. */
export const DOCUMENT_KINDS: Record<string, { label: string; kind: "pdf" | "sheet" | "slides" | "doc" | "image" }> = {
  pdf: { label: "PDF", kind: "pdf" },
  xlsx: { label: "XLS", kind: "sheet" },
  xls: { label: "XLS", kind: "sheet" },
  xlsm: { label: "XLS", kind: "sheet" },
  csv: { label: "CSV", kind: "sheet" },
  pptx: { label: "PPT", kind: "slides" },
  ppt: { label: "PPT", kind: "slides" },
  docx: { label: "DOC", kind: "doc" },
  doc: { label: "DOC", kind: "doc" },
  png: { label: "IMG", kind: "image" },
  jpg: { label: "IMG", kind: "image" },
  jpeg: { label: "IMG", kind: "image" },
  gif: { label: "IMG", kind: "image" },
  webp: { label: "IMG", kind: "image" },
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_KINDS)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Stored content types that are safe to show inside the page. Everything else only downloads. */
const PREVIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);
export function previewKind(contentType: string | null): "pdf" | "image" | null {
  if (!contentType || !PREVIEWABLE.has(contentType)) return null;
  return contentType === "application/pdf" ? "pdf" : "image";
}

// ---- derived values ----------------------------------------------------------

/** "Fall 2026" from a decision date. Spring is Jan-May, Summer Jun-Jul, Fall Aug-Dec. */
export function semesterOf(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${month <= 5 ? "Spring" : month <= 7 ? "Summer" : "Fall"} ${year}`;
}

/** (intrinsic value - price at decision) / intrinsic value, as a percentage. */
export function marginOfSafetyPct(intrinsicValue: number | null, price: number | null): number | null {
  if (intrinsicValue == null || price == null || intrinsicValue <= 0) return null;
  return ((intrinsicValue - price) / intrinsicValue) * 100;
}

// ---- thesis document ----------------------------------------------------------

const heading = (text: string): ThesisNode => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
});
const blank: ThesisNode = { type: "paragraph" };

/** What a new thesis starts as: the prompted sections, each empty. */
export const THESIS_TEMPLATE: ThesisNode = {
  type: "doc",
  content: [
    heading("Why we're acting"),
    blank,
    heading("Valuation summary"),
    blank,
    heading("Key catalysts"),
    blank,
    heading("Key risks"),
    blank,
    heading("What would make us reverse the decision"),
    blank,
  ],
};

const BLOCKS = new Set(["paragraph", "heading", "listItem", "blockquote", "codeBlock", "horizontalRule"]);

/** The thesis as plain text, one block per line. */
export function thesisText(doc: ThesisNode | null): string {
  if (!doc) return "";
  const out: string[] = [];
  const walk = (node: ThesisNode) => {
    if (typeof node.text === "string") out.push(node.text);
    if (node.type === "hardBreak") out.push("\n");
    for (const child of node.content ?? []) walk(child);
    if (BLOCKS.has(node.type)) out.push("\n");
  };
  walk(doc);
  return out.join("").replace(/\n{2,}/g, "\n").trim();
}

/** True if nothing has been written under the template's headings. */
export function thesisIsEmpty(doc: ThesisNode | null): boolean {
  return !doc || thesisText(doc) === thesisText(THESIS_TEMPLATE);
}
