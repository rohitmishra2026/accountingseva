import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server Supabase client bound to the request cookies. Use in server
// components, route handlers and server actions. Anon key + RLS = the user
// only ever sees their own data.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `set` throws when called from a Server Component (read-only cookie
          // store). That's fine: middleware refreshes the session cookie.
        }
      },
    },
  });
}
