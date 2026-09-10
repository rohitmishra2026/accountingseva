import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getTestClientEmails } from "@/lib/env";
import { readSheetTabs } from "./sheets";
import {
  dedupeHoldings,
  parseCategories,
  parseClients,
  parseHoldings,
  parseMonthlyReturns,
} from "./validate";
import {
  buildReplacePlan,
  eligibleClients,
  ineligibleReasons,
  verifyDeleteSet,
  verifyNonEmpty,
  verifyPriorMonthsPreserved,
  verifyTabsReadable,
} from "./guards";
import { toHoldingPayload, toMonthlyPayload } from "./payload";
import type { Skipped, Warning } from "./types";

export type SyncResult = {
  ok: boolean;
  startedBy: "cron" | "admin";
  counts: {
    clientsInSheet: number;
    eligibleClients: number;
    holdingsWritten: number;
    monthsReplaced: number;
    monthlyReturnsWritten: number;
    categoriesWritten: number;
    profilesUpdated: number;
  };
  /** Months present in the DB and deliberately left untouched. */
  preservedMonths: string[];
  skipped: Skipped[];
  warnings: Warning[];
  unknownEmails: string[];
  error?: string;
};

function emptyCounts(): SyncResult["counts"] {
  return {
    clientsInSheet: 0,
    eligibleClients: 0,
    holdingsWritten: 0,
    monthsReplaced: 0,
    monthlyReturnsWritten: 0,
    categoriesWritten: 0,
    profilesUpdated: 0,
  };
}

/**
 * Full sync. Runs with the service role (bypasses RLS) and is server-only.
 *
 * Ordering is deliberate: everything is read, parsed and CHECKED before a
 * single write happens. If any guard fails the run aborts having written
 * nothing at all, because a failed sync is cheaper than lost history.
 */
export async function runSync(startedBy: "cron" | "admin"): Promise<SyncResult> {
  const admin = createAdminClient();
  const skipped: Skipped[] = [];
  const warnings: Warning[] = [];

  const fail = async (reason: string, detail?: string[]): Promise<SyncResult> => {
    const message = detail?.length ? `${reason} [${detail.join(", ")}]` : reason;
    await logAudit({
      event: "sync_error",
      metadata: { startedBy, error: message, skipped: skipped.length },
    });
    return {
      ok: false,
      startedBy,
      counts: emptyCounts(),
      preservedMonths: [],
      skipped,
      warnings,
      unknownEmails: [],
      error: message,
    };
  };

  try {
    // ── 1. Read ───────────────────────────────────────────────────────────
    const { tabs, unreadable } = await readSheetTabs();

    const readable = verifyTabsReadable(unreadable);
    if (!readable.ok) return fail(readable.reason);

    // ── 2. Parse ──────────────────────────────────────────────────────────
    const clients = parseClients(tabs.clients, getTestClientEmails());
    const holdings = parseHoldings(tabs.holdings);
    const monthly = parseMonthlyReturns(tabs.monthlyReturns);
    const categories = parseCategories(tabs.categories);

    for (const r of [clients, holdings, monthly, categories]) {
      skipped.push(...r.skipped);
      warnings.push(...r.warnings);
    }

    // ── 3. Guards, all before any write ───────────────────────────────────
    // A renamed or missing REQUIRED column is checked FIRST, so it is reported
    // as what it is rather than surfacing later as a misleading "zero rows".
    for (const [label, result] of [
      ["Clients", clients],
      ["Holdings", holdings],
      ["Monthly Returns", monthly],
      ["Categories", categories],
    ] as const) {
      if (result.fatal) {
        return fail(`${label} tab could not be parsed: ${result.fatal} Nothing was written.`);
      }
    }

    // Zero-row abort. Counted on PARSED rows so a tab of nothing but blank
    // padding is treated as empty too.
    const nonEmpty = verifyNonEmpty("Holdings", holdings.valid.length);
    if (!nonEmpty.ok) return fail(nonEmpty.reason);

    const clientsNonEmpty = verifyNonEmpty("Clients", clients.valid.length);
    if (!clientsNonEmpty.ok) return fail(clientsNonEmpty.reason);

    // Status = Active AND Portal Access = Yes, enforced server-side.
    const allowed = eligibleClients(clients.valid);
    const allowedEmails = new Set(allowed.map((c) => c.email));
    for (const { email, reason } of ineligibleReasons(clients.valid)) {
      warnings.push({
        tab: "Clients",
        reason: `${email} excluded: ${reason}`,
      });
    }

    // Only clients with a provisioned profile can own rows (client_code FK).
    const { data: profileRows, error: profilesErr } = await admin
      .from("profiles")
      .select("client_code, email");
    if (profilesErr) return fail(`fetch profiles: ${profilesErr.message}`);

    const codeByEmail = new Map<string, string>();
    for (const p of profileRows ?? []) {
      if (p.email) codeByEmail.set(String(p.email).toLowerCase(), p.client_code);
    }

    // The Sheet now carries its own CLIENT CODE column. The database remains the
    // authority for the foreign key, but a disagreement means the two records
    // have drifted apart and someone should look, so it is reported rather than
    // silently ignored.
    for (const c of clients.valid) {
      const dbCode = codeByEmail.get(c.email);
      if (!c.clientCode || !dbCode) continue;
      if (c.clientCode.trim().toUpperCase() !== dbCode.trim().toUpperCase()) {
        warnings.push({
          tab: "Clients",
          reason:
            `${c.email}: Sheet client code '${c.clientCode}' does not match ` +
            `profile client_code '${dbCode}'. Using the profile's.`,
        });
      }
    }

    const unknownEmails = new Set<string>();

    // Keep only holdings for eligible, provisioned clients.
    const admissible = holdings.valid.filter((h) => {
      if (!allowedEmails.has(h.email)) {
        unknownEmails.add(h.email);
        return false;
      }
      if (!codeByEmail.has(h.email)) {
        unknownEmails.add(h.email);
        warnings.push({
          tab: "Holdings",
          reason: `${h.email} has no provisioned profile; holdings not written`,
        });
        return false;
      }
      return true;
    });

    const deduped = dedupeHoldings(admissible);
    warnings.push(...deduped.warnings);

    const plan = buildReplacePlan(deduped.rows);

    // Assertion 1: the plan may only delete months the Sheet actually sent.
    const deleteCheck = verifyDeleteSet(plan, deduped.rows);
    if (!deleteCheck.ok) return fail(deleteCheck.reason, deleteCheck.detail);

    // Assertion 2: no historical month may be deleted. Read what exists first.
    const { data: existingRows, error: existingErr } = await admin
      .from("holdings")
      .select("email, report_month")
      .not("email", "is", null)
      .not("report_month", "is", null);
    if (existingErr) return fail(`fetch existing months: ${existingErr.message}`);

    const existing = (existingRows ?? []).map((r) => ({
      email: String(r.email).toLowerCase(),
      reportMonth: String(r.report_month),
    }));

    const priorCheck = verifyPriorMonthsPreserved(plan, existing, deduped.rows);
    if (!priorCheck.ok) return fail(priorCheck.reason, priorCheck.detail);

    // ── 4. Write. Guards have passed; from here it is safe to mutate. ─────
    let categoriesWritten = 0;
    if (categories.valid.length > 0) {
      const { error } = await admin.from("categories").upsert(
        categories.valid.map((c) => ({
          category: c.category,
          sub_category: c.subCategory,
          display_order: c.displayOrder,
          color: c.color,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: "category,sub_category" }
      );
      if (error) return fail(`upsert categories: ${error.message}`);
      categoriesWritten = categories.valid.length;
    } else {
      warnings.push({
        tab: "Categories",
        reason: "no category rows read; existing categories left in place",
      });
    }

    // Profile names/phones, for eligible clients only.
    let profilesUpdated = 0;
    for (const c of allowed) {
      if (!codeByEmail.has(c.email)) continue;
      const patch: Record<string, string> = {};
      if (c.clientName) patch.full_name = c.clientName;
      if (c.phone) patch.phone = c.phone;
      if (Object.keys(patch).length === 0) continue;
      const { error } = await admin
        .from("profiles")
        .update(patch)
        .eq("client_code", codeByEmail.get(c.email)!);
      if (!error) profilesUpdated += 1;
    }

    // Holdings: one atomic delete+insert per (client, month) via the RPC, so a
    // mid-write failure cannot leave a month empty.
    let holdingsWritten = 0;
    for (const unit of plan) {
      const { error } = await admin.rpc("replace_holdings_for_month", {
        p_email: unit.email,
        p_report_month: unit.reportMonth,
        p_rows: unit.rows.map((r) =>
          toHoldingPayload(r, codeByEmail.get(r.email)!)
        ),
      });
      if (error) {
        return fail(
          `replace holdings for ${unit.email} ${unit.reportMonth}: ${error.message}`
        );
      }
      holdingsWritten += unit.rows.length;
    }

    // Monthly returns: full replace per client. A client legitimately having
    // zero rows is normal (three of four currently do), so an empty series is
    // written as an empty series rather than skipped.
    let monthlyReturnsWritten = 0;
    const monthlyByEmail = new Map<string, typeof monthly.valid>();
    for (const m of monthly.valid) {
      if (!allowedEmails.has(m.email)) {
        unknownEmails.add(m.email);
        continue;
      }
      const arr = monthlyByEmail.get(m.email) ?? [];
      arr.push(m);
      monthlyByEmail.set(m.email, arr);
    }
    for (const email of allowedEmails) {
      const rows = monthlyByEmail.get(email) ?? [];
      const { error } = await admin.rpc("replace_monthly_returns", {
        p_email: email,
        p_rows: rows.map(toMonthlyPayload),
      });
      if (error) return fail(`replace monthly returns for ${email}: ${error.message}`);
      monthlyReturnsWritten += rows.length;
    }

    const result: SyncResult = {
      ok: true,
      startedBy,
      counts: {
        clientsInSheet: clients.valid.length,
        eligibleClients: allowed.length,
        holdingsWritten,
        monthsReplaced: plan.length,
        monthlyReturnsWritten,
        categoriesWritten,
        profilesUpdated,
      },
      preservedMonths: priorCheck.preserved ?? [],
      skipped,
      warnings,
      unknownEmails: Array.from(unknownEmails),
    };

    // Audit metadata stays deliberately summary-only: counts and month keys,
    // never row contents, so client financial data cannot leak into the log.
    await logAudit({
      event: "sync_run",
      metadata: {
        ...result.counts,
        startedBy,
        skipped: skipped.length,
        warnings: warnings.length,
        preservedMonths: result.preservedMonths.length,
        unknownEmails: result.unknownEmails.length,
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return fail(message);
  }
}
