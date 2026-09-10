// Types for the four Sheet tabs, as they actually exist today (quirks and all).
// These describe PARSED rows: every parser normalises before producing one, so
// downstream code never sees a comma-formatted amount or a stray capital.

/**
 * Raw tab contents: row 0 is the header row, the rest are data.
 *
 * Deliberately `unknown`: the Sheets API is read with UNFORMATTED_VALUE, so a
 * cell can come back as a string, a number (amounts, percentages, serial
 * dates) or a boolean. Every parser in parse.ts accepts `unknown` for exactly
 * this reason. Typing this as string[][] would be a lie that hides the quirks.
 */
export type CellValue = unknown;
export type RawRows = CellValue[][];

// ── Clients ───────────────────────────────────────────────────────────────
// Email | Client Name | Phone | Date of Birth | Advisor | Onboarding Date |
// Status | Portal Access | Notes
//
// Only email, clientName, status and portalAccess are reliably populated.
// Everything else is frequently blank, so everything else is optional.
export type ClientRow = {
  /** Always lowercased. Primary key, joins every other tab. */
  email: string;
  /**
   * The firm's own client code from the Sheet (e.g. "AS0002"). Authoritative:
   * profiles.client_code should match it. Null when the column is absent.
   */
  clientCode: string | null;
  clientName: string;
  phone: string | null;
  dateOfBirth: string | null;
  advisor: string | null;
  onboardingDate: string | null;
  /** True only for an explicit "active". */
  active: boolean;
  /** True only for an explicit "yes". */
  portalAccess: boolean;
  notes: string | null;
};

// ── Holdings ──────────────────────────────────────────────────────────────
// a | Report Month | Category | Sub Category | AMC | Folio | Investment Name |
// Invested Amount | Current Value | Last Updated
//
// Column A's header is literally "a", not "Email" (see headers.ts).
export type HoldingRow = {
  email: string;
  /** Always YYYY-MM. */
  reportMonth: string;
  category: string;
  /** Blank for DMAT / Fixed Income / Commodities in most rows. */
  subCategory: string | null;
  amc: string | null;
  folio: string | null;
  investmentName: string;
  /** Full precision. Rounding happens at render, never here. */
  investedAmount: number;
  /** Can be LESS than investedAmount. Losses are live in the data. */
  currentValue: number;
  /** ISO timestamp, used to break duplicate ties. Null when blank. */
  lastUpdated: string | null;
};

// ── Monthly Returns ───────────────────────────────────────────────────────
// Email | Month | Actual Return % | Expected Return % | Portfolio Value
export type MonthlyReturnRow = {
  email: string;
  /** Always YYYY-MM, whatever shape the cell arrived in. */
  month: string;
  /** Percentage POINTS: 1.41 means 1.41%. Never a fraction. */
  actualPct: number | null;
  expectedPct: number | null;
  portfolioValue: number | null;
};

// ── Categories ────────────────────────────────────────────────────────────
// Category | Sub Category | Display Order | Color
export type CategoryRow = {
  category: string;
  /** "" for a category-level row, matching the table's primary key. */
  subCategory: string;
  displayOrder: number;
  /** Unescaped, normalised to #RRGGBB. */
  color: string;
};

// ── Diagnostics ───────────────────────────────────────────────────────────
// A sync never throws on bad input. It collects and reports instead.
export type Skipped = {
  tab: string;
  /** 1-indexed sheet row, so it can be found by eye in the Sheet. */
  row: number;
  reason: string;
};

export type Warning = { tab: string; reason: string };

export type ParseResult<T> = {
  valid: T[];
  skipped: Skipped[];
  warnings: Warning[];
  /**
   * Set when the tab could not be parsed at all because a REQUIRED column was
   * not found. Distinct from "no rows": it means the header changed and the
   * sync must abort with an accurate reason rather than reporting an empty tab.
   */
  fatal?: string;
};

export type SheetTabs = {
  clients: RawRows;
  holdings: RawRows;
  monthlyReturns: RawRows;
  categories: RawRows;
};
