// Cell-level parsers for the Sheet. Every one of these is total: it returns a
// value or null, and never throws. The Sheet's quirks are permanent, so these
// are the permanent handling for them.

/**
 * Parse a money cell. Handles all three shapes that arrive today:
 *   - comma-formatted strings: "1,000,000", "1,00,000" (Indian grouping)
 *   - decimals: 2943579.78 or "2943579.78"
 *   - plain numbers from the API: 1000000
 * Also tolerates a ₹ prefix, stray spaces, and accounting-style negatives
 * written as "(1,000)".
 *
 * Returns full precision. Rounding is a rendering concern and happens nowhere
 * near here.
 */
export function parseAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (s === "") return null;

  // Accounting negatives: (1,000) means -1000.
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  // Strip currency symbols, grouping commas, spaces (incl. non-breaking).
  s = s.replace(/[₹$,\s ]/g, "");
  if (s === "" || s === "-") return null;

  // A leading minus survives the strip above.
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }

  if (!/^\d*\.?\d+$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// Google Sheets serial dates count days from 1899-12-30 (so 2000-01-01 = 36526).
const SHEETS_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

/** Lowest serial we will accept, to avoid reading a stray "45" as a date. */
const MIN_PLAUSIBLE_SERIAL = 20_000; // ~1954
const MAX_PLAUSIBLE_SERIAL = 80_000; // ~2119

function ym(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

/**
 * Normalise the Month column to YYYY-MM. The column is inconsistent by nature,
 * so this accepts every shape it has been seen in:
 *   - "YYYY-MM"          the intended format
 *   - "YYYY-MM-DD"       Sheets auto-converted the cell to a full date
 *   - JS Date            the API returned a date object
 *   - Sheets serial      the API returned an unformatted serial number
 *
 * Also tolerates "YYYY/MM" and "Mon-YY" / "Mon YYYY" spellings.
 * Returns null when nothing sensible can be read.
 */
export function normaliseMonth(raw: unknown): string | null {
  if (raw == null) return null;

  // ── JS Date ─────────────────────────────────────────────────────────────
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return ym(raw.getUTCFullYear(), raw.getUTCMonth());
  }

  // ── Sheets serial number ────────────────────────────────────────────────
  if (typeof raw === "number") {
    return serialToMonth(raw);
  }

  const s = String(raw).trim();
  if (s === "") return null;

  // YYYY-MM or YYYY/MM
  const ymMatch = /^(\d{4})[-/](\d{1,2})$/.exec(s);
  if (ymMatch) {
    const y = +ymMatch[1];
    const m = +ymMatch[2];
    return m >= 1 && m <= 12 ? ym(y, m - 1) : null;
  }

  // YYYY-MM-DD (or with slashes) — the Sheets auto-conversion case.
  const ymdMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (ymdMatch) {
    const y = +ymdMatch[1];
    const m = +ymdMatch[2];
    return m >= 1 && m <= 12 ? ym(y, m - 1) : null;
  }

  // A bare numeric string is a serial that came through as text.
  if (/^\d+(\.\d+)?$/.test(s)) {
    return serialToMonth(Number(s));
  }

  // "Jul-26", "Jul 2026", "July 2026"
  const nameMatch = /^([A-Za-z]{3,})[-\s]+(\d{2,4})$/.exec(s);
  if (nameMatch) {
    const monthIndex = MONTH_NAMES.indexOf(nameMatch[1].slice(0, 3).toLowerCase());
    if (monthIndex === -1) return null;
    let y = +nameMatch[2];
    if (y < 100) y += 2000; // "26" -> 2026
    return ym(y, monthIndex);
  }

  // Last resort: let Date try, but only for strings that look date-ish.
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(s)) {
    return ym(parsed.getUTCFullYear(), parsed.getUTCMonth());
  }

  return null;
}

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function serialToMonth(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  if (serial < MIN_PLAUSIBLE_SERIAL || serial > MAX_PLAUSIBLE_SERIAL) return null;
  const d = new Date(SHEETS_EPOCH_UTC + Math.floor(serial) * MS_PER_DAY);
  if (Number.isNaN(d.getTime())) return null;
  return ym(d.getUTCFullYear(), d.getUTCMonth());
}

/**
 * Normalise a percentage to a single internal representation: PERCENTAGE
 * POINTS, so 1.41 means 1.41%.
 *
 * The column arrives either as a percent-formatted string ("1.41%") or as a
 * raw fraction (0.0141), depending on how the cell was typed and which render
 * option the API used.
 *
 * Rule:
 *   - a string containing "%" is already in points  -> "1.41%" => 1.41
 *   - a number with |v| <= 1 is a fraction          -> 0.0141  => 1.41
 *   - a number with |v| >  1 is already in points   -> 1.41    => 1.41
 *
 * The rule is ambiguous for a genuine sub-1% value typed as points (0.5
 * meaning 0.5% reads as 50%). Real data sits at 0.006-0.017 as fractions and
 * 0.6-1.7 as points, so the bands do not collide in practice; anything landing
 * in the ambiguous middle is reported so it can be seen rather than guessed at
 * silently.
 */
export function normalisePercent(raw: unknown): {
  value: number | null;
  ambiguous: boolean;
} {
  if (raw == null) return { value: null, ambiguous: false };

  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return { value: null, ambiguous: false };
    if (s.includes("%")) {
      const n = parseAmount(s.replace(/%/g, ""));
      return { value: n, ambiguous: false };
    }
  }

  const n = parseAmount(raw);
  if (n == null) return { value: null, ambiguous: false };

  const abs = Math.abs(n);
  if (abs === 0) return { value: 0, ambiguous: false };

  if (abs <= 1) {
    // Treated as a fraction. Flag the band where that could be wrong.
    return { value: n * 100, ambiguous: abs > 0.02 };
  }
  return { value: n, ambiguous: false };
}

/**
 * Clean a colour cell. Values arrive escaped as "\#1A2B5C" from the Sheet, and
 * occasionally without the hash or in 3-digit shorthand.
 * Returns #RRGGBB uppercase, or null if unreadable.
 */
export function parseColor(raw: unknown): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === "") return null;

  // Strip backslash escaping and any quoting the Sheet added.
  s = s.replace(/\\/g, "").replace(/^['"]|['"]$/g, "").trim();
  s = s.replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

/** "Active"/"active " -> true. Anything else, including blank, -> false. */
export function isActiveStatus(raw: unknown): boolean {
  return String(raw ?? "").trim().toLowerCase() === "active";
}

/** "Yes"/"Y"/"TRUE" -> true. Anything else, including blank, -> false. */
export function isYes(raw: unknown): boolean {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true";
}

/** Normalise an email for use as a key: trimmed and lowercased. */
export function normaliseEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * Parse the Last Updated cell into an ISO timestamp, used only to break
 * duplicate ties. Accepts ISO strings, DD/MM/YYYY, Date objects and serials.
 */
export function parseTimestamp(raw: unknown): string | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw === "number") {
    if (raw < MIN_PLAUSIBLE_SERIAL || raw > MAX_PLAUSIBLE_SERIAL) return null;
    return new Date(SHEETS_EPOCH_UTC + raw * MS_PER_DAY).toISOString();
  }

  const s = String(raw).trim();
  if (s === "") return null;

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy) {
    const d = +dmy[1];
    const m = +dmy[2];
    const y = +dmy[3];
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, m - 1, d)).toISOString();
  }

  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseTimestamp(Number(s));
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * A "grouping row" is a sub-category header that Rohit sir types into the
 * Holdings tab as if it were a holding. In the report these must render as
 * nested headers, never as data rows, and today they leak through as
 * "0 / 0.0% / +0" lines.
 *
 * Signature: no meaningful money on the row. Both amounts are absent or zero.
 */
export function isGroupingRow(
  invested: number | null,
  current: number | null
): boolean {
  const i = invested ?? 0;
  const c = current ?? 0;
  return i === 0 && c === 0;
}
