"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor } from "@/lib/auth";
import { refreshStale } from "@/lib/prices";
import { trackedTickers } from "@/lib/tickers";
import {
  addCashTransaction,
  createUser,
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

  if (!["deposit", "withdrawal", "dividend", "fee", "adjustment"].includes(kind))
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
