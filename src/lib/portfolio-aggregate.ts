// Portfolio aggregation. Pure functions, no I/O, no React, so every rule here
// is unit-testable.
//
// Two rules hold throughout:
//   - Maths runs at full precision. Rounding is a rendering concern only.
//   - Losses are first-class. Nothing clamps at zero, anywhere.

import { normaliseLabel, type CategoryResolver } from "@/lib/categories";

/**
 * Group rows under a label, matching labels the way the resolver matches them.
 *
 * These maps used to key on the RAW Sheet string while the resolver keys on the
 * normalised one. So "Mutual Funds" and "Mutual funds " became two groups, both
 * resolving to the same colour and the same display order: the client saw two
 * identical-looking bars with their money divided between them, and the
 * holdings table grew a duplicate section header. Any label difference the
 * resolver forgives - casing, a trailing space, a double space - could do it,
 * and the Sheet is maintained by hand.
 *
 * The FIRST spelling encountered is kept for display, so nothing about how a
 * correctly-spelled category renders changes. When every label is already
 * consistent this produces exactly the grouping it did before.
 */
function groupByLabel<T>(
  items: T[],
  labelOf: (item: T) => string
): Map<string, { label: string; rows: T[] }> {
  const groups = new Map<string, { label: string; rows: T[] }>();
  for (const item of items) {
    const label = labelOf(item);
    const key = normaliseLabel(label);
    const existing = groups.get(key);
    if (existing) existing.rows.push(item);
    else groups.set(key, { label, rows: [item] });
  }
  return groups;
}

/** A holding as the portal consumes it (already ingested and normalised). */
export type Holding = {
  id: string;
  email: string;
  reportMonth: string;
  category: string;
  subCategory: string | null;
  amc: string | null;
  folio: string | null;
  investmentName: string;
  investedAmount: number;
  currentValue: number;
};

export type Totals = {
  invested: number;
  current: number;
  /** current - invested. Negative for a portfolio at a loss. */
  gainLoss: number;
  /** Percentage points. 0 when nothing is invested, never NaN. */
  returnPct: number;
  count: number;
};

/** Per-category rollup, used by Chart A and Chart B. */
export type CategorySplit = {
  category: string;
  color: string;
  displayOrder: number;
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
  count: number;
};

export type HoldingRowView = Holding & {
  /** current / portfolio current, in percentage points. */
  allocPct: number;
  gainLoss: number;
  returnPct: number;
  /** What the CATEGORY column shows: sub-category when present, else category. */
  categoryLabel: string;
};

/** A sub-category grouping header plus the holdings under it. */
export type SubGroup = {
  /** null when the holdings carry no sub-category. */
  subCategory: string | null;
  rows: HoldingRowView[];
  subtotal: Totals;
};

/** A top-level category section: coloured header, then nested sub-groups. */
export type CategoryGroup = {
  category: string;
  color: string;
  displayOrder: number;
  subGroups: SubGroup[];
  subtotal: Totals;
};

/** Return percentage in points. Guards divide-by-zero without hiding losses. */
export function returnPct(invested: number, current: number): number {
  if (!invested) return 0;
  return ((current - invested) / invested) * 100;
}

export function computeTotals(holdings: Holding[]): Totals {
  let invested = 0;
  let current = 0;
  for (const h of holdings) {
    invested += Number(h.investedAmount);
    current += Number(h.currentValue);
  }
  return {
    invested,
    current,
    gainLoss: current - invested,
    returnPct: returnPct(invested, current),
    count: holdings.length,
  };
}

/**
 * Per-category rollup in the Categories tab's display order.
 *
 * Categories with no holdings simply do not appear: an empty category is hidden
 * entirely rather than rendered as a zero bar. That is what makes a
 * mutual-funds-only client chart correctly with one or two bars.
 */
export function computeSplits(
  holdings: Holding[],
  resolver: CategoryResolver
): CategorySplit[] {
  const byCategory = groupByLabel(holdings, (h) => h.category || "(uncategorised)");

  const splits: CategorySplit[] = [];
  for (const { label: category, rows } of byCategory.values()) {
    const t = computeTotals(rows);
    const meta = resolver.resolve(category);
    splits.push({
      category,
      color: meta.color,
      displayOrder: meta.displayOrder,
      invested: t.invested,
      current: t.current,
      gainLoss: t.gainLoss,
      returnPct: t.returnPct,
      count: t.count,
    });
  }

  return splits.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.category.localeCompare(b.category)
  );
}

/**
 * Build the Detailed Holdings tree: categories in display order, each holding
 * nested sub-category groups.
 *
 * Sub-categories are GROUPING HEADERS, never data rows. The zero-amount
 * grouping rows that arrive in the Sheet are already dropped at ingestion
 * (parse.isGroupingRow), so nothing here has to compensate for them.
 *
 * Subtotals are computed for both levels because the charts need per-category
 * figures. Whether the view renders a subtotal ROW is a layout decision made in
 * the component, not here.
 */
export function buildCategoryGroups(
  holdings: Holding[],
  resolver: CategoryResolver,
  portfolioCurrent: number
): CategoryGroup[] {
  const byCategory = groupByLabel(holdings, (h) => h.category || "(uncategorised)");

  const groups: CategoryGroup[] = [];

  for (const { label: category, rows } of byCategory.values()) {
    const meta = resolver.resolve(category);

    // Group by sub-category, preserving "no sub-category" as its own bucket so
    // DMAT / Fixed Income rows are not forced under a phantom header. Same
    // normalisation as the category above: this previously only trimmed, so
    // "Equity M.F" and "Equity m.f" produced two sub-sections.
    const bySub = groupByLabel(rows, (h) => (h.subCategory ?? "").trim());

    const subGroups: SubGroup[] = Array.from(bySub.values())
      .sort((a, b) => {
        // Unsubcategorised rows first, then alphabetically, so ordering is
        // stable regardless of Sheet row order.
        if (a.label === "") return -1;
        if (b.label === "") return 1;
        return a.label.localeCompare(b.label);
      })
      .map(({ label: sub, rows: subRows }) => ({
        subCategory: sub === "" ? null : sub,
        rows: subRows.map((h) => toRowView(h, portfolioCurrent)),
        subtotal: computeTotals(subRows),
      }));

    groups.push({
      category,
      color: meta.color,
      displayOrder: meta.displayOrder,
      subGroups,
      subtotal: computeTotals(rows),
    });
  }

  return groups.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.category.localeCompare(b.category)
  );
}

function toRowView(h: Holding, portfolioCurrent: number): HoldingRowView {
  const invested = Number(h.investedAmount);
  const current = Number(h.currentValue);
  return {
    ...h,
    investedAmount: invested,
    currentValue: current,
    gainLoss: current - invested,
    returnPct: returnPct(invested, current),
    allocPct: portfolioCurrent > 0 ? (current / portfolioCurrent) * 100 : 0,
    // The report's CATEGORY column shows the sub-category where there is one,
    // and falls back to the category. It is never blank.
    categoryLabel: (h.subCategory ?? "").trim() || h.category || "(uncategorised)",
  };
}
