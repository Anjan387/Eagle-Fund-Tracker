import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role ("secret") client. Bypasses Row Level Security — never import this
// into a Client Component. All data access goes through here; authorization is
// enforced by the requireUser / requireAdvisor guards in lib/auth.ts, which run
// before any store function is called.

let client: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
