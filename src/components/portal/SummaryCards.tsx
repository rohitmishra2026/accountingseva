import { formatINR, formatPct } from "@/lib/format";
import type { LegacyTotals as Totals } from "@/lib/portfolio-legacy-types";
import { cn } from "@/lib/cn";

export function SummaryCards({ totals }: { totals: Totals }) {
  const positive = totals.gainLoss >= 0;

  const cards = [
    { label: "Total Invested", value: formatINR(totals.invested), tone: "neutral" as const },
    { label: "Current Value", value: formatINR(totals.current), tone: "neutral" as const },
    {
      label: "Absolute Gain / Loss",
      value: formatINR(totals.gainLoss),
      tone: positive ? ("up" as const) : ("down" as const),
    },
    {
      label: "Overall Return",
      value: formatPct(totals.returnPct),
      tone: positive ? ("up" as const) : ("down" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-navy-100 bg-white p-5"
        >
          <p className="text-sm text-navy-500">{c.label}</p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tabular-nums",
              c.tone === "neutral" && "text-navy-900",
              c.tone === "up" && "text-emerald-600",
              c.tone === "down" && "text-red-600"
            )}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
