import { GAIN, LOSS } from "@/lib/portfolio-constants";
import { ScrollRegion } from "@/components/portal/report/ReportPrimitives";
import { cn } from "@/lib/cn";

// Shared furniture for the Detailed view.
//
// Built from the same vocabulary as the Standard view and the marketing site:
// the navy scale, rounded-2xl corners, navy-100 hairlines, and the site's
// transition-all duration-300 ease-out with a motion-reduce escape. The two
// tabs used to be visibly different designs; they are now one.
//
// No dark: variants. The portal sets darkMode: "class" but nothing has ever
// added that class to <html>, so those rules were unreachable.

// A dense metric with its meaning spelled out. The meaning line is the whole
// point: a number without a sentence is a number a client cannot use.
export function MetricTile({
  label,
  value,
  meaning,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meaning?: string;
  tone?: "neutral" | "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-navy-50/70 p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md hover:shadow-navy-900/5 motion-reduce:transform-none motion-reduce:transition-none">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </p>
      <p
        className={cn(
          // Indian-format rupee figures get long, so keep them inside the tile.
          "mt-2 break-words text-base font-semibold tabular-nums sm:text-lg lg:text-xl",
          tone === "neutral" && "text-navy-900"
        )}
        style={
          tone === "up"
            ? { color: GAIN }
            : tone === "down"
              ? { color: LOSS }
              : undefined
        }
      >
        {value}
      </p>
      {meaning && (
        <p className="mt-1.5 text-xs leading-snug text-navy-500">{meaning}</p>
      )}
    </div>
  );
}

// Section heading with a one-line statement of what the panel is for and,
// where relevant, the basis the figures are measured on.
//
// Deliberately unnumbered. The panels used to carry 01, 02, 03 and so on, which
// meant every removal forced a renumber of everything below it, and two of them
// had to be computed because a panel was conditional on the client having
// monthly returns. The numbers told a client nothing the heading did not.
export function SectionHeader({
  heading,
  purpose,
  basis,
}: {
  heading: string;
  purpose: string;
  basis?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight text-navy-900">
          {heading}
        </h3>
        <p className="mt-1 text-sm leading-snug text-navy-600">{purpose}</p>
      </div>
      {basis && (
        <span className="flex-shrink-0 rounded-full border border-navy-100 bg-white px-3 py-1 text-xs font-medium text-navy-500">
          {basis}
        </span>
      )}
    </div>
  );
}

export function PanelCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-print="keep"
      className={cn(
        "rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

// Honest empty state. Says what is missing and what still works, rather than
// rendering an empty axis or a zero.
export function NotAvailable({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-navy-200 bg-navy-50/60 px-4 py-6 text-center text-sm text-navy-500">
      {message}
    </p>
  );
}

/**
 * Horizontally scrollable frame for a category chart.
 *
 * These charts force every tick to render, which is right - a category silently
 * missing from its own chart is worse than a label you have to scroll to - but
 * names like "Commodities (Held Physically)" and "Cash & Cash Equivalents"
 * collapse into an unreadable fan on a phone.
 *
 * So the chart is given the width it actually needs, a fixed slice per bar, and
 * the frame scrolls sideways. On a wide screen the minimum is under the space
 * available, nothing scrolls, and the desktop view is unchanged.
 *
 * Delegates to the report's ScrollRegion so this scroller is keyboard-reachable
 * on the same terms as every other one in the portal, rather than being a
 * second, mouse-only implementation of the same idea.
 */
export function ScrollableChart({
  label,
  count,
  height,
  pxPerBar = 58,
  minTotal = 560,
  children,
}: {
  /** Names the region when it takes keyboard focus. */
  label: string;
  /** Number of bars, which is what decides the width needed. */
  count: number;
  height: number;
  pxPerBar?: number;
  minTotal?: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollRegion label={label} bleed>
      <div
        role="img"
        aria-label={label}
        style={{ height, minWidth: Math.max(minTotal, count * pxPerBar) }}
      >
        {children}
      </div>
    </ScrollRegion>
  );
}
