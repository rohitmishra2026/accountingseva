import { describe, expect, it } from "vitest";
import {
  isActiveStatus,
  isGroupingRow,
  isYes,
  normaliseEmail,
  normaliseMonth,
  normalisePercent,
  parseAmount,
  parseColor,
  parseTimestamp,
} from "@/lib/sync/parse";
import {
  formatINR,
  formatMonthShort,
  formatPctSpaced,
  formatReportMonth,
} from "@/lib/format";

// Every case here is a shape that arrives from the live Sheet today. The Sheet
// is not going to be cleaned up, so these are permanent contracts.

describe("parseAmount", () => {
  it("reads comma-formatted strings, including Indian grouping", () => {
    expect(parseAmount("1,000,000")).toBe(1_000_000);
    expect(parseAmount("1,05,00,000")).toBe(1_05_00_000);
  });

  it("reads decimals without losing precision", () => {
    // Precision matters: rounding is a rendering concern, never an ingestion one.
    expect(parseAmount(2943579.78)).toBe(2943579.78);
    expect(parseAmount("2943579.78")).toBe(2943579.78);
  });

  it("reads plain numbers", () => {
    expect(parseAmount(1000000)).toBe(1_000_000);
    expect(parseAmount(0)).toBe(0);
  });

  it("tolerates currency symbols and stray whitespace", () => {
    expect(parseAmount(" ₹ 5,00,000 ")).toBe(500_000);
  });

  it("handles negatives, including accounting parentheses", () => {
    expect(parseAmount("-5,606")).toBe(-5606);
    expect(parseAmount("(1,000)")).toBe(-1000);
  });

  it("returns null for blanks and nonsense rather than throwing", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
    expect(parseAmount("-")).toBeNull();
  });
});

describe("normaliseMonth", () => {
  // The four documented input shapes, all required to work.
  it("accepts YYYY-MM", () => {
    expect(normaliseMonth("2026-07")).toBe("2026-07");
    expect(normaliseMonth("2026-7")).toBe("2026-07");
  });

  it("accepts YYYY-MM-DD (Sheets auto-converted the cell)", () => {
    expect(normaliseMonth("2025-08-01")).toBe("2025-08");
  });

  it("accepts a JS Date", () => {
    expect(normaliseMonth(new Date(Date.UTC(2025, 7, 1)))).toBe("2025-08");
  });

  it("accepts a Google Sheets serial number", () => {
    // 45870 is 2025-08-01; 36526 is 2000-01-01 (epoch 1899-12-30).
    expect(normaliseMonth(45870)).toBe("2025-08");
    expect(normaliseMonth(36526)).toBe("2000-01");
  });

  it("accepts a serial that arrived as text", () => {
    expect(normaliseMonth("45870")).toBe("2025-08");
  });

  it("accepts Mon-YY and Mon YYYY spellings", () => {
    expect(normaliseMonth("Jul-26")).toBe("2026-07");
    expect(normaliseMonth("July 2026")).toBe("2026-07");
  });

  it("returns null rather than guessing on unusable input", () => {
    expect(normaliseMonth("")).toBeNull();
    expect(normaliseMonth(null)).toBeNull();
    expect(normaliseMonth("last month")).toBeNull();
    expect(normaliseMonth("2026-13")).toBeNull();
    expect(normaliseMonth(45)).toBeNull(); // implausible as a date
  });
});

describe("normalisePercent", () => {
  it("reads percent-formatted strings as points", () => {
    expect(normalisePercent("1.41%").value).toBeCloseTo(1.41, 10);
    expect(normalisePercent("-2.5%").value).toBeCloseTo(-2.5, 10);
  });

  it("reads fractions as points", () => {
    expect(normalisePercent(0.0141).value).toBeCloseTo(1.41, 10);
    expect(normalisePercent("0.0141").value).toBeCloseTo(1.41, 10);
  });

  it("leaves values already in points alone", () => {
    expect(normalisePercent(1.41).value).toBeCloseTo(1.41, 10);
    expect(normalisePercent(15.81).value).toBeCloseTo(15.81, 10);
  });

  it("handles negatives, so a losing month is not read as a gain", () => {
    expect(normalisePercent(-0.0141).value).toBeCloseTo(-1.41, 10);
    expect(normalisePercent(-3.2).value).toBeCloseTo(-3.2, 10);
  });

  it("flags the ambiguous 0.02-1 band instead of guessing silently", () => {
    const r = normalisePercent(0.5);
    expect(r.ambiguous).toBe(true);
    // Still produces a value: the run warns, it does not drop the row.
    expect(r.value).toBeCloseTo(50, 10);
  });

  it("does not flag values in the bands the real data occupies", () => {
    expect(normalisePercent(0.017).ambiguous).toBe(false);
    expect(normalisePercent(1.7).ambiguous).toBe(false);
  });

  it("returns null for blanks", () => {
    expect(normalisePercent("").value).toBeNull();
    expect(normalisePercent(null).value).toBeNull();
  });
});

describe("parseColor", () => {
  it("strips the backslash escaping the Sheet adds", () => {
    expect(parseColor("\\#1A2B5C")).toBe("#1A2B5C");
  });

  it("accepts a plain hex, with or without the hash", () => {
    expect(parseColor("#70AD47")).toBe("#70AD47");
    expect(parseColor("70AD47")).toBe("#70AD47");
  });

  it("expands 3-digit shorthand", () => {
    expect(parseColor("#abc")).toBe("#AABBCC");
  });

  it("returns null for unreadable values so the caller can fall back", () => {
    expect(parseColor("")).toBeNull();
    expect(parseColor("blue")).toBeNull();
    expect(parseColor("#12345")).toBeNull();
  });
});

describe("status and access flags", () => {
  it("treats only an explicit Active as active", () => {
    expect(isActiveStatus("Active")).toBe(true);
    expect(isActiveStatus(" active ")).toBe(true);
    expect(isActiveStatus("Inactive")).toBe(false);
    // Blank must never mean active: it would expose an unprovisioned client.
    expect(isActiveStatus("")).toBe(false);
    expect(isActiveStatus(null)).toBe(false);
  });

  it("treats only an explicit Yes as portal access", () => {
    expect(isYes("Yes")).toBe(true);
    expect(isYes("y")).toBe(true);
    expect(isYes("No")).toBe(false);
    expect(isYes("")).toBe(false);
  });
});

describe("normaliseEmail", () => {
  it("lowercases and trims, so a stray capital cannot orphan a client", () => {
    expect(normaliseEmail("  Ravi.Kumar@Example.COM ")).toBe("ravi.kumar@example.com");
  });
});

describe("parseTimestamp", () => {
  it("reads ISO, DD/MM/YYYY and serials", () => {
    expect(parseTimestamp("2026-07-13T02:30:00.000Z")).toBe("2026-07-13T02:30:00.000Z");
    expect(parseTimestamp("13/07/2026")).toBe("2026-07-13T00:00:00.000Z");
    expect(parseTimestamp(45870)).toBe("2025-08-01T00:00:00.000Z");
  });

  it("returns null for blanks", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
  });
});

describe("isGroupingRow", () => {
  it("identifies the sub-category header rows the Sheet contains", () => {
    // These render as "0 / 0.0% / +0" data rows if they are not caught.
    expect(isGroupingRow(0, 0)).toBe(true);
    expect(isGroupingRow(null, null)).toBe(true);
  });

  it("never mistakes a real holding for a grouping row", () => {
    expect(isGroupingRow(50000, 44394)).toBe(false); // a loss is a real holding
    expect(isGroupingRow(0, 1000)).toBe(false);
  });
});

describe("formatMonthShort", () => {
  it("uses the report's three-letter spelling, not Intl's four-letter Sept", () => {
    expect(formatMonthShort("2025-09")).toBe("Sep-25");
    expect(formatMonthShort("2026-07")).toBe("Jul-26");
    expect(formatMonthShort("2025-08")).toBe("Aug-25");
  });

  it("returns the input unchanged when it is not a YYYY-MM key", () => {
    expect(formatMonthShort("")).toBe("");
    expect(formatMonthShort(null)).toBe("");
    expect(formatMonthShort("2026-13")).toBe("2026-13");
  });
});

describe("formatReportMonth", () => {
  it("spells out the report month heading", () => {
    expect(formatReportMonth("2026-07")).toBe("July 2026");
  });
  it("falls back to an em-free dash when there is no month", () => {
    expect(formatReportMonth(null)).toBe("—");
  });
});

describe("formatINR", () => {
  it("uses Indian grouping, not western", () => {
    expect(formatINR(10500000)).toBe("1,05,00,000");
    expect(formatINR(12472894)).toBe("1,24,72,894");
  });
  it("signs losses with a minus and gains with a plus when asked", () => {
    expect(formatINR(-5606, { signed: true })).toBe("-5,606");
    expect(formatINR(18500, { signed: true })).toBe("+18,500");
  });
  it("abbreviates in lakh and crore for chart axes", () => {
    expect(formatINR(5000000, { compact: true, symbol: true })).toBe("₹50L");
    expect(formatINR(12160000, { compact: true, symbol: true })).toBe("₹1.2Cr");
    expect(formatINR(-20000, { compact: true, symbol: true })).toBe("-₹20K");
  });
});

describe("formatPctSpaced", () => {
  it("matches the report's spacing and signs a loss", () => {
    expect(formatPctSpaced(15.81)).toBe("+ 15.81%");
    expect(formatPctSpaced(-4.12)).toBe("- 4.12%");
  });
});
