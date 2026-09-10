// ─────────────────────────────────────────────────────────────────────────
// LEGACY SHAPES. Not used by any live path.
//
// Four components predate the Sheet-schema change and are no longer imported
// anywhere in the app:
//   - components/portal/PortfolioCharts.tsx
//   - components/portal/HoldingsTable.tsx
//   - components/portal/SummaryCards.tsx
//   - components/portal/TransactionsTable.tsx   (kept dormant, deliberately)
//
// They speak the old snake_case row shape. Rather than delete them (out of
// scope) or let them break the typecheck, they type against this file.
//
// TransactionsTable in particular is kept ON PURPOSE: the transactions table
// and its data still exist in the database, the tab has simply been removed
// from the Sheet, so the component is unhooked rather than thrown away.
//
// Nothing here should ever be imported by new code. The live shapes live in
// lib/portfolio-aggregate.ts.
// ─────────────────────────────────────────────────────────────────────────

export type LegacyHolding = {
  id: string;
  client_code: string;
  instrument_type: string;
  instrument_name: string;
  invested_amount: number;
  current_value: number;
  as_of_date: string;
  synced_at: string;
};

export type LegacyTransaction = {
  id: string;
  client_code: string;
  txn_date: string;
  instrument_name: string;
  txn_type: "buy" | "sell" | "dividend" | "interest";
  amount: number;
  synced_at: string;
};

export type LegacyTypeSplit = {
  instrument_type: string;
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
};

export type LegacyTotals = {
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
  asOfDate: string | null;
  count: number;
};
