// Row shaping for the atomic replace RPCs.
//
// Deliberately free of `server-only` and of any Supabase import: this is the
// boundary between TypeScript and SQL, and it is the one part of the sync most
// worth testing in isolation.
//
// WHY THIS FILE EXISTS: public.replace_holdings_for_month() pulls each value out
// of its JSON argument with `r->>'<key>'`. A key that does not match arrives as
// NULL. TypeScript cannot see that mismatch — the boundary is a JSON blob and a
// SQL string — so `investment_name` vs `instrument_name` passed the type-check,
// the lint and the build, and failed only on the first real sync against live
// data. tests/sync-payload.test.ts now parses the migration and compares the two
// key sets so it cannot drift again.

/** The exact keys replace_holdings_for_month() reads. A contract, not a hint. */
export const HOLDING_PAYLOAD_KEYS = [
  "client_code",
  "category",
  "sub_category",
  "amc",
  "folio",
  "instrument_name",
  "invested_amount",
  "current_value",
  "last_updated",
] as const;

/** The exact keys replace_monthly_returns() reads. */
export const MONTHLY_PAYLOAD_KEYS = [
  "month",
  "actual_pct",
  "expected_pct",
  "portfolio_value",
] as const;

export type HoldingPayloadInput = {
  category: string;
  subCategory: string | null;
  amc: string | null;
  folio: string | null;
  investmentName: string;
  investedAmount: number;
  currentValue: number;
  lastUpdated: string | null;
};

/**
 * Shapes one holding for the replace RPC.
 *
 * Optional fields go as "" rather than null: the SQL function wraps them in
 * nullif(..., ''), and a real null would break the ::numeric / ::timestamptz
 * casts on the way in.
 */
export function toHoldingPayload(
  r: HoldingPayloadInput,
  clientCode: string
): Record<string, unknown> {
  return {
    client_code: clientCode,
    category: r.category,
    sub_category: r.subCategory ?? "",
    amc: r.amc ?? "",
    folio: r.folio ?? "",
    // `instrument_name`, matching the column. NOT `investment_name`.
    instrument_name: r.investmentName,
    invested_amount: r.investedAmount,
    current_value: r.currentValue,
    last_updated: r.lastUpdated ?? "",
  };
}

export type MonthlyPayloadInput = {
  month: string;
  actualPct: number | null;
  expectedPct: number | null;
  portfolioValue: number | null;
};

/** Shapes one monthly-returns row for the replace RPC. */
export function toMonthlyPayload(r: MonthlyPayloadInput): Record<string, unknown> {
  return {
    month: r.month,
    actual_pct: r.actualPct ?? "",
    expected_pct: r.expectedPct ?? "",
    portfolio_value: r.portfolioValue ?? "",
  };
}
