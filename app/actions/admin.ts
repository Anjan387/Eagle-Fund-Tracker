"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor } from "@/lib/auth";
import { getQuote, refreshStale } from "@/lib/prices";
import { trackedTickers } from "@/lib/tickers";
import {
  addCashTransaction,
  addTrade,
  createUser,
  getHoldings,
  getUserByEmail,
  setMeta,
  setUserActive,
  upsertSnapshot,
} from "@/lib/store";
import type { CashTransactionKind } from "@/lib/types";

export interface AdminFormState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function addPmAccount(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdvisor();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (name.length < 2) return { error: "Enter the PM's full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (await getUserByEmail(email)) return { error: "An account with that email already exists." };

  try {
    const { tempPassword } = await createUser({ name, email, role: "pm" });
    revalidatePath("/admin");
    return {
      ok: true,
      message: `Account created. Temporary password for ${email}: ${tempPassword} — share it with them; they can change it after signing in.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create the account." };
  }
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  await requireAdvisor();
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (userId) await setUserActive(userId, active);
  revalidatePath("/admin");
}

export async function saveSnapshot(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdvisor();
  const year = Number(formData.get("year"));
  const totalValue = Number(formData.get("totalValue"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Enter a valid year." };
  if (!Number.isFinite(totalValue) || totalValue <= 0) return { error: "Enter a positive dollar value." };
  await upsertSnapshot(year, totalValue);
  revalidatePath("/admin");
  revalidatePath("/overview");
  return { ok: true };
}

export async function refreshPricesNow(): Promise<void> {
  await requireAdvisor();
  await refreshStale(await trackedTickers(), 7);
  revalidatePath("/overview");
  revalidatePath("/holdings");
  revalidatePath("/admin");
}

// Both trailing-return figures are computed automatically (lib/fund.ts). An
// empty field clears the override and goes back to the computed value; a
// number in it overrides that value until cleared.
export async function saveReturnOverrides(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdvisor();
  const fundRaw = String(formData.get("fundTrailingReturnOverridePct") ?? "").trim();
  const benchmarkRaw = String(formData.get("benchmarkTrailingReturnOverridePct") ?? "").trim();

  const fundTrailingReturnOverridePct = fundRaw === "" ? null : Number(fundRaw);
  const benchmarkTrailingReturnOverridePct = benchmarkRaw === "" ? null : Number(benchmarkRaw);
  if (
    (fundTrailingReturnOverridePct !== null && !Number.isFinite(fundTrailingReturnOverridePct)) ||
    (benchmarkTrailingReturnOverridePct !== null && !Number.isFinite(benchmarkTrailingReturnOverridePct))
  ) {
    return { error: "Overrides must be numbers, or left blank to clear them." };
  }

  await setMeta({ fundTrailingReturnOverridePct, benchmarkTrailingReturnOverridePct });
  revalidatePath("/admin");
  revalidatePath("/overview");
  return { ok: true };
}

const CASH_SIGN: Record<CashTransactionKind, 1 | -1> = {
  deposit: 1,
  dividend: 1,
  withdrawal: -1,
  fee: -1,
  adjustment: 1, // the advisor types the signed amount directly for this one
  trade_buy: -1,
  trade_sell: 1,
};

export async function addCashEvent(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const advisor = await requireAdvisor();
  const kind = String(formData.get("kind") ?? "") as CashTransactionKind;
  const amountInput = Number(formData.get("amount"));
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const memo = String(formData.get("memo") ?? "").trim();

  // Dividends have their own form/action (recordDividend) below, since they
  // can trigger a reinvestment trade - not just a plain cash entry.
  if (!["deposit", "withdrawal", "fee", "adjustment"].includes(kind))
    return { error: "Choose a valid event type." };
  if (!Number.isFinite(amountInput) || amountInput === 0)
    return { error: "Enter a non-zero dollar amount." };
  if (kind !== "adjustment" && amountInput < 0)
    return { error: "Enter a positive amount — the event type already sets the direction." };
  if (!occurredOn) return { error: "Date is required." };

  // Every kind except "adjustment" has a fixed direction, so the advisor just
  // types a positive amount; "adjustment" is a free-form correcting entry and
  // can go either way, same as an offsetting trade entry would.
  const amount = kind === "adjustment" ? amountInput : amountInput * CASH_SIGN[kind];
  await addCashTransaction({ occurredOn, kind, amount, memo: memo || undefined, enteredBy: advisor.id });
  revalidatePath("/admin");
  revalidatePath("/overview");
  return { ok: true };
}

/**
 * Logs a dividend. With the reinvestment toggle off, this is just a cash
 * event like any other. With it on, the dividend is additionally used to buy
 * more of a chosen current holding (fractional shares, same as a real DRIP) -
 * at that holding's live price, dated the same day, via the same addTrade()
 * every manually-entered trade goes through, so it updates holdings and
 * posts its own offsetting cash entry exactly like a normal buy would. The
 * two cash entries (the dividend in, the trade_buy out) net to zero since
 * the share count is derived from the dividend amount itself.
 */
export async function recordDividend(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const advisor = await requireAdvisor();
  const amount = Number(formData.get("amount"));
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const tickerPaid = String(formData.get("tickerPaid") ?? "").trim().toUpperCase();
  const reinvest = String(formData.get("reinvest") ?? "") === "true";
  const reinvestInto = String(formData.get("reinvestInto") ?? "").trim().toUpperCase();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a positive dollar amount." };
  if (!occurredOn) return { error: "Date is required." };

  if (!reinvest) {
    await addCashTransaction({
      occurredOn,
      kind: "dividend",
      amount,
      ticker: tickerPaid || undefined,
      memo: memo || undefined,
      enteredBy: advisor.id,
    });
    revalidatePath("/admin");
    revalidatePath("/overview");
    return { ok: true };
  }

  if (!reinvestInto) return { error: "Choose which holding to reinvest the dividend into." };
  const holdings = await getHoldings();
  const target = holdings.find((h) => h.ticker === reinvestInto);
  if (!target) return { error: `${reinvestInto} isn't a current holding.` };

  const quote = await getQuote(reinvestInto);
  if (!quote || quote.price <= 0)
    return { error: `Couldn't get a current price for ${reinvestInto} to compute reinvestment shares.` };

  const shares = Number((amount / quote.price).toFixed(6));

  await addCashTransaction({
    occurredOn,
    kind: "dividend",
    amount,
    ticker: tickerPaid || undefined,
    memo: memo || `Reinvested into ${reinvestInto}`,
    enteredBy: advisor.id,
  });
  await addTrade({
    ticker: reinvestInto,
    action: "buy",
    shares,
    price: quote.price,
    tradeDate: occurredOn,
    strategyId: target.strategyId,
    enteredBy: advisor.id,
    source: "advisor_entry",
    notes: `Dividend reinvestment — $${amount.toFixed(2)}${
      tickerPaid ? ` from ${tickerPaid}` : ""
    } reinvested into ${reinvestInto} at $${quote.price.toFixed(2)}/share (${shares} sh).`,
  });

  revalidatePath("/admin");
  revalidatePath("/overview");
  revalidatePath("/holdings");
  revalidatePath("/transactions");
  return { ok: true, message: `Reinvested as ${shares} sh of ${reinvestInto} at $${quote.price.toFixed(2)}.` };
}
