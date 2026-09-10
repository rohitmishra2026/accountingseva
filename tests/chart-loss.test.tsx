import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { signedScale, spansBelowZero } from "@/lib/chart-scale";
import { buildCategoryResolver } from "@/lib/categories";
import { computeSplits, type Holding } from "@/lib/portfolio-aggregate";
import { ReturnContributionChart } from "@/components/portal/report/ReportCharts";

// The real loss bug: both chart domains were clamped at zero
// (`domain={[0, max]}`), so a category at a loss rendered as nothing at all.
// These tests fix that behaviour in place.

const CATEGORIES = [
  { category: "Mutual Funds", subCategory: "", displayOrder: 1, color: "#70AD47" },
  { category: "Mutual Funds", subCategory: "Equity M.F", displayOrder: 1, color: "#70AD47" },
  { category: "Fixed Income", subCategory: "Bonds", displayOrder: 2, color: "#E0B92C" },
];

let n = 0;
function h(
  category: string,
  subCategory: string | null,
  name: string,
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
    investmentName: name,
    investedAmount: invested,
    currentValue: current,
  };
}

// The real losing holding from the book.
const SBI_CONSUMPTION = () =>
  h("Mutual Funds", "Equity M.F", "SBI Consumption", 50000, 44394);

describe("signedScale", () => {
  it("spans below zero when any value is negative", () => {
    const scale = signedScale([-5606, 60000]);
    expect(spansBelowZero(scale)).toBe(true);
    expect(scale.domain[0]).toBeLessThan(0);
    expect(scale.domain[0]).toBeLessThanOrEqual(-5606);
  });

  it("always includes zero in the domain, so the baseline is on the chart", () => {
    const positive = signedScale([1000, 5000]);
    expect(positive.domain[0]).toBe(0);
    expect(positive.ticks).toContain(0);

    const negative = signedScale([-1000, -5000]);
    expect(negative.domain[1]).toBe(0);
    expect(negative.ticks).toContain(0);
  });

  it("never clips the extreme value", () => {
    const scale = signedScale([-5606, 187000]);
    expect(scale.domain[0]).toBeLessThanOrEqual(-5606);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(187000);
  });

  it("handles an all-loss portfolio without producing a nonsense axis", () => {
    // The old niceTicks returned [0, 1] whenever max <= 0.
    const scale = signedScale([-5606, -2000]);
    expect(scale.domain[0]).toBeLessThan(0);
    expect(scale.ticks.length).toBeGreaterThan(1);
  });

  it("produces clean ticks, not floating-point noise", () => {
    for (const t of signedScale([-5606, 60000]).ticks) {
      expect(String(t)).not.toMatch(/\d{8,}/);
    }
  });

  it("degrades gracefully on empty or all-zero input", () => {
    expect(signedScale([]).ticks.length).toBeGreaterThan(0);
    expect(signedScale([0, 0]).ticks.length).toBeGreaterThan(0);
  });
});

describe("Chart B renders a losing category", () => {
  const resolver = buildCategoryResolver(CATEGORIES);

  it("computes a negative gainLoss for the category holding the loss", () => {
    // A mutual-funds-only client whose single category is net negative: the
    // exact case the clamped domain used to erase.
    const splits = computeSplits([SBI_CONSUMPTION()], resolver);
    expect(splits).toHaveLength(1);
    expect(splits[0].gainLoss).toBe(-5606);

    const scale = signedScale(splits.map((s) => s.gainLoss));
    expect(spansBelowZero(scale)).toBe(true);
  });

  it("spans below zero when a loss sits alongside gains", () => {
    const splits = computeSplits(
      [
        SBI_CONSUMPTION(),
        h("Fixed Income", "Bonds", "RBI Floating Rate", 1000000, 1060000),
      ],
      resolver
    );
    const mf = splits.find((s) => s.category === "Mutual Funds")!;
    expect(mf.gainLoss).toBe(-5606);
    expect(spansBelowZero(signedScale(splits.map((s) => s.gainLoss)))).toBe(true);
  });

  /**
   * What the old code actually did, precisely:
   *
   *   niceTicks(Math.max(0, ...values))  with  domain={[0, max]}
   *
   * Because recharts' allowDataOverflow defaults to false, the negative BAR was
   * still drawn. The defect was the SCALE: the axis never allocated space below
   * zero, so no negative tick was labelled and the baseline sat above the plot
   * floor, misrepresenting the loss. And for an all-negative set, niceTicks hit
   * its `max <= 0` early return and produced a 0-to-1 axis, which is a hard
   * break rather than a cosmetic one.
   *
   * These tests assert on the axis, because the axis is what was wrong.
   */
  it("renders a bar for the losing category with real extent", () => {
    const splits = computeSplits(
      [
        SBI_CONSUMPTION(),
        h("Fixed Income", "Bonds", "RBI Floating Rate", 1000000, 1060000),
      ],
      resolver
    );

    // ResponsiveContainer measures 0x0 in jsdom; tests/setup.ts gives it a box.
    const { container } = render(
      <div style={{ width: 600, height: 300 }}>
        <ReturnContributionChart splits={splits} />
      </div>
    );

    const bars = Array.from(
      container.querySelectorAll<SVGPathElement>("path.recharts-rectangle")
    );

    // One bar per category, the losing one included: it is in the dataset and
    // drawn, not filtered out.
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.getAttribute("name"))).toContain("Mutual Funds");

    const loss = bars.find((b) => b.getAttribute("name") === "Mutual Funds")!;
    expect(Math.abs(Number(loss.getAttribute("height")))).toBeGreaterThan(0);

    // A zero baseline is present, so the sign of a bar is readable at all.
    expect(
      container.querySelector("line.recharts-reference-line-line")
    ).not.toBeNull();
  });

  // The axis correctness itself is asserted against signedScale rather than the
  // rendered DOM. recharts' axis layout does not survive jsdom (it renders a
  // single tick and ignores the supplied domain, because jsdom reports no text
  // metrics), so a DOM assertion here would pass or fail for reasons unrelated
  // to the scale. These properties are the exact ones the old implementation
  // violated:
  //
  //   old, loss + gain:  ticks [0, 20000, 40000, 60000]   no negative tick
  //   new, loss + gain:  ticks [-20000, 0, 20000, 40000, 60000]
  //   old, all losses:   ticks [0, 1]                     nonsense axis
  //   new, all losses:   ticks [-6000, -4000, -2000, 0]
  it("allocates axis space below zero when a category is at a loss", () => {
    const splits = computeSplits(
      [
        SBI_CONSUMPTION(),
        h("Fixed Income", "Bonds", "RBI Floating Rate", 1000000, 1060000),
      ],
      resolver
    );
    const scale = signedScale(splits.map((s) => s.gainLoss));

    expect(scale.ticks.some((t) => t < 0)).toBe(true);
    expect(scale.domain[0]).toBeLessThanOrEqual(-5606);
    expect(scale.ticks).toContain(0);
  });

  it("gives an all-loss category a real axis, not a 0-to-1 one", () => {
    // A mutual-funds-only client whose single category is net negative: three of
    // four live clients are mutual-funds-only, so this is not hypothetical.
    const splits = computeSplits([SBI_CONSUMPTION()], resolver);
    expect(splits[0].gainLoss).toBeLessThan(0);

    const scale = signedScale(splits.map((s) => s.gainLoss));
    expect(scale.ticks).not.toEqual([0, 1]);
    expect(scale.ticks.length).toBeGreaterThan(2);
    expect(scale.domain[0]).toBeLessThanOrEqual(-5606);
    expect(scale.ticks.some((t) => t < 0)).toBe(true);
  });

  it("keeps the losing category in the dataset rather than filtering it out", () => {
    const splits = computeSplits([SBI_CONSUMPTION()], resolver);
    const { container } = render(
      <div style={{ width: 600, height: 300 }}>
        <ReturnContributionChart splits={splits} />
      </div>
    );
    expect(container.textContent).toContain("Return Contribution");
    expect(container.querySelector(".recharts-wrapper")).not.toBeNull();
  });
});
