"use client";

import { useState } from "react";
import { CountUp } from "@/components/CountUp";
import { impactByFy } from "@/content/impact";
import { cn } from "@/lib/cn";

// The dark anchor tile of the merged Services + Impact bento. Deliberately
// styled as the permanent version of the service cards' hover-invert state so
// both halves of the grid read as one composition. FY toggle sits directly
// above the numbers it controls.
// Kept compact so the two-row rail (and the whole section) fits one viewport.
// Keeps the id="impact" anchor so older #impact links still resolve.
export function ImpactRail() {
  const [fyIndex, setFyIndex] = useState(0);
  const fy = impactByFy[fyIndex];

  return (
    <div
      id="impact"
      className="relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-navy-500/20 blur-3xl"
      />

      <p className="text-xs font-semibold uppercase tracking-widest text-navy-300">
        Our Impact
      </p>

      {/* FY toggle */}
      <div
        className="mt-4 inline-flex self-start rounded-full border border-white/15 p-1"
        role="tablist"
        aria-label="Financial year"
      >
        {impactByFy.map((f, i) => (
          <button
            key={f.fyKey}
            type="button"
            role="tab"
            aria-selected={i === fyIndex}
            onClick={() => setFyIndex(i)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 motion-reduce:transition-none",
              i === fyIndex
                ? "bg-white text-navy-900 shadow-sm"
                : "text-navy-200 hover:text-white"
            )}
          >
            {f.fyKey}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-navy-400" aria-live="polite">
        {fy.fyLabel}
      </p>

      {/* FY stats: replayKey re-runs the count-up when the year changes.
          Vertical column on lg (spread across the rail's height), three
          across when the rail is a horizontal band on sm. */}
      <div className="mt-6 flex-1">
        <div className="grid gap-6 sm:grid-cols-3 lg:h-full lg:grid-cols-1 lg:content-evenly lg:gap-0">
          {fy.stats.map((s) => (
            <div key={s.label} className="border-l-2 border-white/15 pl-4">
              <CountUp
                target={s.value}
                suffix="+"
                replayKey={fy.fyKey}
                className="text-3xl font-semibold tabular-nums text-white"
              />
              <p className="mt-1 text-xs text-navy-300">
                {s.label} in {fy.fyKey}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
