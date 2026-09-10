// Header resolution for the Sheet tabs.
//
// Columns are located BY HEADER NAME, never by fixed index, so Rohit sir can
// reorder or insert a column without breaking the sync. Headers are normalised
// (lowercase, trimmed, punctuation stripped) and then run through an alias map
// that carries explicit entries for the known-bad headers.
//
// An unknown header is logged as a warning and ignored. It never throws and it
// never fails the run.

import type { Warning } from "./types";

/** Canonical field names the parsers ask for. */
export type Field =
  // Clients
  | "clientCode"
  | "email"
  | "clientName"
  | "phone"
  | "dateOfBirth"
  | "advisor"
  | "onboardingDate"
  | "status"
  | "portalAccess"
  | "notes"
  // Holdings
  | "reportMonth"
  | "category"
  | "subCategory"
  | "amc"
  | "folio"
  | "investmentName"
  | "investedAmount"
  | "currentValue"
  | "lastUpdated"
  // Monthly Returns
  | "month"
  | "actualPct"
  | "expectedPct"
  | "portfolioValue"
  // Categories
  | "displayOrder"
  | "color";

/**
 * Normalise a header cell for lookup: lowercase, collapse whitespace, strip
 * punctuation. "Actual Return %" and "actual_return%" both land on
 * "actual return".
 */
export function normaliseHeader(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalised header -> canonical field.
//
// The "a" entry is the one that matters most: column A of the Holdings tab is
// headed with the literal string "a" instead of "Email". It is not going to be
// fixed upstream, so it lives here permanently.
const ALIASES: Record<string, Field> = {
  // ── Known-bad headers, kept deliberately ────────────────────────────────
  // Holdings column A has been headed several different things over time. All
  // of them mean "the client's email". Keep every spelling: renaming this
  // column previously took the whole tab to zero rows.
  a: "email", // the original: literally the letter "a"
  "client mail": "email",
  "clients mail": "email",
  mail: "email",

  // ── Email ───────────────────────────────────────────────────────────────
  email: "email",
  "e mail": "email",
  "email address": "email",
  "client email": "email",

  // ── Clients ─────────────────────────────────────────────────────────────
  // The Sheet owns the client code, so the portal never invents one.
  "client code": "clientCode",
  "client id": "clientCode",
  clientcode: "clientCode",
  clientid: "clientCode",
  code: "clientCode",
  "client name": "clientName",
  name: "clientName",
  "full name": "clientName",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  contact: "phone",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  advisor: "advisor",
  adviser: "advisor",
  "onboarding date": "onboardingDate",
  onboarded: "onboardingDate",
  status: "status",
  "portal access": "portalAccess",
  portal: "portalAccess",
  notes: "notes",
  note: "notes",
  remarks: "notes",

  // ── Holdings ────────────────────────────────────────────────────────────
  "report month": "reportMonth",
  month: "month", // Monthly Returns; disambiguated per-tab below.
  category: "category",
  "sub category": "subCategory",
  subcategory: "subCategory",
  "sub cat": "subCategory",
  amc: "amc",
  "amc name": "amc",
  folio: "folio",
  "folio no": "folio",
  "folio number": "folio",
  "investment name": "investmentName",
  investment: "investmentName",
  "scheme name": "investmentName",
  "invested amount": "investedAmount",
  invested: "investedAmount",
  "amount invested": "investedAmount",
  "current value": "currentValue",
  current: "currentValue",
  "present value": "currentValue",
  "last updated": "lastUpdated",
  updated: "lastUpdated",
  "last update": "lastUpdated",

  // ── Monthly Returns ─────────────────────────────────────────────────────
  "actual return": "actualPct",
  "actual return pct": "actualPct",
  "actual mom return": "actualPct",
  actual: "actualPct",
  "expected return": "expectedPct",
  "expected return pct": "expectedPct",
  "expected mom return": "expectedPct",
  expected: "expectedPct",
  "portfolio value": "portfolioValue",

  // ── Categories ──────────────────────────────────────────────────────────
  "display order": "displayOrder",
  order: "displayOrder",
  sort: "displayOrder",
  color: "color",
  colour: "color",
};

/**
 * Per-tab overrides for headers whose meaning depends on which tab they are in.
 * "Month" is `month` on Monthly Returns but should resolve to `reportMonth` if
 * it ever shows up on Holdings.
 */
const TAB_OVERRIDES: Record<string, Partial<Record<string, Field>>> = {
  Holdings: { month: "reportMonth" },
};

export type ColumnMap = Partial<Record<Field, number>>;

/**
 * Build a field -> column-index map from a header row.
 *
 * Unknown headers produce a warning and are skipped. Duplicate headers keep the
 * FIRST occurrence, so a stray repeated column cannot shadow the real one.
 */
export function buildColumnMap(
  tab: string,
  headerRow: unknown[] | undefined
): { map: ColumnMap; warnings: Warning[] } {
  const map: ColumnMap = {};
  const warnings: Warning[] = [];

  if (!headerRow || headerRow.length === 0) {
    warnings.push({ tab, reason: "header row is missing or empty" });
    return { map, warnings };
  }

  const overrides = TAB_OVERRIDES[tab] ?? {};

  headerRow.forEach((cell, index) => {
    const key = normaliseHeader(cell);
    if (key === "") return; // Trailing empty header cells are normal padding.

    const field = overrides[key] ?? ALIASES[key];
    if (!field) {
      warnings.push({
        tab,
        reason: `unknown header "${String(cell).trim()}" at column ${columnLetter(index)} (ignored)`,
      });
      return;
    }
    if (map[field] === undefined) {
      map[field] = index;
    } else {
      warnings.push({
        tab,
        reason: `duplicate header "${String(cell).trim()}" at column ${columnLetter(index)}; keeping column ${columnLetter(map[field]!)}`,
      });
    }
  });

  return { map, warnings };
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA". Used only for human-readable warnings. */
export function columnLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * Read a cell by field. Returns "" when the column is absent or the cell empty.
 * Stringifies deliberately: every parser in parse.ts accepts a string, and the
 * numeric shapes (amounts, percent fractions, serial dates) all survive the
 * round trip intact.
 */
export function cell(row: unknown[], map: ColumnMap, field: Field): string {
  const i = map[field];
  if (i === undefined) return "";
  const raw = row[i];
  if (raw == null) return "";
  return String(raw).trim();
}

/** True when a required set of fields is all present in the map. */
export function missingFields(map: ColumnMap, required: Field[]): Field[] {
  return required.filter((f) => map[f] === undefined);
}
