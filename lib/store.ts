// Data access layer — Supabase (Postgres) via the service-role client.
//
// Every function is async and returns the app's camelCase domain types. The
// signatures are the contract the rest of the app depends on; the bodies are the
// only thing that changed when moving off the in-memory mock.

import "server-only";
import { admin } from "./supabase/admin";
import {
  rowToCashTransaction,
  rowToHolding,
  rowToNote,
  rowToProposal,
  rowToSnapshot,
  rowToStrategy,
  rowToTrade,
  rowToUser,
} from "./db-map";
import type { CashTransaction, CashTransactionKind, FundValueSnapshot, Proposal, Trade, User } from "./types";

function must<T>(data: T | null, error: { message: string } | null, what: string): T {
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null) throw new Error(`${what}: no data`);
  return data;
}

// ---- reads ---------------------------------------------------------------

export async function getUsers(): Promise<User[]> {
  const { data, error } = await admin().from("profiles").select("*").order("created_at");
  return must(data, error, "getUsers").map(rowToUser);
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data } = await admin().from("profiles").select("*").eq("id", userId).maybeSingle();
  return data ? rowToUser(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await admin()
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  return data ? rowToUser(data) : null;
}

export async function getStrategies() {
  const { data, error } = await admin().from("strategies").select("*").order("name");
  return must(data, error, "getStrategies").map(rowToStrategy);
}

export async function getStrategyById(strategyId: string) {
  const { data } = await admin().from("strategies").select("*").eq("id", strategyId).maybeSingle();
  return data ? rowToStrategy(data) : null;
}

export async function getHoldings() {
  const { data, error } = await admin()
    .from("holdings")
    .select("*")
    .eq("status", "open")
    .order("ticker");
  return must(data, error, "getHoldings").map(rowToHolding);
}

export async function getHoldingById(holdingId: string) {
  const { data } = await admin().from("holdings").select("*").eq("id", holdingId).maybeSingle();
  return data ? rowToHolding(data) : null;
}

export async function getTrades() {
  const { data, error } = await admin()
    .from("trades")
    .select("*")
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });
  return must(data, error, "getTrades").map(rowToTrade);
}

export async function getProposals() {
  const { data, error } = await admin()
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
  return must(data, error, "getProposals").map(rowToProposal);
}

export async function getNotesForHolding(holdingId: string) {
  const { data, error } = await admin()
    .from("holding_notes")
    .select("*")
    .eq("holding_id", holdingId)
    .order("updated_at", { ascending: false });
  return must(data, error, "getNotesForHolding").map(rowToNote);
}

export async function getSnapshots() {
  const { data, error } = await admin().from("fund_snapshots").select("*").order("year");
  return must(data, error, "getSnapshots").map(rowToSnapshot);
}

// The trailing-return figures are computed automatically (see lib/fund.ts);
// these two columns are an optional advisor override for when the computed
// number is wrong (a bad price, a data gap) and needs a manual correction
// without a code deploy. null means "use the computed value."
export async function getMeta() {
  const { data, error } = await admin().from("fund_meta").select("*").eq("id", 1).maybeSingle();
  const row = must(data, error, "getMeta");
  return {
    fundTrailingReturnOverridePct:
      row.fund_trailing_return_override_pct == null ? null : Number(row.fund_trailing_return_override_pct),
    benchmarkTrailingReturnOverridePct:
      row.benchmark_trailing_return_override_pct == null
        ? null
        : Number(row.benchmark_trailing_return_override_pct),
  };
}

// ---- cash ledger ----------------------------------------------------------
// Cash is never a single overridable number: it's the running sum of an
// append-only ledger, the same "fix a mistake with a new offsetting entry"
// model already used for trades. Buys/sells post their own entries
// automatically (see applyTradeToHoldings); deposits, dividends, and fees are
// logged by the advisor as they happen via addCashTransaction.

export async function getCashTransactions(): Promise<CashTransaction[]> {
  const { data, error } = await admin()
    .from("cash_transactions")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  return must(data, error, "getCashTransactions").map(rowToCashTransaction);
}

export async function getCashBalance(): Promise<number> {
  const { data, error } = await admin().from("cash_transactions").select("amount");
  return must(data, error, "getCashBalance").reduce((sum, r) => sum + Number(r.amount), 0);
}

export async function addCashTransaction(input: {
  occurredOn: string;
  kind: CashTransactionKind;
  amount: number;
  memo?: string;
  ticker?: string;
  tradeId?: string;
  enteredBy?: string;
}): Promise<void> {
  const { error } = await admin().from("cash_transactions").insert({
    occurred_on: input.occurredOn,
    kind: input.kind,
    amount: input.amount,
    memo: input.memo ?? null,
    ticker: input.ticker ?? null,
    trade_id: input.tradeId ?? null,
    entered_by: input.enteredBy ?? null,
  });
  if (error) throw new Error(`addCashTransaction: ${error.message}`);
}

// ---- daily fund value history ---------------------------------------------
// One row per day, written by the price-refresh cron (app/api/refresh-prices).
// Once ~a year of these accrue, lib/fund.ts can compute a true rolling
// trailing-12-month return instead of the "since rebuild" stand-in.

export async function getFundValueHistory(): Promise<FundValueSnapshot[]> {
  const { data, error } = await admin().from("fund_value_history").select("*").order("date");
  return must(data, error, "getFundValueHistory").map((r) => ({
    date: String(r.date).slice(0, 10),
    fundValue: Number(r.fund_value),
    investedValue: Number(r.invested_value),
    cashBalance: Number(r.cash_balance),
  }));
}

export async function upsertFundValueSnapshot(snapshot: FundValueSnapshot): Promise<void> {
  await admin()
    .from("fund_value_history")
    .upsert(
      {
        date: snapshot.date,
        fund_value: snapshot.fundValue,
        invested_value: snapshot.investedValue,
        cash_balance: snapshot.cashBalance,
      },
      { onConflict: "date" },
    );
}

// ---- writes -------------------------------------------------------------

export async function addTrade(input: Omit<Trade, "id">): Promise<Trade> {
  const db = admin();
  const { data: tradeRow, error } = await db
    .from("trades")
    .insert({
      ticker: input.ticker,
      action: input.action,
      shares: input.shares,
      price: input.price,
      trade_date: input.tradeDate,
      strategy_id: input.strategyId,
      entered_by: input.enteredBy || null,
      source: input.source,
      notes: input.notes ?? null,
      proposal_id: input.proposalId ?? null,
    })
    .select("*")
    .single();

  const trade = rowToTrade(must(tradeRow, error, "addTrade"));
  await applyTradeToHoldings(trade);
  await addCashTransaction({
    occurredOn: trade.tradeDate,
    kind: trade.action === "buy" ? "trade_buy" : "trade_sell",
    amount: trade.action === "buy" ? -(trade.shares * trade.price) : trade.shares * trade.price,
    ticker: trade.ticker,
    tradeId: trade.id,
    enteredBy: trade.enteredBy || undefined,
  });
  return trade;
}

async function applyTradeToHoldings(trade: Trade) {
  const db = admin();
  const { data: existing } = await db
    .from("holdings")
    .select("*")
    .eq("ticker", trade.ticker)
    .eq("strategy_id", trade.strategyId)
    .eq("status", "open")
    .maybeSingle();

  if (trade.action === "buy") {
    if (existing) {
      await db
        .from("holdings")
        .update({
          shares: Number(existing.shares) + trade.shares,
          cost_basis: Number(existing.cost_basis) + trade.shares * trade.price,
        })
        .eq("id", existing.id);
    } else {
      await db.from("holdings").insert({
        ticker: trade.ticker,
        strategy_id: trade.strategyId,
        shares: trade.shares,
        cost_basis: trade.shares * trade.price,
        opened_date: trade.tradeDate,
        status: "open",
      });
    }
    return;
  }

  // sell
  if (!existing) return;
  const prevShares = Number(existing.shares);
  const avgCost = prevShares > 0 ? Number(existing.cost_basis) / prevShares : 0;
  const remaining = Math.max(0, prevShares - trade.shares);
  await db
    .from("holdings")
    .update({
      shares: remaining,
      cost_basis: Number((avgCost * remaining).toFixed(2)),
      status: remaining === 0 ? "closed" : "open",
    })
    .eq("id", existing.id);
}

export async function createProposal(input: {
  ticker: string;
  action: Proposal["action"];
  shares: number;
  strategyId: string;
  rationale: string;
  proposedBy: string;
}): Promise<Proposal> {
  const { data, error } = await admin()
    .from("proposals")
    .insert({
      ticker: input.ticker,
      action: input.action,
      shares: input.shares,
      strategy_id: input.strategyId,
      rationale: input.rationale,
      proposed_by: input.proposedBy,
      status: "pending",
    })
    .select("*")
    .single();
  return rowToProposal(must(data, error, "createProposal"));
}

export async function decideProposal(input: {
  proposalId: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  decisionNote?: string;
}): Promise<Proposal | null> {
  const db = admin();
  const { data: current } = await db
    .from("proposals")
    .select("*")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!current || current.status !== "pending") return current ? rowToProposal(current) : null;

  const { data, error } = await db
    .from("proposals")
    .update({
      status: input.decision,
      decided_by: input.decidedBy,
      decided_at: new Date().toISOString(),
      decision_note: input.decisionNote?.trim() || null,
    })
    .eq("id", input.proposalId)
    .select("*")
    .single();
  return rowToProposal(must(data, error, "decideProposal"));
}

export async function upsertNote(input: {
  noteId?: string;
  holdingId: string;
  author: string;
  body: string;
}) {
  const db = admin();
  if (input.noteId) {
    const { data, error } = await db
      .from("holding_notes")
      .update({ body: input.body, updated_at: new Date().toISOString() })
      .eq("id", input.noteId)
      .select("*")
      .single();
    return rowToNote(must(data, error, "upsertNote(update)"));
  }
  const { data, error } = await db
    .from("holding_notes")
    .insert({ holding_id: input.holdingId, author: input.author, body: input.body })
    .select("*")
    .single();
  return rowToNote(must(data, error, "upsertNote(insert)"));
}

export async function deleteNote(noteId: string) {
  await admin().from("holding_notes").delete().eq("id", noteId);
}

/**
 * Creates the Supabase Auth user AND the profile row. Returns the temporary
 * password so the advisor can pass it to the new PM (there is no email sending
 * configured yet).
 */
export async function createUser(input: {
  name: string;
  email: string;
  role: User["role"];
}): Promise<{ user: User; tempPassword: string }> {
  const db = admin();
  const tempPassword = `eaglefund-${Math.random().toString(36).slice(2, 8)}`;

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError || !created.user) {
    throw new Error(`createUser (auth): ${authError?.message ?? "no user returned"}`);
  }

  const { data, error } = await db
    .from("profiles")
    .insert({
      id: created.user.id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    // roll back the auth user so a retry can reuse the email
    await db.auth.admin.deleteUser(created.user.id);
    throw new Error(`createUser (profile): ${error.message}`);
  }
  return { user: rowToUser(data), tempPassword };
}

export async function setUserActive(userId: string, active: boolean) {
  const { data } = await admin()
    .from("profiles")
    .update({ active })
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  return data ? rowToUser(data) : null;
}

export async function upsertSnapshot(year: number, totalValue: number) {
  await admin()
    .from("fund_snapshots")
    .upsert({ year, total_value: Math.round(totalValue) }, { onConflict: "year" });
}

export async function setMeta(meta: {
  fundTrailingReturnOverridePct?: number | null;
  benchmarkTrailingReturnOverridePct?: number | null;
}) {
  const patch: Record<string, number | null> = {};
  if (meta.fundTrailingReturnOverridePct !== undefined)
    patch.fund_trailing_return_override_pct = meta.fundTrailingReturnOverridePct;
  if (meta.benchmarkTrailingReturnOverridePct !== undefined)
    patch.benchmark_trailing_return_override_pct = meta.benchmarkTrailingReturnOverridePct;
  await admin().from("fund_meta").update(patch).eq("id", 1);
}

