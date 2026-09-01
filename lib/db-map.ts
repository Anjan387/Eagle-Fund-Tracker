// Maps snake_case Supabase rows to the camelCase domain types the app uses.

import type {
  FundSnapshot,
  Holding,
  HoldingNote,
  Proposal,
  Strategy,
  Trade,
  User,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const date = (v: any): string => (typeof v === "string" ? v.slice(0, 10) : "");

export const rowToUser = (r: Row): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  active: r.active,
  createdAt: date(r.created_at),
});

export const rowToStrategy = (r: Row): Strategy => ({
  id: r.id,
  name: r.name,
  targetMinPct: Number(r.target_min_pct),
  targetMaxPct: Number(r.target_max_pct),
});

export const rowToHolding = (r: Row): Holding => ({
  id: r.id,
  ticker: r.ticker,
  strategyId: r.strategy_id,
  shares: Number(r.shares),
  costBasis: Number(r.cost_basis),
  openedDate: date(r.opened_date),
  status: r.status,
});

export const rowToTrade = (r: Row): Trade => ({
  id: r.id,
  ticker: r.ticker,
  action: r.action,
  shares: Number(r.shares),
  price: Number(r.price),
  tradeDate: date(r.trade_date),
  strategyId: r.strategy_id,
  enteredBy: r.entered_by ?? "",
  source: r.source,
  notes: r.notes ?? undefined,
  proposalId: r.proposal_id ?? undefined,
});

export const rowToProposal = (r: Row): Proposal => ({
  id: r.id,
  ticker: r.ticker,
  action: r.action,
  shares: Number(r.shares),
  strategyId: r.strategy_id,
  rationale: r.rationale,
  proposedBy: r.proposed_by ?? "",
  status: r.status,
  createdAt: date(r.created_at),
  decidedAt: r.decided_at ? date(r.decided_at) : undefined,
  decidedBy: r.decided_by ?? undefined,
  decisionNote: r.decision_note ?? undefined,
});

export const rowToNote = (r: Row): HoldingNote => ({
  id: r.id,
  holdingId: r.holding_id,
  author: r.author ?? "",
  body: r.body,
  createdAt: date(r.created_at),
  updatedAt: date(r.updated_at),
});

export const rowToSnapshot = (r: Row): FundSnapshot => ({
  year: Number(r.year),
  totalValue: Number(r.total_value),
});
