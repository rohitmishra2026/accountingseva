"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/portal";
import { runSync } from "@/lib/sync/run";

export type SyncActionState = {
  ran: boolean;
  ok?: boolean;
  message?: string;
};

// Admin-gated manual trigger. requireAdmin() verifies the session + is_admin
// flag server-side before runSync (which uses the service role) is invoked.
export async function triggerSync(
  _prev: SyncActionState
): Promise<SyncActionState> {
  await requireAdmin();
  const result = await runSync("admin");
  revalidatePath("/portal/admin/sync");

  if (!result.ok) {
    return { ran: true, ok: false, message: result.error ?? "Sync failed." };
  }
  const c = result.counts;
  return {
    ran: true,
    ok: true,
    message: `Synced: ${c.holdingsWritten} holdings, ${c.monthlyReturnsWritten} transactions, ${c.profilesUpdated} profiles updated. ${result.skipped.length} rows skipped.`,
  };
}
