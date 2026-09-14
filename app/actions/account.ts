"use server";

import { requireUser } from "@/lib/auth";
import { getSessionClient } from "@/lib/supabase/server";

export interface AccountFormState {
  error?: string;
  ok?: boolean;
}

export async function changePassword(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) return { error: "Enter your current password." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords don't match." };
  if (newPassword === currentPassword)
    return { error: "New password must be different from the current one." };

  const supabase = await getSessionClient();

  // Re-verify the current password before changing anything — a signed-in
  // session alone isn't proof you know the old password (e.g. a shared or
  // unlocked computer).
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { ok: true };
}
