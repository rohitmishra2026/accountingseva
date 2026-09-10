import type { CategoryGroup, Totals } from "@/lib/portfolio-data";
import { formatAmount, formatPct, formatSignedAmount } from "@/lib/format";
import { FIGURE, GAIN, LOSS, readableOn } from "@/lib/portfolio-constants";
import { CategoryDot, SectionTitle, TableCard } from "./ReportPrimitives";
import { cn } from "@/lib/cn";

// "Detailed Holdings".
//
// Structure, matching the design:
//   category header row (tinted band, coloured dot, bold name)
//     -> optional sub-category grouping header (indented caps, no figures)
//        -> the holdings themselves
//
// Deliberately NOT here:
//   - subtotal rows: the design has none
//   - the empty ruled filler rows: those are fixed-height spreadsheet padding
//   - sub-categories as data rows: they are headers, and the zero-amount
//     grouping rows that cause that are dropped at ingestion
//
// The CATEGORY column is gone. It repeated, on every single row, the value of
// the group header directly above it, and the redesign has no room to spend on
// a column that says the same word forty times. Nothing is lost: the grouping
// still states the category, and sub-categories still state themselves.
//
// Colours come from the Categories tab via each group's own `color`. Nothing in
// this file knows a category name.
export function ReportHoldings({
  groups,
  totals,
}: {
  groups: CategoryGroup[];
  totals: Totals;
}) {
  if (groups.length === 0) return null;

  return (
    <section>
      <SectionTitle>Detailed Holdings</SectionTitle>

      <TableCard label="Detailed holdings">
        {/*
          table-fixed with explicit widths is what makes long names wrap. Left
          to itself the table sizes to content and the name column squeezes the
          numbers, which is how "ICICI Pru Balanced Advantag" happened.
        */}
        <table className="w-full min-w-[720px] table-fixed border-collapse text-[13px]">
          <caption className="sr-only">
            Every holding, grouped by category and sub-category, with its
            allocation, cost, current value and return.
          </caption>
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[10%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
          </colgroup>

          <thead>
            <tr className="bg-navy-900">
              <Th className="pl-4">Investment Name</Th>
              <Th align="right">Alloc %</Th>
              <Th align="right">Invested (₹)</Th>
              <Th align="right">Current (₹)</Th>
              <Th align="right">Return (₹)</Th>
              <Th align="right" className="pr-4">
                Ret %
              </Th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => (
              <CategorySection key={group.category} group={group} />
            ))}
          </tbody>
        </table>
      </TableCard>

      {totals.count === 0 && (
        <p className="mt-3 text-[13px] text-navy-500">
          No holdings for this report month.
        </p>
      )}
    </section>
  );
}

function CategorySection({ group }: { group: CategoryGroup }) {
  // The sub-category caption is the category's own colour, darkened only as far
  // as it needs to be to stay legible on white. Derived rather than looked up,
  // because the colour arrives from the Sheet and can be any value at all -
  // including a pale yellow that would otherwise vanish.
  const accent = readableOn(group.color, "#FFFFFF");

  return (
    <>
      <tr className="bg-navy-100/70">
        <th scope="colgroup" colSpan={6} className="py-2.5 pl-4 pr-3 text-left">
          <span className="flex items-center gap-2">
            <CategoryDot color={group.color} />
            <span className="font-semibold text-navy-900">{group.category}</span>
          </span>
        </th>
      </tr>

      {group.subGroups.map((sub) => (
        <SubSection
          key={sub.subCategory ?? "__none__"}
          subCategory={sub.subCategory}
          rows={sub.rows}
          accent={accent}
        />
      ))}
    </>
  );
}

function SubSection({
  subCategory,
  rows,
  accent,
}: {
  subCategory: string | null;
  rows: CategoryGroup["subGroups"][number]["rows"];
  accent: string;
}) {
  return (
    <>
      {/*
        A sub-category is a GROUPING HEADER: a label spanning the full width,
        with no figures. It is never a data row. Previously these leaked through
        from the Sheet as rows reading "0 / 0.0% / +0".
      */}
      {subCategory && (
        <tr className="bg-white">
          <th scope="colgroup" colSpan={6} className="pb-1 pl-8 pr-3 pt-4 text-left">
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: accent }}
            >
              {subCategory}
            </span>
          </th>
        </tr>
      )}

      {rows.map((r) => {
        // >= 0 counts as positive so a flat holding reads as +0 rather than -0.
        const positive = r.gainLoss >= 0;
        const tone = positive ? GAIN : LOSS;

        return (
          <tr
            key={r.id}
            className="border-t border-navy-100 bg-white align-top transition-colors duration-200 hover:bg-navy-50/60 motion-reduce:transition-none"
          >
            {/*
              break-words + whitespace-normal is the actual truncation fix. The
              longest real name is
              "108 / Kotak Large & Midcap Fund - Growth (Regular Plan)
               (Erstwhile Kotak Equity Opportunities)"
              and it must wrap onto as many lines as it needs.
            */}
            <td
              className={cn(
                "whitespace-normal break-words py-2.5 pr-3 text-navy-900",
                subCategory ? "pl-8" : "pl-4"
              )}
            >
              {r.investmentName}
            </td>
            <Td>{r.allocPct.toFixed(1)}%</Td>
            <Td>{formatAmount(r.investedAmount)}</Td>
            <Td>{formatAmount(r.currentValue)}</Td>
            <Td style={{ color: tone }}>{formatSignedAmount(r.gainLoss)}</Td>
            <Td className="pr-4" style={{ color: tone }}>
              {formatPct(r.returnPct, 1)}
            </Td>
          </tr>
        );
      })}
    </>
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
      className={`py-2.5 px-3 text-right tabular-nums ${className}`}
      style={{ color: FIGURE, ...style }}
    >
      {children}
    </td>
  );
}
