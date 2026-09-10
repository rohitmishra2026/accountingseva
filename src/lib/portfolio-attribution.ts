// Pure attribution maths for the Detailed portfolio view. No React, no
// charting: every derived number the Detailed view shows is computed here so
// the figures can be reasoned about (and unit tested) in one place.
//
// Everything rests on one identity:
//
//   contributionPp_i = gainLoss_i / totalInvested * 100
//                    = weightInvested_i * returnPct_i
//   Σ contributionPp_i  ===  overall return %
//
// That is what makes the view trustworthy: the parts provably sum to the
// whole, at holding level and at category level. Nothing here is annualised,
// because purchase dates per holding are not recorded.

import type {
  CategorySplit,
  Holding,
  MonthlyReturn,
  Totals,
} from "@/lib/portfolio-data";
import { computeReturnPct } from "@/lib/format";
import { NEUTRAL_COLOR } from "@/lib/portfolio-constants";

// Categories are Sheet-driven now, so a category is a plain string and its
// colour arrives on the split rather than from a lookup table.
type CategoryKey = string;

export type HoldingAttribution = {
  id: string;
  name: string;
  category: CategoryKey;
  categoryLabel: string;
  color: string;
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
  /** Share of the money put in. The decision, before the outcome. */
  weightInvestedPct: number;
  /** Share of today's value. The result. */
  weightCurrentPct: number;
  /** Percentage points of the portfolio return this holding produced. */
  contributionPp: number;
  /** Share of the total gains, for winners. Null when there are no gains. */
  shareOfGainPct: number | null;
  /** This holding's return minus its own category's return. */
  vsCategoryPp: number;
};

export type CategoryAttribution = {
  key: CategoryKey;
  label: string;
  color: string;
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
  weightInvestedPct: number;
  weightCurrentPct: number;
  contributionPp: number;
  holdings: number;
};

export type Concentration = {
  largestWeightPct: number;
  largestName: string;
  topFiveWeightPct: number;
  /** 1 / Σ w², the "behaves like N equal holdings" number. */
  effectiveHoldings: number;
  /** Σ w², the Herfindahl index. Shown only in the method notes. */
  herfindahl: number;
  /** Share of total gains produced by the three biggest gainers. */
  topThreeGainSharePct: number | null;
  verdict: "Low" | "Moderate" | "High";
  /** Cumulative weight and gain share by holding rank. */
  curve: { rank: number; name: string; cumWeightPct: number; cumGainSharePct: number | null }[];
};

export type MonthlyAnalysis = {
  rows: {
    month: string;
    actualPct: number;
    expectedPct: number;
    gapPp: number;
    actualIndex: number;
    expectedIndex: number;
  }[];
  monthsAhead: number;
  monthsTotal: number;
  /** Compounded actual against compounded expected, in percentage points. */
  cumulativeGapPp: number;
  compoundedActualPct: number;
  compoundedExpectedPct: number;
  best: { month: string; pct: number } | null;
  weakest: { month: string; pct: number } | null;
};

export type Attribution = {
  holdings: HoldingAttribution[];
  categories: CategoryAttribution[];
  grossGain: number;
  grossLoss: number;
  netGain: number;
  concentration: Concentration | null;
  /** True when the maths is meaningful (there is invested capital). */
  usable: boolean;
};

export function buildAttribution(
  holdings: Holding[],
  totals: Totals,
  splits: CategorySplit[]
): Attribution {
  const totalInvested = Number(totals.invested) || 0;
  const totalCurrent = Number(totals.current) || 0;

  // Every contribution formula divides by invested capital. Without it the
  // whole view is meaningless, so bail out rather than render zeroes.
  if (totalInvested <= 0 || holdings.length === 0) {
    return {
      holdings: [],
      categories: [],
      grossGain: 0,
      grossLoss: 0,
      netGain: 0,
      concentration: null,
      usable: false,
    };
  }

  const categoryReturn = new Map<string, number>();
  const categoryColorOf = new Map<string, string>();
  for (const s of splits) {
    categoryReturn.set(s.category, s.returnPct);
    categoryColorOf.set(s.category, s.color);
  }

  const rows = holdings.map((h) => {
    const invested = Number(h.investedAmount);
    const current = Number(h.currentValue);
    const gainLoss = current - invested;
    const category = h.category || "(uncategorised)";
    const returnPct = computeReturnPct(invested, current);
    return {
      id: h.id,
      name: h.investmentName,
      category,
      categoryLabel: (h.subCategory ?? "").trim() || category,
      color: categoryColorOf.get(category) ?? NEUTRAL_COLOR,
      invested,
      current,
      gainLoss,
      returnPct,
      weightInvestedPct: (invested / totalInvested) * 100,
      weightCurrentPct: totalCurrent > 0 ? (current / totalCurrent) * 100 : 0,
      contributionPp: (gainLoss / totalInvested) * 100,
      vsCategoryPp: returnPct - (categoryReturn.get(category) ?? 0),
    };
  });

  const grossGain = rows.reduce((s, r) => s + Math.max(r.gainLoss, 0), 0);
  const grossLoss = rows.reduce((s, r) => s + Math.min(r.gainLoss, 0), 0);

  const attributed: HoldingAttribution[] = rows.map((r) => ({
    ...r,
    // Only meaningful for winners, and only when something actually gained.
    shareOfGainPct:
      grossGain > 0 && r.gainLoss > 0 ? (r.gainLoss / grossGain) * 100 : null,
  }));

  // Categories, ordered by the report's own order via splits.
  const categories: CategoryAttribution[] = splits.map((s) => {
    const key = s.category;
    return {
      key,
      label: s.category,
      color: s.color,
      invested: s.invested,
      current: s.current,
      gainLoss: s.gainLoss,
      returnPct: s.returnPct,
      weightInvestedPct: (s.invested / totalInvested) * 100,
      weightCurrentPct: totalCurrent > 0 ? (s.current / totalCurrent) * 100 : 0,
      contributionPp: (s.gainLoss / totalInvested) * 100,
      holdings: attributed.filter((h) => h.category === key).length,
    };
  });

  return {
    holdings: attributed,
    categories,
    grossGain,
    grossLoss: Math.abs(grossLoss),
    netGain: grossGain + grossLoss,
    concentration: buildConcentration(attributed, grossGain),
    usable: true,
  };
}

function buildConcentration(
  rows: HoldingAttribution[],
  grossGain: number
): Concentration {
  const byValue = [...rows].sort(
    (a, b) => b.current - a.current || a.name.localeCompare(b.name)
  );

  const herfindahl = byValue.reduce(
    (s, r) => s + Math.pow(r.weightCurrentPct / 100, 2),
    0
  );
  const topFiveWeightPct = byValue
    .slice(0, 5)
    .reduce((s, r) => s + r.weightCurrentPct, 0);

  const byGain = [...rows].sort(
    (a, b) => b.gainLoss - a.gainLoss || a.name.localeCompare(b.name)
  );
  const topThreeGain = byGain
    .slice(0, 3)
    .reduce((s, r) => s + Math.max(r.gainLoss, 0), 0);

  let cumWeight = 0;
  let cumGain = 0;
  const curve = byValue.map((r, i) => {
    cumWeight += r.weightCurrentPct;
    cumGain += Math.max(r.gainLoss, 0);
    return {
      rank: i + 1,
      name: r.name,
      cumWeightPct: cumWeight,
      cumGainSharePct: grossGain > 0 ? (cumGain / grossGain) * 100 : null,
    };
  });

  return {
    largestWeightPct: byValue[0]?.weightCurrentPct ?? 0,
    largestName: byValue[0]?.name ?? "",
    topFiveWeightPct,
    herfindahl,
    effectiveHoldings: herfindahl > 0 ? 1 / herfindahl : 0,
    topThreeGainSharePct: grossGain > 0 ? (topThreeGain / grossGain) * 100 : null,
    verdict:
      topFiveWeightPct > 65 ? "High" : topFiveWeightPct >= 40 ? "Moderate" : "Low",
    curve,
  };
}

// Compounds the monthly series. Returns are compounded, never summed:
// summing twelve monthly percentages is off by most of a percentage point at
// these levels, and a client with a calculator will find it.
export function analyseMonthly(monthly: MonthlyReturn[]): MonthlyAnalysis | null {
  if (!monthly || monthly.length === 0) return null;

  let actualIndex = 100;
  let expectedIndex = 100;

  const rows = monthly.map((m) => {
    actualIndex *= 1 + m.actualPct / 100;
    expectedIndex *= 1 + m.expectedPct / 100;
    return {
      month: m.month,
      actualPct: m.actualPct,
      expectedPct: m.expectedPct,
      gapPp: m.actualPct - m.expectedPct,
      actualIndex,
      expectedIndex,
    };
  });

  const compoundedActualPct = (actualIndex / 100 - 1) * 100;
  const compoundedExpectedPct = (expectedIndex / 100 - 1) * 100;

  const sortedByActual = [...monthly].sort((a, b) => b.actualPct - a.actualPct);

  return {
    rows,
    monthsAhead: monthly.filter((m) => m.actualPct >= m.expectedPct).length,
    monthsTotal: monthly.length,
    cumulativeGapPp: (actualIndex / expectedIndex - 1) * 100,
    compoundedActualPct,
    compoundedExpectedPct,
    best: sortedByActual[0]
      ? { month: sortedByActual[0].month, pct: sortedByActual[0].actualPct }
      : null,
    weakest: sortedByActual[sortedByActual.length - 1]
      ? {
          month: sortedByActual[sortedByActual.length - 1].month,
          pct: sortedByActual[sortedByActual.length - 1].actualPct,
        }
      : null,
  };
}

// Rows for the return bridge: opening invested, one delta per category, then
// the closing value. `base` is the floating start of each bar, `delta` its
// height, so a plain stacked bar chart renders a waterfall.
export type BridgeRow = {
  label: string;
  kind: "total" | "delta";
  base: number;
  delta: number;
  value: number;
  color: string;
};

export function buildBridge(
  totals: Totals,
  categories: CategoryAttribution[]
): BridgeRow[] {
  const rows: BridgeRow[] = [
    {
      label: "Invested",
      kind: "total",
      base: 0,
      delta: totals.invested,
      value: totals.invested,
      color: "#9DC3E6",
    },
  ];

  let running = totals.invested;
  for (const c of categories) {
    const base = c.gainLoss >= 0 ? running : running + c.gainLoss;
    rows.push({
      label: c.label,
      kind: "delta",
      base,
      delta: Math.abs(c.gainLoss),
      value: c.gainLoss,
      color: c.gainLoss >= 0 ? c.color : "#C0392B",
    });
    running += c.gainLoss;
  }

  rows.push({
    label: "Current",
    kind: "total",
    base: 0,
    delta: running,
    value: running,
    color: "#A9D18E",
  });

  return rows;
}
