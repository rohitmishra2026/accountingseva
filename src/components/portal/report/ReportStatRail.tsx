"use client";

import type { CategorySplit, Holding, Totals } from "@/lib/portfolio-data";
import { CountUp } from "@/components/CountUp";
import { formatINR, formatPct, formatReportMonth } from "@/lib/format";
import { GAIN_ON_INK, LOSS_ON_INK } from "@/lib/portfolio-constants";
import { Eyebrow } from "./ReportPrimitives";

/**
 * The dark rail that opens the report.
 *
 * Deliberately the same object as the homepage's "Our Impact" tile: navy-900,
 * rounded-3xl, a soft navy shadow, one blurred navy glow in the corner, and
 * figures ranged against a white/15 rule. A returning client should recognise
 * it. Where that tile counts filings, this one counts money.
 *
 * It replaces the old four-cell grey totals band, which gave four numbers equal
 * weight. Here the overall return is the headline, the three rupee figures
 * support it, and the portfolio's shape is a quiet footer.
 *
 * A loss reads in a light red rather than the mint. On this navy the ordinary
 * LOSS red is close to unreadable, so the rail has its own pair. The sign is
 * always taken from the value and never assumed positive.
 */
export function ReportStatRail({
  totals,
  splits,
  holdings,
  reportMonth,
}: {
  totals: Totals;
  splits: CategorySplit[];
  holdings: Holding[];
  reportMonth: string | null;
}) {
  // Driven by gainLoss, not returnPct. They agree in sign, but each figure
  // should follow the number it is actually showing.
  const positive = totals.gainLoss >= 0;
  const tone = positive ? GAIN_ON_INK : LOSS_ON_INK;

  const top = topPerformer(holdings);

  return (
    <div
      data-print="keep"
      className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/20"
    >
      {/* The same corner glow the homepage's impact tile carries. Purely
          atmospheric, and hidden from assistive tech. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-navy-500/20 blur-3xl"
      />

      <div className="relative">
        <Eyebrow tone="dark">Overall Return</Eyebrow>

        {/* Counts up from zero exactly as the homepage's impact figures do.
            A portfolio at a loss counts DOWN from zero to its negative, which
            falls out of the same interpolation and is the honest gesture:
            nothing, then the ground it lost. */}
        <p
          className="mt-3 text-4xl font-semibold leading-none tracking-tight tabular-nums sm:text-[2.75rem]"
          style={{ color: tone }}
        >
          <CountUp target={totals.returnPct} format={(v) => formatPct(v)} />
        </p>

        <p className="mt-2 text-xs text-navy-400">
          Financial performance to {formatReportMonth(reportMonth)}
        </p>

        <div className="mt-8 space-y-6">
          <Stat
            label="Total Invested"
            target={totals.invested}
            format={(v) => formatINR(v, { symbol: true })}
          />
          <Stat
            label="Total Current Value"
            target={totals.current}
            format={(v) => formatINR(v, { symbol: true })}
          />
          <Stat
            label="Total Appreciation"
            target={totals.gainLoss}
            format={(v) => formatINR(v, { symbol: true, signed: true })}
            color={tone}
          />
        </div>
      </div>

      {/* mt-10 is the floor; lg:mt-auto then pins the block to the foot of the
          rail so it lines up with the bottom of the charts beside it. Without
          the floor, a rail that is not being stretched (a phone) puts this hard
          up against the appreciation figure above it. */}
      <div className="relative mt-10 space-y-2.5 border-t border-white/10 pt-5 lg:mt-auto">
        <Meta label="Holdings" value={`${totals.count} instruments`} />
        <Meta label="Asset classes" value={String(splits.length)} />
        {top && (
          <Meta
            label="Top performer"
            value={
              <span className="inline-flex items-baseline gap-1.5">
                <span className="truncate" title={top.investmentName}>
                  {top.investmentName}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: top.returnPct >= 0 ? GAIN_ON_INK : LOSS_ON_INK }}
                >
                  {formatPct(top.returnPct, 1)}
                </span>
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}

// A white rule down the left edge, the counting figure, then its caption.
// The rule is the site's border-white/15, not a coloured accent: on the
// homepage tile it is what makes three stacked numbers read as a set.
//
// The colour sits on the wrapping <p> rather than on CountUp, so the tone can
// follow the sign without CountUp needing to know about styling.
function Stat({
  label,
  target,
  format,
  color,
}: {
  label: string;
  target: number;
  format: (value: number) => string;
  color?: string;
}) {
  return (
    <div className="border-l-2 border-white/15 pl-4">
      <p
        className="text-xl font-semibold tabular-nums leading-tight"
        style={color ? { color } : undefined}
      >
        <CountUp target={target} format={format} />
      </p>
      <p className="mt-1 text-xs text-navy-300">{label}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="flex-shrink-0 text-navy-400">{label}</span>
      <span className="min-w-0 truncate font-medium text-white">{value}</span>
    </div>
  );
}

/**
 * The holding with the highest percentage return.
 *
 * Percentage, not rupees: "top performer" is about how hard the money worked,
 * which is the question the rail's other lines do not already answer.
 *
 * Holdings with nothing invested are excluded. Their return is defined as 0 by
 * returnPct(), so including them would let a dormant zero-cost line outrank a
 * real one the moment every holding was at a loss.
 */
function topPerformer(holdings: Holding[]): {
  investmentName: string;
  returnPct: number;
} | null {
  let best: { investmentName: string; returnPct: number } | null = null;

  for (const h of holdings) {
    const invested = Number(h.investedAmount);
    if (!(invested > 0)) continue;

    const pct = ((Number(h.currentValue) - invested) / invested) * 100;
    if (!best || pct > best.returnPct) {
      best = { investmentName: h.investmentName, returnPct: pct };
    }
  }

  return best;
}
