import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReportTotals } from "@/components/portal/report/ReportTotals";
import type { Totals } from "@/lib/portfolio-data";

// The totals band is the first thing a client reads, and it now carries four
// figures rather than three. These assert what actually renders, because the
// band cannot be opened without signing in.

function totals(over: Partial<Totals> = {}): Totals {
  return {
    invested: 4449779,
    current: 4571597,
    gainLoss: 121818,
    returnPct: 2.74,
    count: 9,
    ...over,
  } as Totals;
}

describe("ReportTotals", () => {
  it("renders the four figures from the printed report", () => {
    const { container } = render(<ReportTotals totals={totals()} />);
    const text = container.textContent ?? "";

    expect(text).toContain("Total Invested (₹)");
    expect(text).toContain("44,49,779");

    expect(text).toContain("Total Current Value (₹)");
    expect(text).toContain("45,71,597");

    expect(text).toContain("Total Appreciation (₹)");
    expect(text).toContain("+ 1,21,818");

    expect(text).toContain("Overall Return");
    expect(text).toContain("+ 2.74%");
  });

  it("shows four cells, not three", () => {
    const { container } = render(<ReportTotals totals={totals()} />);
    const band = container.firstElementChild;
    expect(band?.children.length).toBe(4);
  });

  it("colours appreciation and return green together on a gain", () => {
    const { container } = render(<ReportTotals totals={totals()} />);
    const green = container.querySelectorAll('[class*="2E7D32"]');
    const red = container.querySelectorAll('[class*="C0392B"]');
    expect(green.length).toBe(2);
    expect(red.length).toBe(0);
  });

  it("colours both red on a loss, and shows a minus not a plus", () => {
    const { container } = render(
      <ReportTotals
        totals={totals({ current: 4327961, gainLoss: -121818, returnPct: -2.74 })}
      />
    );
    const text = container.textContent ?? "";

    expect(text).toContain("- 1,21,818");
    expect(text).toContain("- 2.74%");
    // The loss must never render as a gain.
    expect(text).not.toContain("+ 1,21,818");

    expect(container.querySelectorAll('[class*="C0392B"]').length).toBe(2);
    expect(container.querySelectorAll('[class*="2E7D32"]').length).toBe(0);
  });

  it("agrees with itself: appreciation equals current minus invested", () => {
    const t = totals();
    expect(t.current - t.invested).toBe(t.gainLoss);
    const text = render(<ReportTotals totals={t} />).container.textContent ?? "";
    expect(text).toContain("+ 1,21,818");
  });

  it("handles a flat portfolio without rendering a bare zero", () => {
    const text =
      render(
        <ReportTotals
          totals={totals({ current: 4449779, gainLoss: 0, returnPct: 0 })}
        />
      ).container.textContent ?? "";
    expect(text).toContain("+ 0");
    expect(text).toContain("+ 0.00%");
  });
});
