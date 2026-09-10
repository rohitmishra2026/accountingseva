// Category ordering and colour, resolved from the Categories tab.
//
// Nothing here hardcodes a category name, an order or a colour: the Categories
// tab is the single source of truth. This module only knows the FALLBACK
// behaviour for a Holdings row whose category pair the tab does not describe.

export const NEUTRAL_COLOR = "#A6A6A6";
export const FALLBACK_ORDER = 999;

export type CategoryMeta = {
  category: string;
  /** "" for a category-level row. */
  subCategory: string;
  displayOrder: number;
  color: string;
};

export type MatchKind = "pair" | "category" | "fallback";

export type Resolved = {
  displayOrder: number;
  color: string;
  matched: MatchKind;
};

export type CategoryResolver = {
  /**
   * Three-step fallback, in order:
   *   1. exact (category, sub_category) match
   *   2. category-only match
   *   3. neutral grey + order 999, recorded in unmatched()
   * A holding is NEVER dropped for want of a category.
   */
  resolve(category: string, subCategory?: string | null): Resolved;
  /** Display order for a top-level category. */
  orderOf(category: string): number;
  /** Colour for a top-level category (used by both charts). */
  colorOf(category: string, subCategory?: string | null): string;
  /** Every (category / sub_category) pair that fell through to the fallback. */
  unmatched(): string[];
  /** Top-level categories known to the Categories tab, in display order. */
  knownCategories(): string[];
};

/** Loose key so casing and stray spaces in the Sheet cannot cause a miss. */
function key(category: string, subCategory: string): string {
  return `${normaliseLabel(category)}||${normaliseLabel(subCategory)}`;
}

/**
 * The matching key for a category or sub-category label: trimmed, lowercased,
 * internal whitespace collapsed.
 *
 * Exported because the resolver is not the only thing that has to agree on what
 * counts as "the same category". Anything that GROUPS holdings by category must
 * use this too, or it will split a category the resolver then resolves to one
 * colour and one display order - two identical-looking bars in the same colour,
 * with the client's money divided between them. See portfolio-aggregate.ts.
 */
export function normaliseLabel(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Internal shorthand, kept so the call sites below stay readable.
const norm = normaliseLabel;

export function buildCategoryResolver(rows: CategoryMeta[]): CategoryResolver {
  const byPair = new Map<string, CategoryMeta>();
  const byCategory = new Map<string, CategoryMeta>();
  const misses = new Set<string>();

  for (const r of rows) {
    byPair.set(key(r.category, r.subCategory), r);
    // A category-level row (blank sub-category) defines the category itself.
    // Where the tab has no such row, the lowest-ordered sub-category row
    // stands in, so a category always has an order and a colour.
    const ck = norm(r.category);
    const existing = byCategory.get(ck);
    if (
      !existing ||
      (r.subCategory === "" && existing.subCategory !== "") ||
      (existing.subCategory !== "" && r.displayOrder < existing.displayOrder)
    ) {
      byCategory.set(ck, r);
    }
  }

  const resolve = (category: string, subCategory?: string | null): Resolved => {
    const sub = String(subCategory ?? "");

    const pair = byPair.get(key(category, sub));
    if (pair) {
      return { displayOrder: pair.displayOrder, color: pair.color, matched: "pair" };
    }

    const cat = byCategory.get(norm(category));
    if (cat) {
      return { displayOrder: cat.displayOrder, color: cat.color, matched: "category" };
    }

    // Neither matched. Record it so the run can report it, and carry on.
    misses.add(sub ? `${category} / ${sub}` : category || "(blank)");
    return {
      displayOrder: FALLBACK_ORDER,
      color: NEUTRAL_COLOR,
      matched: "fallback",
    };
  };

  return {
    resolve,
    orderOf: (category) => resolve(category).displayOrder,
    colorOf: (category, subCategory) => resolve(category, subCategory).color,
    unmatched: () => Array.from(misses).sort(),
    knownCategories: () =>
      Array.from(byCategory.values())
        .sort((a, b) => a.displayOrder - b.displayOrder || a.category.localeCompare(b.category))
        .map((r) => r.category),
  };
}
