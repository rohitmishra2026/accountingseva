import { describe, expect, it } from "vitest";
import { buildCategoryResolver, NEUTRAL_COLOR, FALLBACK_ORDER } from "@/lib/categories";
import {
  buildCategoryGroups,
  computeSplits,
  computeTotals,
  returnPct,
  type Holding,
} from "@/lib/portfolio-aggregate";
import { dedupeHoldings } from "@/lib/sync/validate";
import type { HoldingRow } from "@/lib/sync/types";

const CATEGORIES = [
  { category: "DMAT Holdings / Shares", subCategory: "", displayOrder: 1, color: "#2E75B6" },
  { category: "Mutual Funds", subCategory: "", displayOrder: 2, color: "#70AD47" },
  { category: "Mutual Funds", subCategory: "Equity M.F", displayOrder: 2, color: "#70AD47" },
  { category: "Fixed Income", subCategory: "Bonds", displayOrder: 3, color: "#E0B92C" },
];

let n = 0;
function h(
  category: string,
  subCategory: string | null,
  investmentName: string,
  invested: number,
  current: number
): Holding {
  n += 1;
  return {
    id: `h${n}`,
    email: "a@b.com",
    reportMonth: "2026-07",
    category,
    subCategory,
    amc: null,
    folio: null,
    investmentName,
    investedAmount: invested,
    currentValue: current,
  };
}

describe("returnPct", () => {
  it("computes gains and losses", () => {
    expect(returnPct(1000, 1200)).toBeCloseTo(20, 10);
    expect(returnPct(50000, 44394)).toBeCloseTo(-11.212, 3);
  });

  it("returns 0 rather than NaN or Infinity when nothing is invested", () => {
    expect(returnPct(0, 500)).toBe(0);
    expect(returnPct(0, 0)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("sums at full precision, without rounding", () => {
    const t = computeTotals([h("MF", null, "A", 2943579.78, 3000000.22)]);
    expect(t.invested).toBe(2943579.78);
    expect(t.current).toBe(3000000.22);
    expect(t.gainLoss).toBeCloseTo(56420.44, 6);
  });

  it("reproduces the report's headline figures", () => {
    // 1,05,00,000 -> 1,21,60,000 is +15.81%
    const t = computeTotals([h("X", null, "All", 10500000, 12160000)]);
    expect(t.returnPct).toBeCloseTo(15.81, 2);
  });

  it("produces a negative return for a portfolio at a loss", () => {
    const t = computeTotals([h("MF", "Equity M.F", "SBI Consumption", 50000, 44394)]);
    expect(t.gainLoss).toBe(-5606);
    expect(t.returnPct).toBeLessThan(0);
  });

  it("handles an empty portfolio", () => {
    const t = computeTotals([]);
    expect(t).toMatchObject({ invested: 0, current: 0, gainLoss: 0, returnPct: 0, count: 0 });
  });
});

describe("computeSplits", () => {
  const resolver = buildCategoryResolver(CATEGORIES);

  it("orders categories by the Categories tab, not alphabetically", () => {
    const splits = computeSplits(
      [
        h("Fixed Income", "Bonds", "RBI", 1000, 1060),
        h("DMAT Holdings / Shares", null, "HDFC", 1000, 1250),
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
      ],
      resolver
    );
    expect(splits.map((s) => s.category)).toEqual([
      "DMAT Holdings / Shares",
      "Mutual Funds",
      "Fixed Income",
    ]);
  });

  it("carries the colour from the Categories tab", () => {
    const splits = computeSplits([h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200)], resolver);
    expect(splits[0].color).toBe("#70AD47");
  });

  it("hides empty categories entirely: a mutual-funds-only client gets one bar", () => {
    // Three of four live clients are in exactly this state.
    const splits = computeSplits(
      [
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
        h("Mutual Funds", "Equity M.F", "SBI Small Cap", 500, 600),
      ],
      resolver
    );
    expect(splits).toHaveLength(1);
    expect(splits[0].count).toBe(2);
  });

  it("reports a negative category return, which Chart B must render", () => {
    const splits = computeSplits(
      [h("Mutual Funds", "Equity M.F", "SBI Consumption", 50000, 44394)],
      resolver
    );
    expect(splits[0].gainLoss).toBe(-5606);
    expect(splits[0].returnPct).toBeLessThan(0);
  });
});

describe("category fallback chain", () => {
  const resolver = buildCategoryResolver(CATEGORIES);

  it("matches an exact category / sub-category pair", () => {
    expect(resolver.resolve("Mutual Funds", "Equity M.F").matched).toBe("pair");
  });

  it("falls back to a category-only match for an unknown sub-category", () => {
    const r = resolver.resolve("Mutual Funds", "Some New Sub Category");
    expect(r.matched).toBe("category");
    expect(r.color).toBe("#70AD47");
  });

  it("falls back to neutral grey and order 999 for an unknown category, and logs it", () => {
    const r = resolver.resolve("Crypto", "Bitcoin");
    expect(r.matched).toBe("fallback");
    expect(r.color).toBe(NEUTRAL_COLOR);
    expect(r.displayOrder).toBe(FALLBACK_ORDER);
    expect(resolver.unmatched()).toContain("Crypto / Bitcoin");
  });

  it("never drops a holding whose category is unknown", () => {
    const local = buildCategoryResolver(CATEGORIES);
    const splits = computeSplits([h("Crypto", "Bitcoin", "BTC", 1000, 900)], local);
    expect(splits).toHaveLength(1);
    expect(splits[0].category).toBe("Crypto");
  });

  it("is insensitive to casing and stray whitespace in the Sheet", () => {
    expect(resolver.resolve("  mutual funds  ", "equity m.f").matched).not.toBe("fallback");
  });
});

describe("buildCategoryGroups", () => {
  const resolver = buildCategoryResolver(CATEGORIES);

  const holdings = [
    h("DMAT Holdings / Shares", null, "HDFC Bank Ltd", 1000000, 1250000),
    h("Mutual Funds", "Equity M.F", "PPFAS", 1000000, 1200000),
    h("Mutual Funds", "Equity M.F", "SBI Consumption", 50000, 44394),
    h("Mutual Funds", "Debt M.F", "HDFC Corp Bond", 500000, 540000),
  ];
  const totals = computeTotals(holdings);
  const groups = buildCategoryGroups(holdings, resolver, totals.current);

  it("nests sub-categories under their category, in display order", () => {
    expect(groups.map((g) => g.category)).toEqual([
      "DMAT Holdings / Shares",
      "Mutual Funds",
    ]);
    const mf = groups[1];
    expect(mf.subGroups.map((s) => s.subCategory)).toEqual(["Debt M.F", "Equity M.F"]);
  });

  it("keeps unsubcategorised holdings in their own bucket, not under a phantom header", () => {
    const dmat = groups[0];
    expect(dmat.subGroups).toHaveLength(1);
    expect(dmat.subGroups[0].subCategory).toBeNull();
  });

  it("emits no row for a sub-category itself: it is a header", () => {
    const everyRow = groups.flatMap((g) => g.subGroups.flatMap((s) => s.rows));
    // "Equity M.F" is a grouping label and must never appear as a holding name.
    expect(everyRow.map((r) => r.investmentName)).not.toContain("Equity M.F");
    expect(everyRow).toHaveLength(4);
    // And no row is a zero-value placeholder.
    expect(everyRow.every((r) => r.investedAmount !== 0 || r.currentValue !== 0)).toBe(true);
  });

  it("computes alloc % against the whole portfolio's current value", () => {
    const all = groups.flatMap((g) => g.subGroups.flatMap((s) => s.rows));
    const sum = all.reduce((s, r) => s + r.allocPct, 0);
    expect(sum).toBeCloseTo(100, 6);
    const hdfc = all.find((r) => r.investmentName === "HDFC Bank Ltd")!;
    expect(hdfc.allocPct).toBeCloseTo((1250000 / totals.current) * 100, 10);
  });

  it("computes category and sub-category subtotals", () => {
    const mf = groups[1];
    expect(mf.subtotal.invested).toBe(1550000);
    expect(mf.subtotal.current).toBe(1784394);

    const equity = mf.subGroups.find((s) => s.subCategory === "Equity M.F")!;
    expect(equity.subtotal.invested).toBe(1050000);
    expect(equity.subtotal.current).toBe(1244394);
  });

  it("subtotals sum to the portfolio total", () => {
    const invested = groups.reduce((s, g) => s + g.subtotal.invested, 0);
    expect(invested).toBe(totals.invested);
  });

  it("carries a negative return through to the row", () => {
    const all = groups.flatMap((g) => g.subGroups.flatMap((s) => s.rows));
    const loss = all.find((r) => r.investmentName === "SBI Consumption")!;
    expect(loss.gainLoss).toBe(-5606);
    expect(loss.returnPct).toBeLessThan(0);
  });

  it("shows the sub-category in the CATEGORY column, falling back to the category", () => {
    const all = groups.flatMap((g) => g.subGroups.flatMap((s) => s.rows));
    expect(all.find((r) => r.investmentName === "PPFAS")!.categoryLabel).toBe("Equity M.F");
    // DMAT has no sub-category, so the column shows the category. Never blank:
    // this is the fix for the dropped Fixed Income values.
    expect(all.find((r) => r.investmentName === "HDFC Bank Ltd")!.categoryLabel).toBe(
      "DMAT Holdings / Shares"
    );
  });

  it("does not divide by zero when the portfolio has no current value", () => {
    const g = buildCategoryGroups([h("MF", null, "Dead", 1000, 0)], resolver, 0);
    expect(g[0].subGroups[0].rows[0].allocPct).toBe(0);
  });
});

describe("dedupeHoldings", () => {
  function row(name: string, current: number, lastUpdated: string | null): HoldingRow {
    return {
      email: "a@b.com",
      reportMonth: "2026-07",
      category: "Mutual Funds",
      subCategory: "Equity M.F",
      amc: null,
      folio: null,
      investmentName: name,
      investedAmount: 1000,
      currentValue: current,
      lastUpdated,
    };
  }

  it("keeps the latest Last Updated for a duplicate key, and logs it", () => {
    const { rows, warnings } = dedupeHoldings([
      row("PPFAS", 1100, "2026-07-01T00:00:00.000Z"),
      row("PPFAS", 1250, "2026-07-13T00:00:00.000Z"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].currentValue).toBe(1250);
    expect(warnings.some((w) => w.reason.includes("duplicate holding"))).toBe(true);
  });

  it("prefers a timestamped row over an untimestamped one", () => {
    const { rows } = dedupeHoldings([
      row("PPFAS", 1100, null),
      row("PPFAS", 1250, "2026-07-13T00:00:00.000Z"),
    ]);
    expect(rows[0].currentValue).toBe(1250);
  });

  it("keeps the later sheet row when neither is timestamped", () => {
    const { rows } = dedupeHoldings([row("PPFAS", 1100, null), row("PPFAS", 1250, null)]);
    expect(rows[0].currentValue).toBe(1250);
  });

  it("treats different names and different months as distinct", () => {
    const a = row("PPFAS", 1100, null);
    const b = row("SBI Small Cap", 1200, null);
    const c = { ...row("PPFAS", 1300, null), reportMonth: "2026-06" };
    expect(dedupeHoldings([a, b, c]).rows).toHaveLength(3);
  });

  it("matches case-insensitively on the investment name", () => {
    const { rows } = dedupeHoldings([row("PPFAS", 1100, null), row("ppfas", 1250, null)]);
    expect(rows).toHaveLength(1);
  });
});

// ── Label variants must not split a category ──────────────────────────────
// The grouping maps used to key on the raw Sheet string while the resolver
// keyed on a normalised one, so a category could split into two groups that
// both resolved to the same colour and display order. The Sheet is maintained
// by hand, so casing drift and stray spaces are expected input.
describe("category grouping tolerates label variants", () => {
  const resolver = buildCategoryResolver(CATEGORIES);

  it("merges categories differing only by case or whitespace in computeSplits", () => {
    const splits = computeSplits(
      [
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
        h("Mutual funds", "Equity M.F", "SBI Small Cap", 500, 600),
        h("Mutual  Funds ", "Equity M.F", "Axis Bluechip", 500, 550),
      ],
      resolver
    );

    expect(splits).toHaveLength(1);
    expect(splits[0].category).toBe("Mutual Funds"); // first spelling wins
    expect(splits[0].invested).toBe(2000);
    expect(splits[0].current).toBe(2350);
    expect(splits[0].count).toBe(3);
  });

  it("merges the same variants in buildCategoryGroups", () => {
    const groups = buildCategoryGroups(
      [
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
        h("mutual funds", "Equity M.F", "SBI Small Cap", 500, 600),
      ],
      resolver,
      1800
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("Mutual Funds");
    expect(groups[0].subtotal.invested).toBe(1500);
  });

  it("merges sub-categories differing only by case", () => {
    const groups = buildCategoryGroups(
      [
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
        h("Mutual Funds", "equity m.f", "SBI Small Cap", 500, 600),
      ],
      resolver,
      1800
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].subGroups).toHaveLength(1);
    expect(groups[0].subGroups[0].subCategory).toBe("Equity M.F");
    expect(groups[0].subGroups[0].rows).toHaveLength(2);
  });

  it("still keeps genuinely different categories apart", () => {
    const splits = computeSplits(
      [
        h("Mutual Funds", "Equity M.F", "PPFAS", 1000, 1200),
        h("Fixed Income", "Bonds", "RBI Floating", 500, 530),
      ],
      resolver
    );
    expect(splits).toHaveLength(2);
  });
});
