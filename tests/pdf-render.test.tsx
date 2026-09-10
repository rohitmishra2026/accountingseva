// @vitest-environment node
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PortfolioPdf } from "@/components/portal/PortfolioPdf";
import { registerReportFonts } from "@/lib/pdf-assets";
import type {
  CategoryGroup,
  CategorySplit,
  Holding,
  MonthlyReturn,
  Totals,
} from "@/lib/portfolio-data";

// The downloaded statement is the one thing in the portal a client keeps, and
// it is the hardest path to notice breaking: it needs a session, a Node
// runtime and a font registration, so nothing else in the suite touches it.
// @react-pdf throws on an unsupported style value rather than degrading, so a
// document that renders at all is a meaningful signal.
//
// Runs in the node environment: @react-pdf needs Node APIs, and tests/setup.ts
// is guarded so its jsdom shims are skipped here.

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

const splits: CategorySplit[] = [
  {
    category: "DMAT Holdings / Shares",
    color: "#16345F",
    displayOrder: 1,
    invested: 3000000,
    current: 3800000,
    gainLoss: 800000,
    returnPct: 26.67,
    count: 3,
  },
  {
    // A pale colour, to exercise readableOn() on the value label.
    category: "Cash & Cash Equivalents",
    color: "#F5E663",
    displayOrder: 2,
    invested: 1000000,
    current: 1060000,
    gainLoss: 60000,
    returnPct: 6,
    count: 2,
  },
];

const holding: Holding = {
  id: "h1",
  email: "c@example.com",
  reportMonth: "2026-07",
  category: "DMAT Holdings / Shares",
  subCategory: null,
  amc: null,
  folio: null,
  investmentName: "Reliance Industries",
  investedAmount: 1000000,
  currentValue: 1300000,
};

const groups: CategoryGroup[] = [
  {
    category: "DMAT Holdings / Shares",
    color: "#16345F",
    displayOrder: 1,
    subtotal: totals(),
    subGroups: [
      {
        subCategory: "EQUITY",
        subtotal: totals(),
        rows: [
          {
            ...holding,
            allocPct: 10.7,
            gainLoss: 300000,
            returnPct: 30,
            categoryLabel: "Equity",
          },
        ],
      },
    ],
  },
];

const monthly: MonthlyReturn[] = [
  { month: "2026-06", actualPct: 1.2, expectedPct: 0.8 },
  { month: "2026-07", actualPct: -0.4, expectedPct: 0.9 },
];

function render(over: { totals?: Totals; monthly?: MonthlyReturn[] } = {}) {
  registerReportFonts();
  const element = React.createElement(PortfolioPdf, {
    firmName: "AccountingSeva",
    clientName: "Dr. Shailesh Kamat",
    reportDateLine: "Report Month: July 2026",
    reportMonthLabel: "July 2026",
    generatedLine: "Generated: 01 Sept 2026",
    logoDataUri: null,
    totals: over.totals ?? totals(),
    groups,
    splits,
    holdings: [holding],
    monthly: over.monthly ?? monthly,
  }) as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(element);
}

describe("PortfolioPdf", () => {
  it("renders a complete statement", async () => {
    const buffer = await render();
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(10_000);
  }, 30_000);

  it("renders a portfolio at a loss", async () => {
    // The rail, the allocation total and the holdings rows all switch tone on
    // the sign. A negative return also puts the bar chart's baseline above the
    // bottom of the plot, which is where the old clamped scale used to fail.
    const buffer = await render({
      totals: totals({ current: 9660000, gainLoss: -840000, returnPct: -8 }),
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(10_000);
  }, 30_000);

  it("renders when the client has no monthly returns", async () => {
    // Three of four clients currently have none; the Performance Trend section
    // must be omitted rather than drawing an empty axis.
    const buffer = await render({ monthly: [] });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(10_000);
  }, 30_000);
});
