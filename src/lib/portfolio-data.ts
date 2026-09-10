import { createClient } from "@/lib/supabase/server";
import { buildCategoryResolver, type CategoryMeta } from "@/lib/categories";
import {
  buildCategoryGroups,
  computeSplits,
  computeTotals,
  type CategoryGroup,
  type CategorySplit,
  type Holding,
  type HoldingRowView,
  type Totals,
} from "@/lib/portfolio-aggregate";
export type { CategoryGroup, CategorySplit, Holding, HoldingRowView, Totals };

/** One point on Chart C. Percentages are POINTS: 1.41 means 1.41%. */
export type MonthlyReturn = {
  month: string; // YYYY-MM
  actualPct: number;
  expectedPct: number;
};

export type Portfolio = {
  holdings: Holding[];
  totals: Totals;
  splits: CategorySplit[];
  groups: CategoryGroup[];
  monthly: MonthlyReturn[];
  /** The report month being displayed (YYYY-MM), or null when there is no data. */
  reportMonth: string | null;
  /** Category pairs the Categories tab did not describe. Surfaced, never silent. */
  unmatchedCategories: string[];
};

/**
 * Everything the portal needs for ONE client, for one report month.
 *
 * Reads go through the request-scoped session client, so RLS is the first line
 * of defence. It is deliberately not the only one: `clientEmail` scopes every
 * per-client query explicitly.
 *
 * WHY THE EXPLICIT FILTER IS NOT REDUNDANT. The RLS policy on holdings and
 * monthly_returns is
 *     lower(email) = public.current_client_email() or public.is_admin()
 * so for a profile with is_admin = true the `or` short-circuits to true and the
 * select returns EVERY client's rows. Without this filter the caller's own
 * dashboard and PDF rendered the whole client book summed into one portfolio,
 * under the caller's own name, with no error to signal it. The same happens to
 * an ordinary client if is_admin is ever set on their row by mistake.
 *
 * Passing the email in rather than deriving it here keeps this function honest:
 * the caller has already proved identity via requireUser(), and this is that
 * same identity, never a value taken from the request.
 *
 * Lowercased comparison is exact, not defensive: the sync writes holdings.email
 * through replace_holdings_for_month, whose body does `v_email := lower(p_email)`.
 *
 * Holdings are a month series now, so this selects the LATEST report month the
 * client has. Prior months stay in the table, untouched and queryable, which is
 * what makes the immutable-month guarantee visible from the read side too.
 */
export async function getPortfolio(clientEmail: string | null): Promise<Portfolio> {
  const supabase = createClient();

  // No identity, no rows. Failing closed here means a provisioning gap shows up
  // as an empty portfolio rather than as somebody else's holdings.
  if (!clientEmail) {
    return assemble([], [], []);
  }
  const email = clientEmail.trim().toLowerCase();

  const [holdingsRes, monthlyRes, categoriesRes] = await Promise.all([
    supabase
      .from("holdings")
      .select(
        "id, email, report_month, category, sub_category, amc, folio, instrument_name, invested_amount, current_value"
      )
      .eq("email", email)
      .order("current_value", { ascending: false }),
    supabase
      .from("monthly_returns")
      .select("month, actual_pct, expected_pct")
      .eq("email", email)
      .order("month", { ascending: true }),
    supabase
      .from("categories")
      .select("category, sub_category, display_order, color"),
  ]);

  const holdings: Holding[] = (holdingsRes.data ?? []).map((r) => ({
    id: String(r.id),
    email: String(r.email ?? ""),
    reportMonth: String(r.report_month ?? ""),
    category: String(r.category ?? ""),
    subCategory: r.sub_category ? String(r.sub_category) : null,
    amc: r.amc ? String(r.amc) : null,
    folio: r.folio ? String(r.folio) : null,
    investmentName: String(r.instrument_name ?? ""),
    investedAmount: Number(r.invested_amount ?? 0),
    currentValue: Number(r.current_value ?? 0),
  }));

  const monthly: MonthlyReturn[] = (monthlyRes.data ?? [])
    .map((r) => ({
      month: String(r.month),
      actualPct: Number(r.actual_pct ?? 0),
      expectedPct: Number(r.expected_pct ?? 0),
    }))
    .filter((m) => /^\d{4}-\d{2}$/.test(m.month));

  const categories: CategoryMeta[] = (categoriesRes.data ?? []).map((r) => ({
    category: String(r.category),
    subCategory: String(r.sub_category ?? ""),
    displayOrder: Number(r.display_order ?? 999),
    color: String(r.color ?? "#A6A6A6"),
  }));

  return assemble(holdings, monthly, categories);
}

function assemble(
  allHoldings: Holding[],
  monthly: MonthlyReturn[],
  categories: CategoryMeta[]
): Portfolio {
  const resolver = buildCategoryResolver(categories);

  // Latest month wins. Holdings with no month (legacy rows that predate the
  // column) sort last and are only used if there is nothing else.
  const months = Array.from(
    new Set(allHoldings.map((h) => h.reportMonth).filter((m) => m !== ""))
  ).sort();
  const reportMonth = months.length > 0 ? months[months.length - 1] : null;

  const holdings = reportMonth
    ? allHoldings.filter((h) => h.reportMonth === reportMonth)
    : allHoldings;

  const totals = computeTotals(holdings);
  const splits = computeSplits(holdings, resolver);
  const groups = buildCategoryGroups(holdings, resolver, totals.current);

  // Trim the returns series to the reported month.
  //
  // Holdings are filtered to reportMonth above, so `totals.current` is the value
  // AS OF that month. The monthly series was not filtered, so it could run past
  // it - and ValueChart derives its whole line by dividing totals.current by the
  // cumulative product of every month it is given. A single later month scaled
  // the entire series by that month's factor: the point for the reported month
  // rendered as current / 1.02 rather than current, so the Detailed view
  // disagreed with the Standard view's headline figure for the same month, and
  // the component's own promise to "reconcile with the headline figures" did
  // not hold.
  //
  // Trimming here rather than in the chart keeps every consumer consistent: the
  // growth charts on screen and in the PDF also stop at the month the statement
  // is actually for, instead of showing a bar for a month the holdings do not
  // cover.
  //
  // String comparison is chronologically valid for zero-padded YYYY-MM, which
  // the months sort above already relies on.
  const monthlyToDate = reportMonth
    ? monthly.filter((m) => m.month <= reportMonth)
    : monthly;

  return {
    holdings,
    totals,
    splits,
    groups,
    monthly: monthlyToDate,
    reportMonth,
    unmatchedCategories: resolver.unmatched(),
  };
}
