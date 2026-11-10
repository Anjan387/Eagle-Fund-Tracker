import type { Decision, DecisionInput, DecisionStatus, ReviewOutcome, ThesisNode } from "@/lib/decision-types";

// A decision as the form holds it: every input is a string until it is saved.

export interface DecisionForm {
  ticker: string;
  companyName: string;
  action: "buy" | "sell";
  decisionDate: string;
  status: DecisionStatus;
  strategyId: string;
  thesisSummary: string;
  shares: string;
  price: string;
  positionPct: string;
  analysts: string;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  thesis: ThesisNode | null;
  valuationMethod: string;
  intrinsicValue: string;
  priceTarget: string;
  reviewOutcome: ReviewOutcome | "";
  reviewNotes: string;
  reviewReturnPct: string;
  reviewBenchmarkPct: string;
  reviewLessons: string;
  reviewedOn: string;
  relatedDecisionId: string;
  proposalId: string;
  tradeId: string;
}

export type SetForm = (patch: Partial<DecisionForm>) => void;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyForm(): DecisionForm {
  return {
    ticker: "",
    companyName: "",
    action: "buy",
    decisionDate: today(),
    status: "draft",
    strategyId: "",
    thesisSummary: "",
    shares: "",
    price: "",
    positionPct: "",
    analysts: "",
    votesFor: "",
    votesAgainst: "",
    votesAbstain: "",
    thesis: null,
    valuationMethod: "",
    intrinsicValue: "",
    priceTarget: "",
    reviewOutcome: "",
    reviewNotes: "",
    reviewReturnPct: "",
    reviewBenchmarkPct: "",
    reviewLessons: "",
    reviewedOn: "",
    relatedDecisionId: "",
    proposalId: "",
    tradeId: "",
  };
}

const str = (v: string | number | null) => (v == null ? "" : String(v));

export function toForm(d: Decision): DecisionForm {
  return {
    ticker: d.ticker,
    companyName: str(d.companyName),
    action: d.action,
    decisionDate: d.decisionDate,
    status: d.status,
    strategyId: str(d.strategyId),
    thesisSummary: d.thesisSummary,
    shares: str(d.shares),
    price: str(d.price),
    positionPct: str(d.positionPct),
    analysts: str(d.analysts),
    votesFor: str(d.votesFor),
    votesAgainst: str(d.votesAgainst),
    votesAbstain: str(d.votesAbstain),
    thesis: d.thesis,
    valuationMethod: str(d.valuationMethod),
    intrinsicValue: str(d.intrinsicValue),
    priceTarget: str(d.priceTarget),
    reviewOutcome: d.reviewOutcome ?? "",
    reviewNotes: str(d.reviewNotes),
    reviewReturnPct: str(d.reviewReturnPct),
    reviewBenchmarkPct: str(d.reviewBenchmarkPct),
    reviewLessons: str(d.reviewLessons),
    reviewedOn: str(d.reviewedOn),
    relatedDecisionId: str(d.relatedDecisionId),
    proposalId: str(d.proposalId),
    tradeId: str(d.tradeId),
  };
}

const num = (s: string) => (s.trim() === "" ? null : Number(s));
const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

export function fromForm(f: DecisionForm): DecisionInput {
  return {
    ticker: f.ticker.trim().toUpperCase(),
    companyName: orNull(f.companyName),
    action: f.action,
    decisionDate: f.decisionDate,
    status: f.status,
    strategyId: orNull(f.strategyId),
    thesisSummary: f.thesisSummary.trim(),
    shares: num(f.shares),
    price: num(f.price),
    positionPct: num(f.positionPct),
    analysts: orNull(f.analysts),
    votesFor: num(f.votesFor),
    votesAgainst: num(f.votesAgainst),
    votesAbstain: num(f.votesAbstain),
    thesis: f.thesis,
    valuationMethod: orNull(f.valuationMethod),
    intrinsicValue: num(f.intrinsicValue),
    priceTarget: num(f.priceTarget),
    reviewOutcome: f.reviewOutcome || null,
    reviewNotes: orNull(f.reviewNotes),
    reviewReturnPct: num(f.reviewReturnPct),
    reviewBenchmarkPct: num(f.reviewBenchmarkPct),
    reviewLessons: orNull(f.reviewLessons),
    reviewedOn: orNull(f.reviewedOn),
    relatedDecisionId: orNull(f.relatedDecisionId),
    proposalId: orNull(f.proposalId),
    tradeId: orNull(f.tradeId),
  };
}

/** What still has to be filled in before a decision can be saved, in plain words. */
export function missingRequired(f: DecisionForm): string | null {
  if (!f.ticker.trim()) return "Enter a ticker.";
  if (!f.decisionDate) return "Enter the decision date.";
  if (!f.thesisSummary.trim()) return "Add a one-line thesis summary.";
  return null;
}
