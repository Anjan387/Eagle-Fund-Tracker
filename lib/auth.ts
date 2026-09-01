import "server-only";
import { redirect } from "next/navigation";
import { admin } from "./supabase/admin";
import { getSessionClient } from "./supabase/server";
import { rowToUser } from "./db-map";
import type { User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await admin()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) return null;
  return rowToUser(profile);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdvisor(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "advisor") redirect("/overview");
  return user;
}
