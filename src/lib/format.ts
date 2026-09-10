// Shared formatters for the portal, the report and the PDF.
//
// ONE rupee formatter, formatINR(), is the single implementation. Everything
// else in this file is a named wrapper over it, so there is exactly one place
// where Indian digit grouping is decided.
//
// Indian grouping throughout: 1,05,00,000 and never 10,500,000. That is what
// en-IN gives us; the grouping is not something to hand-roll.

export type INROptions = {
  /** Prefix with ₹. Off by default: report tables put ₹ in the column header. */
  symbol?: boolean;
  /** Force a leading + on positives (negatives always keep their -). */
  signed?: boolean;
  /** Abbreviate to L / Cr. For chart axes, where full numbers are unreadable. */
  compact?: boolean;
  /** Decimal places. Defaults to 0 (whole rupees). */
  decimals?: number;
};

const cache = new Map<string, Intl.NumberFormat>();

function formatter(decimals: number): Intl.NumberFormat {
  const key = String(decimals);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    cache.set(key, f);
  }
  return f;
}

/**
 * THE rupee formatter. Every currency string in the app comes from here.
 *
 * Rounds for display only. Callers pass full-precision values; nothing upstream
 * of this function should ever have rounded.
 */
export function formatINR(value: number, options: INROptions = {}): string {
  const { symbol = false, signed = false, compact = false, decimals = 0 } = options;

  const n = Number.isFinite(value) ? value : 0;
  const negative = n < 0;
  const abs = Math.abs(n);

  const body = compact
    ? compactIndian(abs)
    : formatter(decimals).format(decimals === 0 ? Math.round(abs) : abs);

  const sign = negative ? "-" : signed && n > 0 ? "+" : "";
  return `${sign}${symbol ? "₹" : ""}${body}`;
}

/**
 * Indian abbreviations: 45L, 1.2Cr. Lakh and crore, not thousand and million,
 * because the audience reads in lakh and crore.
 */
function compactIndian(abs: number): string {
  if (abs >= 1e7) return `${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${trim(abs / 1e3)}K`;
  return formatter(0).format(Math.round(abs));
}

/** One decimal, but drop a trailing ".0" so axes read 5L rather than 5.0L. */
function trim(v: number): string {
  const s = v.toFixed(v >= 100 ? 0 : 1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

// ── Named wrappers, all delegating to formatINR ───────────────────────────

/** Plain Indian-grouped amount, no symbol. Report table cells. */
export function formatAmount(value: number): string {
  return formatINR(value);
}

/** Signed amount for gain/loss cells: +2,50,000 or -5,606. */
export function formatSignedAmount(value: number): string {
  return formatINR(value, { signed: true });
}

/**
 * The KPI tile spelling for a rupee figure, with a space after the sign:
 * "+ 1,21,818". Matches formatPctSpaced so the appreciation and the return
 * read as a pair in the totals band, which is how the printed report sets them.
 *
 * Zero takes a "+", same as formatPctSpaced, rather than switching to a bare
 * number and breaking the alignment of the row.
 */
export function formatSignedAmountSpaced(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n >= 0 ? "+" : "-";
  // Format the magnitude, not the signed value: formatINR rounds the absolute
  // value, so passing a negative here would round the wrong way on a half.
  return `${sign} ${formatAmount(Math.abs(n))}`;
}

/** With the rupee symbol. Tooltips and standalone figures. */
export function formatRupee(value: number): string {
  return formatINR(value, { symbol: true });
}

/** Compact, for chart axes: 50L, 1.2Cr. */
export function formatCompactINR(value: number): string {
  return formatINR(value, { compact: true });
}

/** Compact with the symbol: ₹50L. */
export function formatCompactRupee(value: number): string {
  return formatINR(value, { compact: true, symbol: true });
}

// ── Percentages ───────────────────────────────────────────────────────────

/**
 * Signed percentage. Positives get a +, negatives keep their -, so a loss can
 * never render as a gain.
 */
export function formatPct(value: number, decimals = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(decimals)}%`;
}

/**
 * The KPI tile spelling from the report, which puts a space after the sign:
 * "+ 15.81%".
 */
export function formatPctSpaced(value: number, decimals = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n >= 0 ? "+" : "-";
  return `${sign} ${Math.abs(n).toFixed(decimals)}%`;
}

/**
 * @deprecated Legacy re-export for the three unmounted pre-redesign components
 * (PortfolioCharts, HoldingsTable, SummaryCards). Live code takes its category
 * label from the data, not from a lookup table.
 */
export { categoryLabel as instrumentLabel } from "@/lib/portfolio-constants";

/** Percentage points, for contribution figures. "pp" not "%", deliberately. */
export function formatPp(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n > 0 ? "+" : ""}${n.toFixed(2)} pp`;
}

/** Return in percentage points. 0 when nothing is invested, never NaN. */
export function computeReturnPct(invested: number, current: number): number {
  if (!invested) return 0;
  return ((current - invested) / invested) * 100;
}

// ── Dates and months ──────────────────────────────────────────────────────

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "2026-07" -> "July 2026". The report month heading. */
export function formatReportMonth(month: string | null | undefined): string {
  if (!month) return "—";
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return String(month);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  return d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Fixed three-letter abbreviations, deliberately NOT Intl. The en-IN short
// month for September is "Sept", which would render "Sept-25" on the axis where
// the report reads "Sep-25". The report's spelling wins.
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07" -> "Jul-26". Chart C's x-axis spelling. */
export function formatMonthShort(month: string | null | undefined): string {
  if (!month) return "";
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return String(month);
  const index = +m[2] - 1;
  if (index < 0 || index > 11) return String(month);
  return `${MONTH_ABBR[index]}-${m[1].slice(2)}`;
}
