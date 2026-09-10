import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEvent =
  | "login"
  // A failed sign-in. Recorded because the success-only log made a password
  // attack completely invisible: audit_log showed nothing at all between the
  // first guess and the one that worked.
  | "login_failed"
  | "logout"
  | "pdf_download"
  | "sync_run"
  | "sync_error"
  // A rejected call to /api/sync. That endpoint guards the service-role write
  // path, so attempts to guess its secret need to be visible.
  | "sync_auth_failed";

// Best-effort audit write via the service role. Never throws into the caller:
// an audit failure must not break a login or a report download.
export async function logAudit(params: {
  event: AuditEvent;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      event: params.event,
      user_id: params.userId ?? null,
      metadata: params.metadata ?? null,
      ip: params.ip ?? null,
    });
  } catch (err) {
    // Log server-side; do not surface to the user.
    console.error("audit_log write failed:", err);
  }
}
