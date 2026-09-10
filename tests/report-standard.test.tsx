import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type {
  CategoryGroup,
  CategorySplit,
  Holding,
  Totals,
} from "@/lib/portfolio-data";
import { ReportAllocation } from "@/components/portal/report/ReportAllocation";
import { ReportHoldings } from "@/components/portal/report/ReportHoldings";
import { ReportStatRail } from "@/components/portal/report/ReportStatRail";
import { contrastRatio, readableOn } from "@/lib/portfolio-constants";

// The redesigned Standard view is what the client actually receives, and it
// cannot be opened without signing in. These assert the cases that are easy to
// get right with the demo data and wrong with real data: a portfolio at a loss,
// a single category, a category the Sheet coloured pale yellow, and a client
// with nothing invested at all.

function totals(over: Partial<Totals> = {}): Totals {
  return {
    invested: 10500000,
    current: 12160000,
    gainLoss: 1660000,
    returnPct: 15.81,
    count: 18,
    ...over,
  };
}

function split(over: Partial<CategorySplit> = {}): CategorySplit {
  return {
    category: "Mutual Funds",
    color: "#2F9E5C",
    displayOrder: 1,
    invested: 3500000,
    current: 4000000,
    gainLoss: 500000,
    returnPct: 14.29,
    count: 8,
    ...over,
  };
}

function holding(over: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    email: "c@example.com",
    reportMonth: "2026-07",
    category: "Mutual Funds",
    subCategory: null,
    amc: null,
    folio: null,
    investmentName: "Parag Parikh Flexi Cap",
    investedAmount: 1000000,
    currentValue: 1200000,
    ...over,
  };
}

describe("ReportStatRail", () => {
  it("shows the headline figures the rail replaced the totals band with", () => {
    const { container } = render(
      <ReportStatRail
        totals={totals()}
        splits={[split(), split({ category: "Fixed Income" })]}
        holdings={[holding()]}
        reportMonth="2026-07"
      />
    );
    const text = container.textContent ?? "";

    expect(text).toContain("+15.81%");
    expect(text).toContain("₹1,05,00,000");
    expect(text).toContain("₹1,21,60,000");
    expect(text).toContain("+₹16,60,000");
    expect(text).toContain("18 instruments");
    // Asset classes is the number of categories actually held.
    expect(text).toContain("Asset classes");
  });

  it("reads as a loss, in the loss colour, when the portfolio is down", () => {
    const { container } = render(
      <ReportStatRail
        totals={totals({ gainLoss: -840000, returnPct: -8.0, current: 9660000 })}
        splits={[split()]}
        holdings={[holding()]}
        reportMonth="2026-07"
      />
    );
    const text = container.textContent ?? "";

    expect(text).toContain("-8.00%");
    expect(text).toContain("-₹8,40,000");
    expect(text).not.toContain("+₹8,40,000");

    // The two figures that carry the sign must both take the loss tone.
    // jsdom serialises an inline colour as rgb(), so LOSS_ON_INK (#E89189) is
    // matched in that form. The white accent rules beside each stat are
    // decorative and stay green; so does a holding that is itself up.
    const loss = "rgb(232, 145, 137)";
    const headline = [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("-8.00%")
    );
    const appreciation = [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("-₹8,40,000")
    );
    expect(headline?.getAttribute("style")).toContain(loss);
    expect(appreciation?.getAttribute("style")).toContain(loss);
  });

  it("picks the top performer by return, ignoring holdings with nothing in them", () => {
    const { container } = render(
      <ReportStatRail
        totals={totals()}
        splits={[split()]}
        holdings={[
          holding({ id: "a", investmentName: "Modest", investedAmount: 100000, currentValue: 110000 }),
          holding({ id: "b", investmentName: "Star", investedAmount: 100000, currentValue: 200000 }),
          // Zero invested: returnPct is undefined for it, so it must not win.
          holding({ id: "c", investmentName: "Dormant", investedAmount: 0, currentValue: 500000 }),
        ]}
        reportMonth="2026-07"
      />
    );
    const text = container.textContent ?? "";

    expect(text).toContain("Star");
    expect(text).toContain("+100.0%");
    expect(text).not.toContain("Dormant");
  });

  it("omits the top performer rather than inventing one when nothing is invested", () => {
    const { container } = render(
      <ReportStatRail
        totals={totals({ invested: 0, current: 0, gainLoss: 0, returnPct: 0, count: 0 })}
        splits={[]}
        holdings={[holding({ investedAmount: 0, currentValue: 0 })]}
        reportMonth="2026-07"
      />
    );
    expect(container.textContent ?? "").not.toContain("Top performer");
  });
});

describe("ReportAllocation", () => {
  const splits = [
    split({ category: "DMAT Holdings / Shares", current: 3800000, invested: 3000000, gainLoss: 800000, returnPct: 26.67 }),
    split({ category: "Mutual Funds", current: 4000000 }),
  ];

  it("measures share against current value and totals to 100%", () => {
    const { container } = render(
      <ReportAllocation splits={splits} totals={totals({ current: 7800000 })} />
    );
    const text = container.textContent ?? "";

    // 38,00,000 / 78,00,000 = 48.7%
    expect(text).toContain("48.7%");
    // 40,00,000 / 78,00,000 = 51.3%
    expect(text).toContain("51.3%");
    expect(text).toContain("100%");
  });

  it("does not divide by zero when the portfolio has no current value", () => {
    const { container } = render(
      <ReportAllocation
        splits={[split({ current: 0, invested: 0, gainLoss: 0, returnPct: 0 })]}
        totals={totals({ invested: 0, current: 0, gainLoss: 0, returnPct: 0, count: 0 })}
      />
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("NaN");
    expect(text).toContain("0.0%");
  });

  it("renders nothing at all when there are no categories", () => {
    const { container } = render(
      <ReportAllocation splits={[]} totals={totals()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("gives every column header a scope, so the table is navigable", () => {
    const { container } = render(
      <ReportAllocation splits={splits} totals={totals({ current: 7800000 })} />
    );
    const heads = [...container.querySelectorAll("thead th")];
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.every((th) => th.getAttribute("scope") === "col")).toBe(true);
  });
});

describe("ReportHoldings", () => {
  function group(over: Partial<CategoryGroup> = {}): CategoryGroup {
    return {
      category: "Mutual Funds",
      color: "#2F9E5C",
      displayOrder: 1,
      subtotal: totals(),
      subGroups: [
        {
          subCategory: "EQUITY M.F",
          subtotal: totals(),
          rows: [
            {
              ...holding(),
              allocPct: 9.9,
              gainLoss: 200000,
              returnPct: 20,
              categoryLabel: "Equity M.F",
            },
          ],
        },
      ],
      ...over,
    };
  }

  it("drops the redundant CATEGORY column and keeps the six that carry figures", () => {
    const { container } = render(
      <ReportHoldings groups={[group()]} totals={totals()} />
    );
    const heads = [...container.querySelectorAll("thead th")].map(
      (th) => th.textContent?.trim() ?? ""
    );
    expect(heads).toEqual([
      "Investment Name",
      "Alloc %",
      "Invested (₹)",
      "Current (₹)",
      "Return (₹)",
      "Ret %",
    ]);
  });

  it("marks category and sub-category rows as headers, not data", () => {
    const { container } = render(
      <ReportHoldings groups={[group()]} totals={totals()} />
    );
    const groupHeaders = [...container.querySelectorAll('th[scope="colgroup"]')].map(
      (th) => th.textContent?.trim() ?? ""
    );
    expect(groupHeaders).toContain("Mutual Funds");
    expect(groupHeaders).toContain("EQUITY M.F");
  });

  it("renders a losing holding with its sign intact", () => {
    const g = group();
    g.subGroups[0].rows[0] = {
      ...g.subGroups[0].rows[0],
      gainLoss: -50000,
      returnPct: -5,
    };
    const { container } = render(
      <ReportHoldings groups={[g]} totals={totals()} />
    );
    const text = container.textContent ?? "";
    expect(text).toContain("-50,000");
    expect(text).toContain("-5.0%");
  });
});

describe("readableOn", () => {
  // Category colours come from the Sheet. Anything used as TEXT has to stay
  // legible whatever the client chose, including colours that are nearly white.
  const backgrounds = ["#FFFFFF", "#F3F5F9"];
  const awkward = [
    "#F5E663", // pale yellow
    "#A6BFDC", // the light blue used for bars
    "#E0913A", // the mockup's orange
    "#2F9E5C",
    "#16345F",
    "not-a-colour",
  ];

  it("always returns a colour that clears WCAG AA on the given background", () => {
    for (const bg of backgrounds) {
      for (const c of awkward) {
        expect(contrastRatio(readableOn(c, bg), bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("leaves an already-dark colour essentially alone", () => {
    expect(readableOn("#16345F", "#FFFFFF")).toBe("#16345F");
  });
});
