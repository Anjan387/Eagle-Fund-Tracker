// Domain types for the Eagle Fund Tracker.
// These mirror the tables described in the build spec. In v1 they are backed by
// an in-memory mock store (lib/store.ts); swapping in Supabase later means
// re-implementing the accessors in lib/store.ts, not changing these types.

export type Role = "advisor" | "pm";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string; // ISO date
}

export type StrategyName =
  | "Buy & Hold Asset Class"
  | "Buy & Hold Value"
  | "Momentum"
  | "Defensive";

export interface Strategy {
  id: string;
  name: StrategyName;
  targetMinPct: number;
  targetMaxPct: number;
}

export type HoldingStatus = "open" | "closed";

export interface Holding {
  id: string;
  ticker: string;
  strategyId: string;
  shares: number;
  costBasis: number; // total cost, USD
  openedDate: string;
  status: HoldingStatus;
}

export type TradeAction = "buy" | "sell";
export type TradeSource = "advisor_entry" | "approved_proposal";

export interface Trade {
  id: string;
  ticker: string;
  action: TradeAction;
  shares: number;
  price: number;
  tradeDate: string;
  strategyId: string;
  enteredBy: string; // user id
  source: TradeSource;
  notes?: string;
  proposalId?: string;
}

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface Proposal {
  id: string;
  ticker: string;
  action: TradeAction;
  shares: number;
  strategyId: string;
  rationale: string;
  proposedBy: string; // user id
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface HoldingNote {
  id: string;
  holdingId: string;
  author: string; // user id
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundSnapshot {
  year: number;
  totalValue: number;
}

export interface PriceQuote {
  ticker: string;
  price: number;
  changeAbs: number;
  changePct: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  name: string;
  asOf: string;
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface NewsItem {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
}
