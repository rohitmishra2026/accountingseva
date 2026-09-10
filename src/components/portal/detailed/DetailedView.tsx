"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import type {
  Holding,
  MonthlyReturn,
  Totals,
  CategorySplit,
} from "@/lib/portfolio-data";
import {
  analyseMonthly,
  buildAttribution,
  type CategoryAttribution,
  type HoldingAttribution,
} from "@/lib/portfolio-attribution";
import {
  formatAmount,
  formatCompactRupee,
  formatINR,
  formatSignedAmount,
} from "@/lib/format";
import {
  GAIN,
  HAIRLINE,
  LOSS,
  SERIES_CURRENT,
  SERIES_INVESTED,
} from "@/lib/portfolio-constants";
import {
  MetricTile,
  NotAvailable,
  PanelCard,
  ScrollableChart,
  SectionHeader,
} from "./DetailedShared";
import { ValueChart } from "./ValueChart";
import { cn } from "@/lib/cn";

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  fontSize: 12,
} as const;

// Axis styling that follows the theme: `currentColor` plus a Tailwind class
// means one definition works in both light and dark mode.
const axisTick = { fontSize: 11, fill: "currentColor" } as const;
const AXIS_CLASS = "text-navy-500";
const GRID_CLASS = "text-navy-100";

// Contribution is expressed as a plain percentage of the portfolio's return,
// not in percentage points, so a client reads it without a glossary.
function formatContribution(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function DetailedView({
  holdings,
  totals,
  splits,
  monthly,
}: {
  holdings: Holding[];
  totals: Totals;
  splits: CategorySplit[];
  monthly: MonthlyReturn[];
}) {
  const attribution = useMemo(
    () => buildAttribution(holdings, totals, splits),
    [holdings, totals, splits]
  );
  const months = useMemo(() => analyseMonthly(monthly), [monthly]);

  if (!attribution.usable) {
    return (
      <PanelCard>
        <NotAvailable message="Detailed analysis needs a recorded invested amount. Please contact us so we can update your records." />
      </PanelCard>
    );
  }

  const { holdings: rows, categories, grossGain, grossLoss, concentration } =
    attribution;
  const positive = totals.gainLoss >= 0;
  const inProfit = rows.filter((r) => r.gainLoss > 0).length;
  const topContributor = [...rows].sort((a, b) => b.contributionPp - a.contributionPp)[0];
  const bestPerformer = [...rows].sort((a, b) => b.returnPct - a.returnPct)[0];
  const weakest = [...rows].sort((a, b) => a.returnPct - b.returnPct)[0];

  return (
    <div className="space-y-4">
      {/* Headline metrics */}
      <PanelCard>
        <SectionHeader
          heading="Portfolio at a glance"
          purpose="The headline numbers, each with what it actually means."
          basis={`${totals.count} holdings`}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile
            label="Current Value"
            value={formatINR(totals.current)}
            // "Grown from" was asserted unconditionally, so a portfolio at a
            // loss read "Current Value 4,44,394 / Grown from 5,00,000 invested."
            // The figures were right but the sentence claimed growth where there
            // was none. The neighbouring tiles already switch on `positive`.
            meaning={`${positive ? "Grown" : "Down"} from ${formatINR(totals.invested)} invested.`}
          />
          <MetricTile
            label="Total Gain"
            value={formatSignedAmount(totals.gainLoss)}
            tone={positive ? "up" : "down"}
            meaning={`Gains of ${formatAmount(grossGain)} against losses of ${formatAmount(grossLoss)}.`}
          />
          <MetricTile
            label="Overall Return"
            value={`${positive ? "+" : ""}${totals.returnPct.toFixed(2)}%`}
            tone={positive ? "up" : "down"}
            meaning="Return on the money you invested."
          />
          <MetricTile
            label="Biggest Driver"
            value={topContributor ? topContributor.name : "—"}
            meaning={
              topContributor
                ? `Added ${formatContribution(topContributor.contributionPp)} to your total return.`
                : undefined
            }
          />
          <MetricTile
            label="Best Performer"
            value={bestPerformer ? `${bestPerformer.returnPct.toFixed(1)}%` : "—"}
            tone={bestPerformer && bestPerformer.returnPct >= 0 ? "up" : "down"}
            meaning={bestPerformer?.name}
          />
          <MetricTile
            label="Weakest Performer"
            value={weakest ? `${weakest.returnPct.toFixed(1)}%` : "—"}
            tone={weakest && weakest.returnPct >= 0 ? "up" : "down"}
            meaning={weakest?.name}
          />
          <MetricTile
            label="Largest Holding"
            value={concentration ? `${concentration.largestWeightPct.toFixed(1)}%` : "—"}
            meaning={concentration ? `${concentration.largestName} is your biggest position.` : undefined}
          />
          <MetricTile
            label="Positions in Profit"
            value={`${inProfit} of ${rows.length}`}
            tone={inProfit * 2 >= rows.length ? "up" : "neutral"}
            meaning="Holdings currently worth more than you paid for them."
          />
        </div>
      </PanelCard>

      {/* Value over time */}
      {months && (
        <PanelCard>
          <SectionHeader
            heading="Portfolio value over time"
            purpose="How your portfolio has grown. Pick a range or drag to zoom."
          />
          <ValueChart monthly={monthly} totals={totals} />
        </PanelCard>
      )}

      {/* Build up from invested to current */}
      <PanelCard>
        <SectionHeader
          heading="From invested to today"
          purpose="Your invested amount, then what each category added on top of it."
        />
        <BuildUpChart totals={totals} categories={categories} />
      </PanelCard>

      {/* Category contribution */}
      <PanelCard>
        <SectionHeader
          heading="What each category contributed"
          purpose={`Share of your money multiplied by its return. These add up to your total return of ${formatContribution(totals.returnPct)}.`}
        />
        <CategoryContribution categories={categories} totalReturnPct={totals.returnPct} />
      </PanelCard>

      {/* Winners and losers */}
      <PanelCard>
        <SectionHeader
          heading={positive ? "Which holdings carried the portfolio" : "Where the losses came from"}
          purpose="Every holding ranked by the rupees it gained or lost."
        />
        <WinnersLosers rows={rows} />
      </PanelCard>

      {/* Full table */}
      <PanelCard>
        <SectionHeader
          heading="Every holding, in full"
          purpose="The complete book. Sort any column."
        />
        <AttributionTable rows={rows} totals={totals} />
      </PanelCard>
    </div>
  );
}

// ── Build up: every bar grounded at zero, rising left to right ────────────
function BuildUpChart({
  totals,
  categories,
}: {
  totals: Totals;
  categories: CategoryAttribution[];
}) {
  let running = totals.invested;
  const data = [
    {
      label: "Invested",
      value: totals.invested,
      added: 0,
      color: SERIES_INVESTED,
    },
    ...categories.map((c) => {
      running += c.gainLoss;
      return {
        label: c.label,
        value: running,
        added: c.gainLoss,
        color: c.color,
      };
    }),
    {
      label: "Current",
      value: running,
      added: 0,
      color: SERIES_CURRENT,
    },
  ];

  return (
    <ScrollableChart
      label="From invested to today, built up by category"
      count={data.length}
      height={360}
      pxPerBar={72}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, left: 8, bottom: 28 }}>
          <CartesianGrid stroke="currentColor" className={GRID_CLASS} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...axisTick, fontSize: 10 }}
            className={AXIS_CLASS}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={54}
          />
          <YAxis
            tick={axisTick}
            className={AXIS_CLASS}
            tickLine={false}
            axisLine={false}
            width={62}
            tickFormatter={formatCompactRupee}
          />
          <Tooltip
            cursor={{ fill: "rgba(46,117,182,0.06)" }}
            contentStyle={TOOLTIP_STYLE}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs shadow-lg shadow-navy-900/10">
                  <p className="font-semibold text-navy-900">{label}</p>
                  <p className="mt-1 tabular-nums text-navy-700">
                    Running total {formatINR(p.value)}
                  </p>
                  {p.added !== 0 && (
                    // Colour by sign. This was hardcoded to the profit green, so
                    // a category at a loss read "Added -5,606" in the same green
                    // used for every gain in the app. Matches the holdings table
                    // below, which already switches on r.gainLoss >= 0.
                    <p
                      className={cn(
                        "tabular-nums",
                        p.added >= 0 ? "text-[#26804B]" : "text-[#BF4643]"
                      )}
                    >
                      Added {formatSignedAmount(p.added)}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine
            y={totals.invested}
            stroke={HAIRLINE}
            strokeDasharray="5 4"
          />
          <Bar dataKey="value" maxBarSize={62} radius={[4, 4, 0, 0]} animationDuration={800}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ScrollableChart>
  );
}

// ── Category contribution: vertical bars + decomposition table ────────────
function CategoryContribution({
  categories,
  totalReturnPct,
}: {
  categories: CategoryAttribution[];
  totalReturnPct: number;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* min-w-0 is load-bearing. A grid item defaults to min-width:auto, so it
          refuses to shrink below its content: the chart's minimum width pushed
          the track wider than the panel and the WHOLE panel scrolled sideways,
          dragging the heading and the table's first column out of view. With
          min-w-0 the item can shrink and the chart scrolls inside itself, which
          is the point. The other two charts sit directly in the panel rather
          than in a grid, which is why only this one broke. */}
      <div className="min-w-0 lg:col-span-3">
        <ScrollableChart
          label="What each category contributed to the return"
          count={categories.length}
          height={320}
          pxPerBar={78}
        >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} margin={{ top: 12, right: 12, left: 8, bottom: 28 }}>
            <CartesianGrid stroke="currentColor" className={GRID_CLASS} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ ...axisTick, fontSize: 10 }}
              className={AXIS_CLASS}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={54}
            />
            <YAxis
              tick={axisTick}
              className={AXIS_CLASS}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: "rgba(46,117,182,0.06)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatContribution(v), "Adds to return"]}
            />
            <ReferenceLine y={0} stroke={HAIRLINE} />
            <Bar
              dataKey="contributionPp"
              maxBarSize={54}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              name="Adds to return"
            >
              {categories.map((c) => (
                <Cell key={c.key} fill={c.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </ScrollableChart>
      </div>

      {/* Same reason as above: the table has its own min-width, so without
          min-w-0 this grid item would widen the track instead of scrolling. */}
      <div className="min-w-0 overflow-x-auto lg:col-span-2">
        <table className="w-full min-w-[300px] text-xs">
          <thead>
            <tr className="border-b border-navy-200 text-navy-500">
              <th className="py-1.5 text-left font-medium">Category</th>
              <th className="py-1.5 text-right font-medium">Your money</th>
              <th className="py-1.5 text-right font-medium">Return</th>
              <th className="py-1.5 text-right font-medium">Adds to return</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.key} className="border-b border-navy-50">
                <td className="py-1.5 text-navy-800">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </td>
                <td className="py-1.5 text-right tabular-nums text-navy-700">
                  {c.weightInvestedPct.toFixed(1)}%
                </td>
                <td
                  className={cn(
                    "py-1.5 text-right tabular-nums",
                    c.returnPct >= 0 ? "text-[#26804B]" : "text-[#BF4643]"
                  )}
                >
                  {c.returnPct >= 0 ? "+" : ""}
                  {c.returnPct.toFixed(2)}%
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-navy-900">
                  {formatContribution(c.contributionPp)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-navy-700 font-semibold text-navy-900">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">100.0%</td>
              <td className="py-2 text-right" />
              <td className="py-2 text-right tabular-nums">
                {formatContribution(totalReturnPct)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Winners and losers, vertical ─────────────────────────────────────────
function WinnersLosers({ rows }: { rows: HoldingAttribution[] }) {
  const data = [...rows].sort(
    (a, b) => b.gainLoss - a.gainLoss || a.name.localeCompare(b.name)
  );

  // Every holding gets its own bar, and a client can hold twenty of them with
  // names like "Physical Gold (24K bars/coins)". Squeezed into a phone width
  // the labels collapsed into an unreadable fan.
  //
  // So the chart is given the width it actually needs - a fixed slice per
  // holding - and the container scrolls sideways. On a wide screen the min
  // width is under the available space and nothing scrolls, so the desktop
  // view is unchanged. On a phone you swipe, and every label is legible.
  return (
    <ScrollableChart
      label="Every holding ranked by the rupees it gained or lost"
      count={data.length}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 78 }}>
            <CartesianGrid stroke="currentColor" className={GRID_CLASS} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ ...axisTick, fontSize: 10 }}
              className={AXIS_CLASS}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-42}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={axisTick}
              className={AXIS_CLASS}
              tickLine={false}
              axisLine={false}
              width={62}
              tickFormatter={formatCompactRupee}
            />
            <Tooltip
              cursor={{ fill: "rgba(46,117,182,0.06)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatINR(v), "Gain"]}
            />
            <ReferenceLine y={0} stroke={HAIRLINE} />
            <Bar dataKey="gainLoss" maxBarSize={40} radius={[4, 4, 0, 0]} animationDuration={800}>
              {data.map((d) => (
                <Cell key={d.id} fill={d.gainLoss >= 0 ? GAIN : LOSS} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
    </ScrollableChart>
  );
}

// ── Full table ───────────────────────────────────────────────────────────
type SortKey =
  | "name"
  | "invested"
  | "current"
  | "gainLoss"
  | "returnPct"
  | "weightCurrentPct"
  | "contributionPp";

function AttributionTable({
  rows,
  totals,
}: {
  rows: HoldingAttribution[];
  totals: Totals;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("contributionPp");
  const [asc, setAsc] = useState(false);
  const showGainShare = totals.gainLoss > 0;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string" || typeof bv === "string"
          ? String(av).localeCompare(String(bv))
          : Number(av) - Number(bv);
      return (asc ? cmp : -cmp) || a.name.localeCompare(b.name);
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.contributionPp)), 0.0001);

  const columns: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "Instrument", align: "left" },
    { key: "invested", label: "Invested", align: "right" },
    { key: "current", label: "Current", align: "right" },
    { key: "gainLoss", label: "Gain / Loss", align: "right" },
    { key: "returnPct", label: "Return", align: "right" },
    { key: "weightCurrentPct", label: "Weight", align: "right" },
    { key: "contributionPp", label: "Adds to return", align: "right" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="border-b border-navy-200 text-navy-500">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "py-2 font-medium",
                  c.align === "right" ? "text-right" : "text-left"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={cn(
                    "inline-flex items-center gap-1 transition-colors hover:text-navy-900",
                    sortKey === c.key && "text-navy-900"
                  )}
                >
                  {c.label}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            ))}
            {showGainShare && (
              <th className="py-2 text-right font-medium">Share of gain</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-navy-50 transition-colors duration-200 hover:bg-navy-50/60 motion-reduce:transition-none"
            >
              <td className="max-w-[190px] truncate py-2 pr-3" title={r.name}>
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
                  style={{ backgroundColor: r.color }}
                />
                <span className="text-navy-900">{r.name}</span>
              </td>
              <td className="py-2 text-right tabular-nums text-navy-700">
                {formatAmount(r.invested)}
              </td>
              <td className="py-2 text-right tabular-nums text-navy-700">
                {formatAmount(r.current)}
              </td>
              <td
                className={cn(
                  "py-2 text-right tabular-nums",
                  r.gainLoss >= 0 ? "text-[#26804B]" : "text-[#BF4643]"
                )}
              >
                {formatSignedAmount(r.gainLoss)}
              </td>
              <td
                className={cn(
                  "py-2 text-right tabular-nums",
                  r.returnPct >= 0 ? "text-[#26804B]" : "text-[#BF4643]"
                )}
              >
                {r.returnPct >= 0 ? "+" : ""}
                {r.returnPct.toFixed(1)}%
              </td>
              <td className="py-2 text-right tabular-nums text-navy-600">
                {r.weightCurrentPct.toFixed(1)}%
              </td>
              <td className="relative py-2 text-right font-semibold tabular-nums text-navy-900">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-1 right-0 rounded-sm transition-all duration-500",
                    r.contributionPp >= 0
                      ? "bg-emerald-50"
                      : "bg-red-50"
                  )}
                  style={{ width: `${(Math.abs(r.contributionPp) / maxAbs) * 100}%` }}
                />
                <span className="relative">{formatContribution(r.contributionPp)}</span>
              </td>
              {showGainShare && (
                <td className="py-2 text-right tabular-nums text-navy-600">
                  {r.shareOfGainPct !== null ? `${r.shareOfGainPct.toFixed(1)}%` : "—"}
                </td>
              )}
            </tr>
          ))}
          <tr className="border-t-2 border-navy-700 font-semibold text-navy-900">
            <td className="py-2">Total</td>
            <td className="py-2 text-right tabular-nums">{formatAmount(totals.invested)}</td>
            <td className="py-2 text-right tabular-nums">{formatAmount(totals.current)}</td>
            <td className="py-2 text-right tabular-nums">
              {formatSignedAmount(totals.gainLoss)}
            </td>
            <td className="py-2 text-right tabular-nums">
              {totals.returnPct >= 0 ? "+" : ""}
              {totals.returnPct.toFixed(1)}%
            </td>
            <td className="py-2 text-right tabular-nums">100.0%</td>
            <td className="py-2 text-right tabular-nums">
              {formatContribution(totals.returnPct)}
            </td>
            {showGainShare && <td className="py-2 text-right tabular-nums">100.0%</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
