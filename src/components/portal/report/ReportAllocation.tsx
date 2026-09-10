import type { CategorySplit, Totals } from "@/lib/portfolio-data";
import { formatAmount, formatPct, formatSignedAmount } from "@/lib/format";
import {
  FIGURE,
  GAIN,
  GAIN_ON_INK,
  LOSS,
  LOSS_ON_INK,
} from "@/lib/portfolio-constants";
import { CategoryDot, SectionTitle, TableCard } from "./ReportPrimitives";

/**
 * "Allocation by Category": one row per category, with a bar showing how much
 * of today's portfolio it represents.
 *
 * Share is measured on CURRENT value, not invested. The question the row
 * answers is "how much of what I have now is in this", which is about the
 * portfolio as it stands rather than as it was bought.
 *
 * Categories arrive already ordered and coloured by the Categories tab, and
 * empty ones never reach here, so this renders exactly the categories the
 * client actually holds.
 */
export function ReportAllocation({
  splits,
  totals,
}: {
  splits: CategorySplit[];
  totals: Totals;
}) {
  if (splits.length === 0) return null;

  // Guard the divide rather than the display: a portfolio with no current
  // value would otherwise put NaN% in every row.
  const denominator = totals.current > 0 ? totals.current : 0;
  const shareOf = (v: number) => (denominator ? (v / denominator) * 100 : 0);

  // The widest bar is the largest category, not the full column. Scaling to the
  // biggest share is what makes the differences between categories legible;
  // scaled to 100% every bar would be a short stub.
  const maxShare = Math.max(...splits.map((s) => shareOf(s.current)), 0);

  return (
    <section>
      <SectionTitle>Allocation by Category</SectionTitle>

      <TableCard label="Allocation by category">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <caption className="sr-only">
            Each category&apos;s share of the portfolio, with the amount
            invested, its current value and the return.
          </caption>
          {/* Seven columns: the bar and the percentage beside it are separate
              cells sharing one "Share of Portfolio" heading, which is how the
              mockup sets them. */}
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
          </colgroup>

          <thead>
            <tr className="bg-navy-900">
              <Th className="pl-4">Category</Th>
              <Th>Share of Portfolio</Th>
              <Th align="right" />
              <Th align="right">Invested</Th>
              <Th align="right">Current</Th>
              <Th align="right">Return</Th>
              <Th align="right" className="pr-4">
                Ret %
              </Th>
            </tr>
          </thead>

          <tbody>
            {splits.map((s) => {
              const share = shareOf(s.current);
              const positive = s.gainLoss >= 0;
              const tone = positive ? GAIN : LOSS;

              return (
                <tr
                  key={s.category}
                  className="border-t border-navy-100 bg-white transition-colors duration-200 hover:bg-navy-50/60 motion-reduce:transition-none"
                >
                  <td className="py-3 pl-4 pr-3">
                    <span className="flex items-center gap-2">
                      <CategoryDot color={s.color} />
                      <span className="font-medium text-navy-900">
                        {s.category}
                      </span>
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    {/* aria-hidden: the figure is in the next cell, so
                        announcing the bar as well would say it twice. */}
                    <span
                      aria-hidden
                      className="block h-2 w-full max-w-[130px] overflow-hidden rounded-full bg-navy-100"
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{
                          backgroundColor: s.color,
                          // Never a zero-width sliver for a real holding: a
                          // category that exists should always show something.
                          width: `${maxShare > 0 ? Math.max(4, (share / maxShare) * 100) : 0}%`,
                        }}
                      />
                    </span>
                  </td>

                  <Td>{share.toFixed(1)}%</Td>
                  <Td>{formatAmount(s.invested)}</Td>
                  <Td>{formatAmount(s.current)}</Td>
                  <Td style={{ color: tone }}>
                    {formatSignedAmount(s.gainLoss)}
                  </Td>
                  <Td className="pr-4" style={{ color: tone }}>
                    {formatPct(s.returnPct, 1)}
                  </Td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-navy-900">
              <td className="py-3 pl-4 pr-3 font-semibold text-white">Total</td>
              <td />
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-white">
                100%
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-white">
                {formatAmount(totals.invested)}
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-white">
                {formatAmount(totals.current)}
              </td>
              <td
                className="py-3 px-3 text-right font-semibold tabular-nums"
                style={{ color: totals.gainLoss >= 0 ? GAIN_ON_INK : LOSS_ON_INK }}
              >
                {formatSignedAmount(totals.gainLoss)}
              </td>
              <td
                className="py-3 pl-3 pr-4 text-right font-semibold tabular-nums"
                style={{ color: totals.gainLoss >= 0 ? GAIN_ON_INK : LOSS_ON_INK }}
              >
                {formatPct(totals.returnPct, 1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </TableCard>
    </section>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-navy-300 ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`py-3 px-3 text-right tabular-nums ${className}`}
      style={{ color: FIGURE, ...style }}
    >
      {children}
    </td>
  );
}
