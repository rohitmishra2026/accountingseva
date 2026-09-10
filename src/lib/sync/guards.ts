// Safety guards for the sync, kept as pure functions so they are unit-testable
// without a database or a live Sheet.
//
// The governing rule: prior report months are IMMUTABLE. A sync may only ever
// replace the months present in the payload it is holding. A failed sync is
// always preferable to lost history, so every guard here aborts rather than
// degrades.

import type { ClientRow, HoldingRow } from "./types";

/** One atomic unit of work: replace exactly this client's exactly this month. */
export type ReplacePlan = {
  email: string;
  reportMonth: string;
  rows: HoldingRow[];
};

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string; detail?: string[] };

/**
 * A client may only have data returned for them when the Sheet says BOTH
 * Status = Active AND Portal Access = Yes. Enforced here, server-side, before
 * anything is written or read.
 */
export function eligibleClients(clients: ClientRow[]): ClientRow[] {
  return clients.filter((c) => c.active && c.portalAccess);
}

/** Emails that exist in the Sheet but are not allowed portal data, with why. */
export function ineligibleReasons(clients: ClientRow[]): Array<{
  email: string;
  reason: string;
}> {
  const out: Array<{ email: string; reason: string }> = [];
  for (const c of clients) {
    if (c.active && c.portalAccess) continue;
    const bits: string[] = [];
    if (!c.active) bits.push("status is not Active");
    if (!c.portalAccess) bits.push("portal access is not Yes");
    out.push({ email: c.email, reason: bits.join(" and ") });
  }
  return out;
}

/**
 * Group the payload into per-(client, month) replace units.
 *
 * This is the narrowing that makes prior months safe: the old sync replaced
 * everything for a client in one shot, which would delete every historical
 * month on the first run against the new Sheet.
 */
export function buildReplacePlan(rows: HoldingRow[]): ReplacePlan[] {
  const byKey = new Map<string, ReplacePlan>();
  for (const row of rows) {
    const key = `${row.email}|${row.reportMonth}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      byKey.set(key, {
        email: row.email,
        reportMonth: row.reportMonth,
        rows: [row],
      });
    }
  }
  return Array.from(byKey.values());
}

/** The exact set of (email, month) pairs a plan will delete from. */
export function deleteSet(plan: ReplacePlan[]): Set<string> {
  return new Set(plan.map((p) => `${p.email}|${p.reportMonth}`));
}

/**
 * Pre-flight assertion, run BEFORE any write.
 *
 * Verifies that every (email, month) the plan would delete is actually present
 * in the current Sheet payload. If a plan ever grew to touch a month the Sheet
 * did not send, this aborts the whole run instead of deleting it.
 *
 * With buildReplacePlan() this holds by construction; the check exists so that
 * a future change to the planner cannot quietly start eating history.
 */
export function verifyDeleteSet(
  plan: ReplacePlan[],
  payload: HoldingRow[]
): GuardResult {
  const payloadKeys = new Set(
    payload.map((r) => `${r.email}|${r.reportMonth}`)
  );
  const offending = Array.from(deleteSet(plan)).filter(
    (k) => !payloadKeys.has(k)
  );

  if (offending.length > 0) {
    return {
      ok: false,
      reason:
        "delete-set assertion failed: the plan would delete month(s) that are " +
        "not in the current Sheet payload",
      detail: offending.sort(),
    };
  }
  return { ok: true };
}

/**
 * Second pre-flight assertion, and the one that protects real history.
 *
 * Given what the database already holds, confirm that no month present in the
 * database but ABSENT from the payload is in the delete set. Those are prior
 * months and must survive untouched.
 *
 * Returns the months being preserved so the run can log what it deliberately
 * left alone.
 */
export function verifyPriorMonthsPreserved(
  plan: ReplacePlan[],
  existing: Array<{ email: string; reportMonth: string }>,
  payload: HoldingRow[]
): GuardResult & { preserved?: string[] } {
  const toDelete = deleteSet(plan);
  // Derived from the PAYLOAD, deliberately not from the plan. Deriving it from
  // the plan would compare the plan against itself, so a plan that had grown to
  // include a historical month would silently legitimise that month and the
  // guard would pass. The Sheet payload is the only trustworthy statement of
  // which months are in scope.
  const payloadMonths = new Set(
    payload.map((r) => `${r.email}|${r.reportMonth}`)
  );

  const preserved: string[] = [];
  const violated: string[] = [];

  for (const row of existing) {
    const key = `${row.email}|${row.reportMonth}`;
    if (payloadMonths.has(key)) continue; // in the payload: fair game to replace
    preserved.push(key);
    if (toDelete.has(key)) violated.push(key);
  }

  if (violated.length > 0) {
    return {
      ok: false,
      reason:
        "prior-month assertion failed: the plan would delete historical month(s) " +
        "absent from the current Sheet payload",
      detail: Array.from(new Set(violated)).sort(),
    };
  }
  return { ok: true, preserved: Array.from(new Set(preserved)).sort() };
}

/**
 * Zero-row abort guard.
 *
 * A tab that reads back with no data rows is far more likely to be an API
 * failure, a permissions change or a renamed tab than a genuinely empty book.
 * Under the old full-replace sync that path would have silently deleted every
 * client's holdings, so it now aborts instead.
 */
export function verifyNonEmpty(
  tab: string,
  dataRowCount: number
): GuardResult {
  if (dataRowCount <= 0) {
    return {
      ok: false,
      reason:
        `${tab} tab returned zero data rows. Refusing to sync: an empty read is ` +
        `far more likely to be an API or permissions failure than an empty book. ` +
        `Nothing was written.`,
    };
  }
  return { ok: true };
}

/** Tabs that could not be read at all are always fatal. */
export function verifyTabsReadable(unreadable: string[]): GuardResult {
  if (unreadable.length > 0) {
    return {
      ok: false,
      reason: `could not read tab(s): ${unreadable.join(", ")}. Nothing was written.`,
    };
  }
  return { ok: true };
}
