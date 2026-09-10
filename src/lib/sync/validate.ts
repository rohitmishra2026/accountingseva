// Row parsers for the four Sheet tabs.
//
// Contract for every parser here: a bad row is skipped and reported, never
// thrown. One malformed cell must never take down a whole sync. Columns are
// located by header (see headers.ts), so column order in the Sheet is free to
// change.

import { buildColumnMap, cell, missingFields, type ColumnMap } from "./headers";
import {
  isActiveStatus,
  isGroupingRow,
  isYes,
  normaliseEmail,
  normaliseMonth,
  normalisePercent,
  parseAmount,
  parseColor,
  parseTimestamp,
} from "./parse";
import type {
  CategoryRow,
  ClientRow,
  HoldingRow,
  MonthlyReturnRow,
  ParseResult,
  RawRows,
  Skipped,
  Warning,
} from "./types";

/** Neutral fallback when a colour is missing or unreadable. */
export const FALLBACK_COLOR = "#A6A6A6";
/** Fallback ordering for a category the Categories tab does not know about. */
export const FALLBACK_DISPLAY_ORDER = 999;

/** Splits a tab into its header row and its data rows. */
function split(rows: RawRows): { header: unknown[] | undefined; body: RawRows } {
  if (rows.length === 0) return { header: undefined, body: [] };
  return { header: rows[0], body: rows.slice(1) };
}

/** True when every cell in the row is blank. Blank rows are normal padding. */
function isBlankRow(row: unknown[]): boolean {
  return !row.some((c) => c != null && String(c).trim() !== "");
}

// ── Clients ───────────────────────────────────────────────────────────────
export function parseClients(
  rows: RawRows,
  denylist: Set<string> = new Set()
): ParseResult<ClientRow> {
  const { header, body } = split(rows);
  const { map, warnings } = buildColumnMap("Clients", header);
  const valid: ClientRow[] = [];
  const skipped: Skipped[] = [];

  const absent = missingFields(map, ["email"]);
  if (absent.length > 0) {
    const reason =
      `Clients tab has no recognisable email column. Header row was: ` +
      `${JSON.stringify((header ?? []).map(String))}`;
    warnings.push({ tab: "Clients", reason });
    return { valid, skipped, warnings, fatal: reason };
  }

  body.forEach((row, i) => {
    const rowNum = i + 2; // +1 for the header, +1 for 1-indexing
    if (isBlankRow(row)) return;

    const email = normaliseEmail(cell(row, map, "email"));
    if (email === "") {
      skipped.push({ tab: "Clients", row: rowNum, reason: "missing email" });
      return;
    }
    if (!email.includes("@")) {
      skipped.push({
        tab: "Clients",
        row: rowNum,
        reason: `implausible email '${email}'`,
      });
      return;
    }
    // Test/dummy accounts sit alongside real clients in the same tab. The
    // denylist comes from TEST_CLIENT_EMAILS so it is configurable per
    // environment and not baked into a component.
    if (denylist.has(email)) {
      skipped.push({
        tab: "Clients",
        row: rowNum,
        reason: `denylisted test account '${email}'`,
      });
      return;
    }

    valid.push({
      email,
      clientCode: cell(row, map, "clientCode") || null,
      clientName: cell(row, map, "clientName") || email,
      phone: cell(row, map, "phone") || null,
      dateOfBirth: cell(row, map, "dateOfBirth") || null,
      advisor: cell(row, map, "advisor") || null,
      onboardingDate: cell(row, map, "onboardingDate") || null,
      active: isActiveStatus(cell(row, map, "status")),
      portalAccess: isYes(cell(row, map, "portalAccess")),
      notes: cell(row, map, "notes") || null,
    });
  });

  return { valid, skipped, warnings };
}

// ── Holdings ──────────────────────────────────────────────────────────────
export function parseHoldings(rows: RawRows): ParseResult<HoldingRow> {
  const { header, body } = split(rows);
  const { map, warnings } = buildColumnMap("Holdings", header);
  const valid: HoldingRow[] = [];
  const skipped: Skipped[] = [];

  const absent = missingFields(map, ["email", "reportMonth", "investmentName"]);
  if (absent.length > 0) {
    // A renamed column must not look like an empty tab. Name the column and
    // print the header row so the Sheet edit that caused it is obvious.
    const reason =
      `Holdings tab is missing required column(s): ${absent.join(", ")}. ` +
      `Header row was: ${JSON.stringify((header ?? []).map(String))}`;
    warnings.push({ tab: "Holdings", reason });
    return { valid, skipped, warnings, fatal: reason };
  }

  body.forEach((row, i) => {
    const rowNum = i + 2;
    if (isBlankRow(row)) return;

    const email = normaliseEmail(cell(row, map, "email"));
    const investmentName = cell(row, map, "investmentName");
    const invested = parseAmount(cell(row, map, "investedAmount"));
    const current = parseAmount(cell(row, map, "currentValue"));

    // Sub-category grouping rows: Rohit sir types the sub-category label into
    // the Investment Name column with no amounts. They are headers, not
    // holdings, and must never become data rows. Dropped here, at ingestion,
    // so no view has to know about them.
    if (isGroupingRow(invested, current)) {
      skipped.push({
        tab: "Holdings",
        row: rowNum,
        reason: `grouping row '${investmentName || "(blank)"}' (no amounts); not a holding`,
      });
      return;
    }

    if (email === "") {
      skipped.push({ tab: "Holdings", row: rowNum, reason: "missing email" });
      return;
    }
    if (investmentName === "") {
      skipped.push({
        tab: "Holdings",
        row: rowNum,
        reason: "missing investment name",
      });
      return;
    }

    const reportMonth = normaliseMonth(cell(row, map, "reportMonth"));
    if (!reportMonth) {
      skipped.push({
        tab: "Holdings",
        row: rowNum,
        reason: `unreadable report month '${cell(row, map, "reportMonth")}'`,
      });
      return;
    }
    if (invested == null || current == null) {
      skipped.push({
        tab: "Holdings",
        row: rowNum,
        reason: "non-numeric invested or current amount",
      });
      return;
    }

    const category = cell(row, map, "category");
    if (category === "") {
      // Never drop the holding for a missing category: it is resolved against
      // the Categories tab downstream and falls back to a neutral bucket.
      warnings.push({
        tab: "Holdings",
        reason: `row ${rowNum} ('${investmentName}') has no category; will fall back`,
      });
    }

    valid.push({
      email,
      reportMonth,
      category,
      subCategory: cell(row, map, "subCategory") || null,
      amc: cell(row, map, "amc") || null,
      folio: cell(row, map, "folio") || null,
      investmentName,
      investedAmount: invested,
      currentValue: current,
      lastUpdated: parseTimestamp(cell(row, map, "lastUpdated")),
    });
  });

  return { valid, skipped, warnings };
}

/**
 * Collapse duplicate (email, reportMonth, investmentName) rows, keeping the one
 * with the latest Last Updated. Rows with no timestamp lose to rows with one;
 * if neither has a timestamp the later sheet row wins.
 */
export function dedupeHoldings(rows: HoldingRow[]): {
  rows: HoldingRow[];
  warnings: Warning[];
} {
  const byKey = new Map<string, HoldingRow>();
  const warnings: Warning[] = [];

  for (const row of rows) {
    const key = `${row.email}|${row.reportMonth}|${row.investmentName.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    const a = existing.lastUpdated ? Date.parse(existing.lastUpdated) : -Infinity;
    const b = row.lastUpdated ? Date.parse(row.lastUpdated) : -Infinity;
    // b >= a keeps the later sheet row when both timestamps are missing.
    const keep = b >= a ? row : existing;
    byKey.set(key, keep);

    warnings.push({
      tab: "Holdings",
      reason:
        `duplicate holding '${row.investmentName}' for ${row.email} ${row.reportMonth}; ` +
        `kept the row dated ${keep.lastUpdated ?? "(no timestamp)"}`,
    });
  }

  return { rows: Array.from(byKey.values()), warnings };
}

// ── Monthly Returns ───────────────────────────────────────────────────────
export function parseMonthlyReturns(rows: RawRows): ParseResult<MonthlyReturnRow> {
  const { header, body } = split(rows);
  const { map, warnings } = buildColumnMap("Monthly Returns", header);
  const valid: MonthlyReturnRow[] = [];
  const skipped: Skipped[] = [];

  const absent = missingFields(map, ["email", "month"]);
  if (absent.length > 0) {
    const reason =
      `Monthly Returns tab is missing required column(s): ${absent.join(", ")}. ` +
      `Header row was: ${JSON.stringify((header ?? []).map(String))}`;
    warnings.push({ tab: "Monthly Returns", reason });
    return { valid, skipped, warnings, fatal: reason };
  }

  body.forEach((row, i) => {
    const rowNum = i + 2;
    if (isBlankRow(row)) return;

    const email = normaliseEmail(cell(row, map, "email"));
    if (email === "") {
      skipped.push({ tab: "Monthly Returns", row: rowNum, reason: "missing email" });
      return;
    }

    const month = normaliseMonth(cell(row, map, "month"));
    if (!month) {
      skipped.push({
        tab: "Monthly Returns",
        row: rowNum,
        reason: `unreadable month '${cell(row, map, "month")}'`,
      });
      return;
    }

    const actual = normalisePercent(cell(row, map, "actualPct"));
    const expected = normalisePercent(cell(row, map, "expectedPct"));
    if (actual.ambiguous || expected.ambiguous) {
      warnings.push({
        tab: "Monthly Returns",
        reason: `row ${rowNum} (${email} ${month}) has a percentage in the ambiguous 0.02-1 band; read as a fraction`,
      });
    }

    valid.push({
      email,
      month,
      actualPct: actual.value,
      expectedPct: expected.value,
      portfolioValue: parseAmount(cell(row, map, "portfolioValue")),
    });
  });

  return { valid, skipped, warnings };
}

// ── Categories ────────────────────────────────────────────────────────────
export function parseCategories(rows: RawRows): ParseResult<CategoryRow> {
  const { header, body } = split(rows);
  const { map, warnings } = buildColumnMap("Categories", header);
  const valid: CategoryRow[] = [];
  const skipped: Skipped[] = [];

  const absent = missingFields(map, ["category"]);
  if (absent.length > 0) {
    const reason =
      `Categories tab has no recognisable category column. Header row was: ` +
      `${JSON.stringify((header ?? []).map(String))}`;
    warnings.push({ tab: "Categories", reason });
    return { valid, skipped, warnings, fatal: reason };
  }

  body.forEach((row, i) => {
    const rowNum = i + 2;
    if (isBlankRow(row)) return;

    const category = cell(row, map, "category");
    if (category === "") {
      skipped.push({ tab: "Categories", row: rowNum, reason: "missing category" });
      return;
    }

    const orderRaw = parseAmount(cell(row, map, "displayOrder"));
    const color = parseColor(cell(row, map, "color"));
    if (cell(row, map, "color") !== "" && color === null) {
      warnings.push({
        tab: "Categories",
        reason: `row ${rowNum} ('${category}') has an unreadable colour '${cell(row, map, "color")}'; using ${FALLBACK_COLOR}`,
      });
    }

    valid.push({
      category,
      subCategory: cell(row, map, "subCategory"),
      displayOrder:
        orderRaw != null && Number.isFinite(orderRaw)
          ? Math.round(orderRaw)
          : FALLBACK_DISPLAY_ORDER,
      color: color ?? FALLBACK_COLOR,
    });
  });

  return { valid, skipped, warnings };
}

export type { ColumnMap };
