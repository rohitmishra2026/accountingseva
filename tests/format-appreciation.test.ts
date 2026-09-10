import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatPctSpaced,
  formatSignedAmount,
  formatSignedAmountSpaced,
} from "@/lib/format";

// The totals band shows appreciation in rupees beside the return in percent.
// They have to read as a pair, and the rupee figure has to agree with the same
// number rendered elsewhere in the report, so the sign and the rounding are
// what matter here.

describe("formatSignedAmountSpaced", () => {
  it("matches the printed report's spelling", () => {
    // From the reference statement: TOTAL APPRECIATION (₹)  + 1,21,818
    expect(formatSignedAmountSpaced(121818)).toBe("+ 1,21,818");
  });

  it("groups in the Indian system, not thousands", () => {
    expect(formatSignedAmountSpaced(4449779)).toBe("+ 44,49,779");
    expect(formatSignedAmountSpaced(10500000)).toBe("+ 1,05,00,000");
  });

  it("shows a loss with a minus, never as a gain", () => {
    expect(formatSignedAmountSpaced(-7864)).toBe("- 7,864");
    expect(formatSignedAmountSpaced(-121818)).toBe("- 1,21,818");
  });

  it("takes a plus at zero, so the row stays aligned", () => {
    // Same convention as formatPctSpaced, which the neighbouring cell uses.
    expect(formatSignedAmountSpaced(0)).toBe("+ 0");
    expect(formatPctSpaced(0)).toBe("+ 0.00%");
  });

  it("rounds the magnitude, so a loss on a half does not drift", () => {
    // The PDF once printed -5,606 where the screen printed -5,607, because one
    // rounded the signed value and the other the magnitude. Both round the
    // magnitude now.
    expect(formatSignedAmountSpaced(-5606.5)).toBe("- 5,607");
    expect(formatSignedAmountSpaced(5606.5)).toBe("+ 5,607");
  });

  it("agrees with formatSignedAmount apart from the space", () => {
    for (const v of [0, 1, -1, 999, -999, 121818, -121818, 4449779, 0.5, -0.5]) {
      const spaced = formatSignedAmountSpaced(v);
      const tight = formatSignedAmount(v);
      // formatSignedAmount omits the + at zero; the spaced form keeps it.
      const normalised = v === 0 ? `+ ${tight}` : spaced.replace(" ", "");
      expect(v === 0 ? spaced : normalised).toBe(v === 0 ? "+ 0" : tight);
    }
  });

  it("never prints NaN or Infinity into a client's statement", () => {
    expect(formatSignedAmountSpaced(Number.NaN)).toBe("+ 0");
    expect(formatSignedAmountSpaced(Number.POSITIVE_INFINITY)).toBe("+ 0");
    expect(formatSignedAmountSpaced(Number.NEGATIVE_INFINITY)).toBe("+ 0");
  });

  it("shows the same magnitude as the plain amount formatter", () => {
    // Appreciation appears in the band and the same gain appears per holding.
    // A client comparing them must not see two different numbers.
    expect(formatSignedAmountSpaced(121818).endsWith(formatAmount(121818))).toBe(true);
    expect(formatSignedAmountSpaced(-7864).endsWith(formatAmount(7864))).toBe(true);
  });
});
