import type { Totals } from "@/lib/portfolio-data";
import {
  formatAmount,
  formatPctSpaced,
  formatSignedAmountSpaced,
} from "@/lib/format";
import { cn } from "@/lib/cn";

// The grey totals band from the report: four figures, small letterspaced grey
// captions above large values. Invested and current in report blue; the
// appreciation and the return in green or red by sign.
//
// Appreciation is the same fact as the return, in rupees rather than percent.
// A client reading "+ 2.74%" cannot tell whether that is a few thousand or a
// few lakh without doing the arithmetic, so the printed report states both and
// this band matches it.
//
// The report spells signed figures with a space after the sign ("+ 1,21,818",
// "+ 15.81%"), which is what the Spaced formatters produce. A negative
// portfolio reads "- 4.12%" in red: the sign comes from the value, never
// assumed positive.
export function ReportTotals({ totals }: { totals: Totals }) {
  // Driven by gainLoss, not returnPct. They agree in sign, but the appreciation
  // cell should follow the figure it is showing.
  const positive = totals.gainLoss >= 0;
  const signColour = positive ? "text-[#2E7D32]" : "text-[#C0392B]";

  const cells = [
    {
      label: "Total Invested (₹)",
      value: formatAmount(totals.invested),
      className: "text-[#2E75B6]",
    },
    {
      label: "Total Current Value (₹)",
      value: formatAmount(totals.current),
      className: "text-[#2E75B6]",
    },
    {
      label: "Total Appreciation (₹)",
      value: formatSignedAmountSpaced(totals.gainLoss),
      className: signColour,
    },
    {
      label: "Overall Return",
      value: formatPctSpaced(totals.returnPct),
      className: signColour,
    },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-white rounded-xl bg-[#F2F2F2] transition-colors dark:divide-white/5 dark:bg-white/[0.04] lg:grid-cols-4 lg:divide-y-0">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-center px-3 py-5 text-center sm:px-6"
        >
          {/* Fixed two-line height. "TOTAL INVESTED (₹)" fits on one line while
              "TOTAL CURRENT VALUE (₹)" wraps to two, so without this the values
              beneath them sat at different heights and the row looked crooked.
              Centring inside that height keeps a one-line label optically
              aligned with a two-line one. */}
          <p className="flex min-h-[2.6em] items-center justify-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-navy-500 dark:text-navy-400 sm:text-[11px]">
            {c.label}
          </p>
          <p
            className={cn(
              // Steps down on narrow screens: four figures in a 2x2 grid have
              // far less width each than three in a row did, and "45,71,597"
              // overflowed at the old size on a phone.
              "mt-1.5 text-lg font-bold tabular-nums sm:text-2xl lg:text-[26px]",
              c.className
            )}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
