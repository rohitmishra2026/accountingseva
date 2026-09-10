import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, getServiceRoleKey } from "@/lib/env";

// Service-role Supabase client. BYPASSES RLS. Server-only — the `server-only`
// import above makes the build fail if this module is ever pulled into a
// client bundle. Use exclusively for: the sync job, audit_log writes, and
// admin-scoped reads that are already gated by an admin session check.
export function createAdminClient() {
  return createClient(SUPABASE_URL, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
