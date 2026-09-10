import type { Metadata } from "next";
import { requireAdmin } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { RunSyncButton } from "./RunSyncButton";

// Admin-only surface. Never indexable: robots.txt is advisory, this is not.
export const metadata: Metadata = {
  title: "Sync",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type AuditRow = {
  id: number;
  event: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminSyncPage() {
  const { profile } = await requireAdmin();

  // audit_log has no client RLS; admin session is already verified above.
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select("id, event, metadata, created_at")
    .in("event", ["sync_run", "sync_error"])
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (data ?? []) as AuditRow[];
  const last = rows[0];

  return (
    <>
      <PortalHeader fullName={profile.full_name} />
      {/* pb-24 clears the fixed session countdown, same as the dashboard. */}
      <main className="mx-auto max-w-4xl space-y-6 px-6 pt-8 pb-24">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Sheet Sync</h1>
          <p className="mt-1 text-sm text-navy-500">
            Pull the latest clients, holdings and transactions from the Google
            Sheet. Runs automatically every night; you can also run it now.
          </p>
        </div>

        <section className="rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-navy-800">Last sync</h2>
          {last ? (
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-navy-500">Status: </span>
                <span
                  className={
                    last.event === "sync_run"
                      ? "font-medium text-emerald-600"
                      : "font-medium text-red-600"
                  }
                >
                  {last.event === "sync_run" ? "Success" : "Error"}
                </span>
              </p>
              <p className="text-navy-600">{fmtDateTime(last.created_at)}</p>
              {last.metadata && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-navy-50 p-3 text-xs text-navy-700">
                  {JSON.stringify(last.metadata, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-navy-500">No sync has run yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-navy-800">
            Run sync manually
          </h2>
          <RunSyncButton />
        </section>

        {rows.length > 1 && (
          <section className="rounded-2xl border border-navy-100 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-navy-800">
              Recent runs
            </h2>
            <ul className="divide-y divide-navy-50 text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span
                    className={
                      r.event === "sync_run" ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    {r.event === "sync_run" ? "Success" : "Error"}
                  </span>
                  <span className="text-navy-500">{fmtDateTime(r.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
