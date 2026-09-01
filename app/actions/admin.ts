"use server";

import { revalidatePath } from "next/cache";
import { requireAdvisor } from "@/lib/auth";
import { refreshStale } from "@/lib/prices";
import { trackedTickers } from "@/lib/tickers";
import { createUser, getUserByEmail, setMeta, setUserActive, upsertSnapshot } from "@/lib/store";

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
  await refreshStale(await trackedTickers(), 6);
  revalidatePath("/overview");
  revalidatePath("/holdings");
  revalidatePath("/admin");
}

export async function saveReturns(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdvisor();
  const fundTrailingReturnPct = Number(formData.get("fundTrailingReturnPct"));
  const benchmarkTrailingReturnPct = Number(formData.get("benchmarkTrailingReturnPct"));
  const cashBalance = Number(formData.get("cashBalance"));
  if (![fundTrailingReturnPct, benchmarkTrailingReturnPct, cashBalance].every(Number.isFinite))
    return { error: "All three fields must be numbers." };
  if (cashBalance < 0) return { error: "Cash balance cannot be negative." };
  await setMeta({ fundTrailingReturnPct, benchmarkTrailingReturnPct, cashBalance });
  revalidatePath("/admin");
  revalidatePath("/overview");
  return { ok: true };
}
