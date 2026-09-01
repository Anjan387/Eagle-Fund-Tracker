import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Session-aware client (publishable/"anon" key + the request's auth cookies).
// Used only to answer "who is signed in?" and to run sign-in / sign-out.
// Data reads/writes use lib/supabase/admin.ts instead.

export async function getSessionClient() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            jar.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // proxy.ts refreshes the session on navigation, so this is safe to ignore.
        }
      },
    },
  });
}
