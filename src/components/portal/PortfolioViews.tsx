"use client";

import { useState } from "react";
import { BarChart3, LayoutList } from "lucide-react";
import type {
  CategoryGroup,
  CategorySplit,
  Holding,
  MonthlyReturn,
  Totals,
} from "@/lib/portfolio-data";
import { Reveal } from "@/components/Reveal";
import { ReportAllocation } from "./report/ReportAllocation";
import { ReportHoldings } from "./report/ReportHoldings";
import { ReportStatRail } from "./report/ReportStatRail";
import { SectionTitle } from "./report/ReportPrimitives";
import {
  InvestedVsCurrentChart,
  MonthlyGrowthChart,
  ReturnContributionChart,
} from "./report/ReportCharts";
import { DetailedView } from "./detailed/DetailedView";
import { cn } from "@/lib/cn";

type View = "standard" | "detailed";

// Owns the Standard / Detailed switch. Both views render from the same data,
// already fetched on the server, so switching is instant with no refetch.
export function PortfolioViews({
  holdings,
  groups,
  totals,
  splits,
  monthly,
  reportMonth,
}: {
  holdings: Holding[];
  groups: CategoryGroup[];
  totals: Totals;
  splits: CategorySplit[];
  monthly: MonthlyReturn[];
  reportMonth: string | null;
}) {
  const [view, setView] = useState<View>("standard");

  const tabs: { key: View; label: string; icon: typeof LayoutList; hint: string }[] = [
    {
      key: "standard",
      label: "Standard",
      icon: LayoutList,
      hint: "Your quarterly report on screen",
    },
    {
      key: "detailed",
      label: "Detailed",
      icon: BarChart3,
      hint: "Full performance analysis",
    },
  ];

  return (
    <div className="space-y-6">
      <div
        data-print="hide"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        {/* The same pill as the homepage's financial-year toggle, inverted for
            a light ground: white track, navy-900 selected, navy-600 resting. */}
        <div
          className="inline-flex rounded-full border border-navy-100 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Portfolio view"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "bg-navy-900 text-white shadow-sm"
                    : "text-navy-600 hover:text-navy-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-navy-500">
          {tabs.find((t) => t.key === view)?.hint}
        </p>
      </div>

      {view === "standard" ? (
        // Reveal is the site's own entrance: a fade-up as the block scrolls
        // into view, staggered 60ms apart exactly as the marketing card grids
        // stagger, and disabled outright under prefers-reduced-motion. Using it
        // here rather than a portal-only animation is what makes moving from
        // the website into the portal feel like one product.
        <div className="space-y-8">
          <Reveal className="grid gap-4 lg:grid-cols-12">
            {/* min-w-0 on both cells is what lets the charts scroll inside
                their panels: a grid item's default min-width is auto, so
                without it a chart wider than the screen pushes the whole card
                past the viewport instead. */}
            <div className="min-w-0 lg:col-span-4">
              <ReportStatRail
                totals={totals}
                splits={splits}
                holdings={holdings}
                reportMonth={reportMonth}
              />
            </div>
            <div className="min-w-0 space-y-4 lg:col-span-8">
              <InvestedVsCurrentChart splits={splits} />
              <ReturnContributionChart splits={splits} />
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <ReportAllocation splits={splits} totals={totals} />
          </Reveal>

          <Reveal delayMs={120}>
            <ReportHoldings groups={groups} totals={totals} />
          </Reveal>

          {monthly.length > 0 && (
            <Reveal delayMs={180} as="section">
              <SectionTitle>Performance Trend</SectionTitle>
              <MonthlyGrowthChart monthly={monthly} />
            </Reveal>
          )}
        </div>
      ) : (
        <DetailedView
          holdings={holdings}
          totals={totals}
          splits={splits}
          monthly={monthly}
        />
      )}
    </div>
  );
}
