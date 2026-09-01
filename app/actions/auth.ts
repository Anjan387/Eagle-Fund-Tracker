"use server";

import { redirect } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { getSessionClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await getSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // Block sign-in for deactivated PMs (end of semester).
  const { data: profile } = await admin()
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "No profile is linked to this account. Ask the advisor." };
  }
  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "This account is inactive." };
  }

  redirect("/overview");
}

export async function logout() {
  const supabase = await getSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
