"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

// Browser Supabase client. Uses the anon key only — RLS enforces access.
// Session is persisted in cookies (handled by @supabase/ssr), not localStorage.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
