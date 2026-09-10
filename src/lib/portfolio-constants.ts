// Report CHROME: the fixed colours that belong to the report's own visual
// language rather than to any category.
//
// Category labels, ordering and colours are NOT here and must never be. They
// come from the Categories tab via lib/categories.ts. If you find yourself
// wanting to add a category name to this file, that is the bug.

// The two bars in "Invested vs Current Value". These are series colours, not
// category colours: the same pair is used for every category.
export const INVESTED_COLOR = "#9DC3E6";
export const CURRENT_COLOR = "#A9D18E";

/** Accent used for headings and primary figures. */
export const REPORT_BLUE = "#2E75B6";
/** The lighter blue of the "Portfolio Summary" masthead. */
export const REPORT_BLUE_LIGHT = "#2E9BD6";

export const POSITIVE_COLOR = "#2E7D32";
export const NEGATIVE_COLOR = "#C0392B";

/** Month-on-month growth chart: solid actual, dashed expected. */
export const ACTUAL_LINE_COLOR = "#2E75B6";
export const EXPECTED_LINE_COLOR = "#A6A6A6";

/** Neutral grey, for a category the Categories tab does not describe. */
export const NEUTRAL_COLOR = "#A6A6A6";

// ─────────────────────────────────────────────────────────────────────────
// PORTAL THEME
//
// The portal and the marketing site are one product, so they share one
// palette: the `navy` scale from tailwind.config.ts, quoted here as hex
// because recharts takes colours as values, not as class names. If the scale
// changes there, change it here.
//
//   navy-900 #08152a   deepest - the stat rail, table headers
//   navy-700 #0f2748   primary brand navy
//   navy-500 #3d5f92   secondary text on white          (6.5:1)
//   navy-300 #8ea5c9   secondary text on navy-900       (7.3:1)
//   navy-100 #dbe3ef   hairlines, borders
//   navy-50  #eef2f7   panel washes
//
// These replace an earlier set sampled from the print mockup (a near-black
// #0E1C33 over flat grey panels). That skin was correct for paper and wrong
// beside the website, which is built from this scale with rounded-2xl/3xl
// corners, soft navy shadows and gradient tiles. The report's LAYOUT is still
// the mockup's; only the surface language is the site's.
//
// Category colours are NOT here and never will be. They come from the
// Categories tab via lib/categories.ts.
// ─────────────────────────────────────────────────────────────────────────

/** navy-900. The stat rail, table header rows, total rows. */
export const INK = "#08152a";
/** navy-800. Table figures - softer than INK so names stay dominant. */
export const FIGURE = "#0b1e39";
/** navy-700. The primary brand navy. */
export const BRAND = "#0f2748";
/** navy-500. Secondary text on a light ground. */
export const MUTED = "#3d5f92";
/** navy-300. Secondary text on the navy rail. */
export const MUTED_ON_INK = "#8ea5c9";
/** navy-100. Hairlines, table rules, progress-bar tracks. */
export const HAIRLINE = "#dbe3ef";
/** navy-50. Panel wash. */
export const PANEL = "#eef2f7";

/**
 * Gain and loss, as TEXT.
 *
 * The only colours in the portal that are not navy, because they are not
 * decoration: whether a holding made money is the single most important thing
 * on the page and it must not depend on reading a minus sign. Both clear
 * 4.5:1 on white and on the panel wash.
 */
export const GAIN = "#26804B";
export const LOSS = "#BF4643";
/**
 * Gain and loss on the navy rail, where the pair above is unreadable.
 *
 * Both are chosen to sit WITH the navy rather than shout over it. The rail is
 * a deep blue at hue 217; the earlier mint (#7EE0A3) was a yellow-leaning
 * green at hue 143 and 61% saturation - 74 degrees away from the navy and the
 * most saturated thing on the page. That distance is what read as cheap.
 *
 * This green sits at hue 160 and 48% saturation: still unmistakably green, but
 * with enough blue in it to belong to the same palette. The red is pulled to a
 * comparable saturation for the same reason - a 100%-saturated salmon beside a
 * 48% green would put the tackiness straight back on any client whose
 * portfolio is down.
 *
 * Contrast on INK: 9.1:1 and 7.7:1.
 */
export const GAIN_ON_INK = "#67C9A8";
export const LOSS_ON_INK = "#E89189";

/**
 * "Invested vs Current" series.
 *
 * A navy pair - pale against deep - rather than the mockup's blue-and-green.
 * The site's whole chart-free visual language is monochrome navy, and two
 * navies from the same scale sit inside it where a green bar did not. They
 * separate at 5.97:1, well past the 3:1 a meaningful graphic needs.
 */
export const SERIES_INVESTED = "#8ea5c9";
export const SERIES_CURRENT = "#0f2748";

/** Chart grid lines and axis rules. navy-100. */
export const CHART_GRID = "#dbe3ef";

/** Relative luminance, per WCAG 2.1. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Darken a category's colour until it is legible as TEXT on `background`.
 *
 * Category colours arrive from the Categories tab, so nothing here can promise
 * they are readable - someone can set a category to pale yellow and it will be
 * used for a value label and a sub-category caption. Rather than hope, this
 * walks the colour darker until it meets the ratio, and gives up at black.
 *
 * Used only where a Sheet colour becomes text. Bars and dots keep the exact
 * colour the client chose, which is the point of letting them choose it.
 */
export function readableOn(
  hex: string,
  background: string,
  target = 4.5
): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return "#42506B";

  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  // Already legible: hand back exactly what was passed in rather than
  // re-emitting the same colour in different casing.
  if (contrastRatio(hex, background) >= target) return hex;

  for (let step = 1; step <= 20; step++) {
    const f = 1 - step * 0.05;
    const candidate = `#${[r, g, b]
      .map((v) => Math.round(v * f).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return "#000000";
}

/**
 * Tint a category's colour for use as a section-header background.
 *
 * The report gives each category header a pale wash of its own colour. Since
 * colours now arrive from the Sheet, that wash has to be derived rather than
 * looked up from a fixed table.
 */
export function tint(hex: string, alpha = 0.12): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return `rgba(166, 166, 166, ${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Darken a category's colour for header TEXT, so a pale category colour still
 * reads against its own tinted background.
 */
export function shade(hex: string, amount = 0.25): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return "#595959";
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// LEGACY, UNUSED BY THE LIVE PORTAL.
//
// Three components predate the report redesign and are no longer imported
// anywhere: PortfolioCharts.tsx, HoldingsTable.tsx and SummaryCards.tsx. They
// still reference the old hardcoded five-category system, so this shim exists
// only to keep them type-checking. Nothing on any live path reads it.
//
// Safe to delete along with those three files; left in place because deleting
// files was not in scope.
// ─────────────────────────────────────────────────────────────────────────
export const CATEGORY_ORDER = [
  "equities",
  "mutual_funds",
  "fixed_income",
  "commodities",
  "cash",
] as const;

export type CategoryKey = (typeof CATEGORY_ORDER)[number];

export type CategoryStyle = {
  label: string;
  text: string;
  bg: string;
  chart: string;
};

export const CATEGORY_STYLES: Record<CategoryKey, CategoryStyle> = {
  equities: { label: "Equities", text: "#2E75B6", bg: "#EAF1F9", chart: "#2E75B6" },
  mutual_funds: { label: "Mutual Funds", text: "#548235", bg: "#EAF4E9", chart: "#70AD47" },
  fixed_income: { label: "Fixed Income", text: "#BF9000", bg: "#FDF5E6", chart: "#E0B92C" },
  commodities: { label: "Commodities", text: "#C55A5A", bg: "#FCEAEA", chart: "#E07A7A" },
  cash: { label: "Cash & Equivalents", text: "#ED9C28", bg: "#FDF0E1", chart: "#F0A94A" },
};

const LEGACY_CATEGORY_MAP: Record<string, CategoryKey> = {
  equity: "equities",
  equities: "equities",
  stock: "equities",
  mutual_fund: "mutual_funds",
  mutual_funds: "mutual_funds",
  mf: "mutual_funds",
  debt: "fixed_income",
  bond: "fixed_income",
  bonds: "fixed_income",
  fixed_income: "fixed_income",
  fixed_deposit: "fixed_income",
  gold: "commodities",
  commodity: "commodities",
  commodities: "commodities",
  cash: "cash",
  liquid: "cash",
  other: "cash",
};

/** @deprecated Legacy only. Live code resolves categories via lib/categories.ts. */
export function toCategory(instrumentType: string): CategoryKey {
  const key = String(instrumentType ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return LEGACY_CATEGORY_MAP[key] ?? "equities";
}

/** @deprecated Legacy only. */
export function categoryStyle(instrumentType: string): CategoryStyle {
  return CATEGORY_STYLES[toCategory(instrumentType)];
}

/** @deprecated Legacy only. */
export function categoryLabel(instrumentType: string): string {
  return categoryStyle(instrumentType).label;
}

/** @deprecated Legacy only. */
export function categoryColor(instrumentType: string): string {
  return categoryStyle(instrumentType).chart;
}

/** @deprecated Legacy only. */
export const INSTRUMENT_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORY_ORDER.map((k) => [k, CATEGORY_STYLES[k].chart])
);

/** @deprecated Legacy only. */
export function instrumentColor(type: string): string {
  return categoryColor(type);
}
