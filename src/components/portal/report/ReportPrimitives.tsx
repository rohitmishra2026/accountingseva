import { cn } from "@/lib/cn";

/**
 * Shared furniture for the report.
 *
 * Everything here is built from the marketing site's own vocabulary so the
 * portal reads as the same product: the navy scale, rounded-2xl/3xl corners,
 * navy-100 hairlines, soft navy shadows, and the site's
 * `transition-all duration-300 ease-out` with a motion-reduce escape.
 *
 * No dark: variants. The portal sets darkMode: "class" but nothing has ever
 * added that class to <html>, so every dark: rule in the codebase is
 * unreachable; carrying dead styles through a redesign would only make the new
 * code harder to read.
 */

/** Section heading above a panel or table. The site's card-heading scale. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-lg font-semibold tracking-tight text-navy-900">
      {children}
    </h2>
  );
}

/**
 * The site's eyebrow: small, semibold, uppercase, widely letterspaced.
 * `tone` picks the palette rather than the caller hand-writing a colour, so
 * every eyebrow on a navy ground uses the same navy-300 and every one on white
 * uses the same navy-500.
 */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-widest",
        tone === "dark" ? "text-navy-300" : "text-navy-500",
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * The light card the charts sit in: the same treatment as the service tiles on
 * the homepage, minus their hover lift. These are not interactive, and a
 * report panel that jumps when the pointer crosses it would be noise.
 *
 * `title` renders top-left and `aside` top-right on one line, which is how
 * every chart in the design is captioned: name on the left, legend or unit
 * note on the right.
 */
export function Panel({
  id,
  title,
  aside,
  children,
  footnote,
}: {
  /** Ties the heading to the region it labels, for screen readers. */
  id?: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  footnote?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      data-print="keep"
      className="rounded-2xl border border-navy-100 bg-navy-50/70 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={headingId}
          className="text-sm font-semibold tracking-tight text-navy-900"
        >
          {title}
        </h3>
        {aside}
      </div>
      {children}
      {footnote && (
        <p className="mt-3 border-t border-navy-100 pt-3 text-xs leading-relaxed text-navy-500">
          {footnote}
        </p>
      )}
    </section>
  );
}

/**
 * One legend entry. `shape` matches how the series is actually drawn, so a
 * dashed line in the chart reads as a dashed line in the legend rather than as
 * a square of the same colour.
 */
export function LegendItem({
  color,
  label,
  shape = "square",
}: {
  color: string;
  label: string;
  shape?: "square" | "line" | "dashed";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-navy-500">
      {shape === "square" ? (
        <span
          className="h-2 w-2 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          className="h-0 w-4 border-t-2"
          style={{
            borderColor: color,
            borderStyle: shape === "dashed" ? "dashed" : "solid",
          }}
        />
      )}
      {label}
    </span>
  );
}

/** Coloured category dot used in both tables. */
export function CategoryDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** A table wrapped in the site's card treatment. */
export function TableCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollRegion
      label={label}
      className="rounded-2xl border border-navy-100 bg-white shadow-sm"
    >
      {children}
    </ScrollRegion>
  );
}

/**
 * A horizontally scrolling area that a keyboard can actually reach.
 *
 * Every wide chart and table here scrolls sideways on a narrow screen. A plain
 * overflow-x-auto div is operable with a mouse or a thumb and unreachable with
 * a keyboard, which fails WCAG 2.1.1: the content past the right edge is simply
 * lost to anyone not using a pointer.
 *
 * tabIndex makes it focusable so the arrow keys scroll it, role + label say
 * what it is when it takes focus, and overscroll-x-contain keeps a sideways
 * swipe from turning into a browser back-navigation.
 *
 * It carries no focus style of its own: globals.css already gives every
 * [tabindex] the site's focus ring, and a second, different ring here would be
 * the portal quietly disagreeing with the rest of the site.
 *
 * `bleed` pulls the scroll area out to the panel's padding edge so the first
 * and last bars are not clipped behind it, then restores the padding inside.
 */
export function ScrollRegion({
  label,
  bleed = false,
  className,
  children,
}: {
  label: string;
  bleed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      data-print="unclip"
      className={cn(
        "overflow-x-auto overscroll-x-contain",
        bleed && "-mx-4 px-4 sm:-mx-5 sm:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}
