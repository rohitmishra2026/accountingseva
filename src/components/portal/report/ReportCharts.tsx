"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategorySplit, MonthlyReturn } from "@/lib/portfolio-data";
import {
  formatCompactINR,
  formatMonthShort,
  formatPct,
  formatReportMonth,
  formatRupee,
  formatSignedAmount,
} from "@/lib/format";
import { signedScale } from "@/lib/chart-scale";
import {
  BRAND,
  CHART_GRID,
  HAIRLINE,
  MUTED,
  MUTED_ON_INK,
  PANEL,
  readableOn,
  SERIES_CURRENT,
  SERIES_INVESTED,
} from "@/lib/portfolio-constants";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { LegendItem, Panel, ScrollRegion } from "./ReportPrimitives";

const AXIS_TICK = { fontSize: 10, fill: MUTED } as const;
const GRID = CHART_GRID;

/** Month-on-month: the brand navy for actual, a pale navy for the benchmark. */
const ACTUAL_LINE = BRAND;
const EXPECTED_LINE = MUTED_ON_INK;

/**
 * Bars and lines grow in on mount: bars rise from the zero baseline, which is
 * the direction the quantity actually accumulates.
 *
 * An earlier version disabled this outright, on the grounds that a financial
 * report should not behave like a dashboard. The growth is deliberate now, and
 * it matches the count-up on the stat rail and the fade-ups on the marketing
 * site. It plays once on mount and then the chart is still.
 *
 * Recharts takes animation as a prop rather than from CSS, so
 * prefers-reduced-motion has to be passed in explicitly - the media query in
 * globals.css cannot reach it.
 */
const GROW_MS = 850;

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: `1px solid ${HAIRLINE}`,
  fontSize: 12,
} as const;

// ── Axis labels ───────────────────────────────────────────────────────────

/** Longest line we will draw before truncating. Sized against PX_PER_CATEGORY. */
const MAX_LABEL_CHARS = 18;

/**
 * Split a category name across at most two lines.
 *
 * The mockup sets x-axis labels horizontally on two lines instead of angling
 * them, which reads far better but only works if the name is broken sensibly.
 *
 * This is deliberately GENERIC. It breaks on whitespace and knows nothing about
 * any category name, because category names come from the Categories tab and
 * the code is not allowed to have opinions about them. A hardcoded abbreviation
 * table here would be the bug.
 *
 * The break point is the one that makes the two lines as even as possible, so
 * "Commodities (Held Physically)" splits after "Commodities" rather than
 * leaving one very long line beside a very short one.
 */
export function wrapLabel(value: string): string[] {
  const s = String(value ?? "").trim();
  if (!s) return [""];

  // A lone separator is glued to the word before it, so a name like
  // "DMAT Holdings / Shares" can break after the slash but never before it.
  // Left alone, "/" is its own word and the second line starts with it, which
  // reads as a typo.
  const words: string[] = [];
  for (const w of s.split(/\s+/)) {
    if (/^[/&|,-]+$/.test(w) && words.length > 0) words[words.length - 1] += ` ${w}`;
    else words.push(w);
  }
  if (words.length === 1) return [truncate(s)];

  let bestAt = 1;
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    // Longest line first, then the imbalance, so we never pick a split that
    // makes the widest line wider just to even things up.
    const score = Math.max(a, b) * 100 + Math.abs(a - b);
    if (score < bestScore) {
      bestScore = score;
      bestAt = i;
    }
  }

  return [
    truncate(words.slice(0, bestAt).join(" ")),
    truncate(words.slice(bestAt).join(" ")),
  ];
}

function truncate(s: string): string {
  return s.length > MAX_LABEL_CHARS
    ? `${s.slice(0, MAX_LABEL_CHARS - 1)}…`
    : s;
}

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
};

/** Two-line centred tick. Recharts has no multi-line tick of its own. */
function CategoryTick({ x = 0, y = 0, payload }: TickProps) {
  const lines = wrapLabel(String(payload?.value ?? ""));
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={12 + i * 11}
          textAnchor="middle"
          fontSize={10}
          fill={MUTED}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// ── Sizing ────────────────────────────────────────────────────────────────

/**
 * Horizontal room one category needs. Sized so a full MAX_LABEL_CHARS line at
 * 9px (about 84px) clears its neighbour rather than butting against it.
 */
const PX_PER_CATEGORY = 100;
/** Matches the YAxis width prop: fixed chrome that never scales down. */
const Y_AXIS_WIDTH = 40;

function categoryChartWidth(count: number): number {
  return Math.max(420, Y_AXIS_WIDTH + count * PX_PER_CATEGORY);
}

/**
 * Horizontally scrolling plot area.
 *
 * These charts render every tick (interval={0}) because a category silently
 * missing from its own chart is worse than one you have to scroll to. On a
 * phone that means the plot needs more width than the screen has, so the plot
 * gets the width it needs and the frame scrolls to reach it.
 *
 * Whether it actually scrolls depends on the PANEL's width, not the device:
 * "Return Contribution" sits in a third of the desktop grid and scrolls there
 * too, which is the cramped case this exists for.
 *
 * The negative margin lets the scroll area reach the panel's padding edge so
 * the first and last bars are not clipped behind it; overscroll-x-contain keeps
 * a sideways swipe from becoming a browser back-navigation.
 */
function Plot({
  label,
  height,
  minWidth,
  children,
}: {
  label: string;
  height: number;
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollRegion label={label} bleed className="mt-4">
      {/* role="img" with a name stops a screen reader walking hundreds of
          meaningless SVG path nodes. The figures themselves are not lost: every
          one of them is in the tables below, which is the accessible view of
          this data. */}
      <div style={{ height, minWidth }} role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ScrollRegion>
  );
}

// ── Chart A ───────────────────────────────────────────────────────────────
/**
 * Grouped bars, invested against current, one pair per category, in the
 * Categories tab's display order. Categories with no holdings never reach here,
 * so a mutual-funds-only client gets a correct one-bar chart rather than four
 * empty slots.
 */
export function InvestedVsCurrentChart({ splits }: { splits: CategorySplit[] }) {
  const animate = !usePrefersReducedMotion();
  const data = splits.map((s) => ({
    name: s.category,
    Invested: s.invested,
    Current: s.current,
  }));

  // Signed scale even here: invested and current are non-negative today, but
  // clamping at zero is the bug that hid losses in Chart B and there is no
  // reason to repeat it.
  const scale = signedScale(data.flatMap((d) => [d.Invested, d.Current]));

  return (
    <Panel
      title="Invested vs Current Value"
      aside={
        <span className="flex items-center gap-3">
          <LegendItem color={SERIES_INVESTED} label="Invested" />
          <LegendItem color={SERIES_CURRENT} label="Current" />
        </span>
      }
    >
      <Plot
        label="Invested versus current value, by category"
        height={230}
        minWidth={categoryChartWidth(data.length)}
      >
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 26 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={false}
            height={32}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactINR}
            width={Y_AXIS_WIDTH}
            ticks={scale.ticks}
            domain={scale.domain}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,39,72,0.06)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => formatRupee(v)}
          />
          <Bar
            dataKey="Invested"
            fill={SERIES_INVESTED}
            maxBarSize={16}
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate}
            animationDuration={GROW_MS}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="Current"
            fill={SERIES_CURRENT}
            maxBarSize={16}
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate}
            animationDuration={GROW_MS}
            animationEasing="ease-out"
            // Follows the invested bar in, so each pair reads left to right.
            animationBegin={120}
          />
        </BarChart>
      </Plot>
    </Panel>
  );
}

// ── Chart B ───────────────────────────────────────────────────────────────

// Recharts types a LabelList content's geometry as string | number, so these
// are coerced with Number() at the point of use rather than assumed numeric.
type BarLabelProps = {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  value?: string | number;
  index?: number;
};

/**
 * Rupees of return per category, each bar in that category's own colour, with
 * the figure printed above it.
 *
 * The domain is SIGNED. An earlier version used domain={[0, max]}, which meant
 * a category at a loss simply did not appear: the bar had nowhere to go. A zero
 * reference line makes the baseline explicit so a negative bar reads as
 * crossing it rather than as missing data.
 */
export function ReturnContributionChart({ splits }: { splits: CategorySplit[] }) {
  const animate = !usePrefersReducedMotion();
  const data = splits.map((s) => ({
    name: s.category,
    value: s.gainLoss,
    color: s.color,
  }));

  const scale = signedScale(data.map((d) => d.value));

  // A losing category's bar hangs BELOW the zero line, so its label has to go
  // below the bar too. Printed above, it would sit inside the bar it describes.
  const ValueLabel = ({ x, y, width, height, value, index }: BarLabelProps) => {
    const v = Number(value ?? 0);
    const cx = Number(x ?? 0) + Number(width ?? 0) / 2;
    const top = Number(y ?? 0);
    const cy = v >= 0 ? top - 6 : top + Number(height ?? 0) + 12;

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        // The bar keeps the client's exact category colour; the label on top
        // of it is text, so it is darkened until it is readable on the panel.
        fill={readableOn(data[index ?? 0]?.color ?? MUTED, PANEL)}
      >
        {formatSignedAmount(v)}
      </text>
    );
  };

  return (
    <Panel
      title="Return Contribution"
      aside={
        <span className="whitespace-nowrap text-[10px] text-slate-500">
          ₹ gained per category
        </span>
      }
    >
      <Plot
        label="Return contributed by each category, in rupees"
        height={230}
        minWidth={categoryChartWidth(data.length)}
      >
        <BarChart data={data} margin={{ top: 18, right: 4, left: 0, bottom: 26 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={false}
            height={32}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactINR}
            width={Y_AXIS_WIDTH}
            ticks={scale.ticks}
            domain={scale.domain}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,39,72,0.06)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => formatRupee(v)}
          />
          <ReferenceLine y={0} stroke={HAIRLINE} />
          <Bar
            dataKey="value"
            maxBarSize={26}
            name="Return"
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate}
            animationDuration={GROW_MS}
            animationEasing="ease-out"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList dataKey="value" content={ValueLabel} />
          </Bar>
        </BarChart>
      </Plot>
    </Panel>
  );
}

// ── Chart C ───────────────────────────────────────────────────────────────

/** Room one month needs on the axis for a "Aug-25" tick at 9px. */
const PX_PER_MONTH = 62;

/**
 * Actual against expected month-on-month growth: solid blue for what happened,
 * grey dashed for what was projected, x-axis in Mon-YY.
 *
 * Returns null on an empty series, which is the correct behaviour for a client
 * with no Monthly Returns rows. The domain is signed so a negative month is
 * visible instead of clipped off the bottom.
 */
export function MonthlyGrowthChart({ monthly }: { monthly: MonthlyReturn[] }) {
  // Called before the early return: a hook may not sit behind a condition.
  const animate = !usePrefersReducedMotion();

  if (monthly.length === 0) return null;

  const data = monthly.map((m) => ({
    month: formatMonthShort(m.month),
    "Actual MoM Return": m.actualPct,
    "Expected MoM Return": m.expectedPct,
  }));

  const scale = signedScale(
    data.flatMap((d) => [d["Actual MoM Return"], d["Expected MoM Return"]])
  );

  const from = formatReportMonth(monthly[0]?.month ?? null);
  const to = formatReportMonth(monthly[monthly.length - 1]?.month ?? null);

  return (
    <Panel
      title="Month-on-Month Growth Returns (%)"
      aside={
        <span className="flex items-center gap-3">
          <LegendItem color={ACTUAL_LINE} label="Actual" shape="line" />
          <LegendItem color={EXPECTED_LINE} label="Expected" shape="dashed" />
        </span>
      }
      footnote={`Actual monthly returns versus the expected benchmark, ${from} to ${to}.`}
    >
      {/* A tick per month, every one rendered. Twelve of them need about 780px,
          so on a phone this scrolls rather than smearing the labels together. */}
      <Plot
        label="Month-on-month growth returns, actual against expected"
        height={230}
        minWidth={Math.max(420, Y_AXIS_WIDTH + data.length * PX_PER_MONTH)}
      >
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="month"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={0}
            minTickGap={0}
            height={22}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            width={Y_AXIS_WIDTH}
            ticks={scale.ticks}
            domain={scale.domain}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => formatPct(v)}
          />
          <ReferenceLine y={0} stroke={HAIRLINE} />
          <Line
            type="monotone"
            dataKey="Actual MoM Return"
            stroke={ACTUAL_LINE}
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={GROW_MS}
            animationEasing="ease-out"
            dot={{ r: 3, fill: "#FFFFFF", stroke: ACTUAL_LINE, strokeWidth: 1.5 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Expected MoM Return"
            stroke={EXPECTED_LINE}
            strokeWidth={1.5}
            isAnimationActive={animate}
            animationDuration={GROW_MS}
            animationEasing="ease-out"
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </Plot>
    </Panel>
  );
}
