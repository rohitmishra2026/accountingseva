import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

beforeAll(() => loadEnvLocal());

describe("post-sync verification", () => {
  it("reconciles the Sheet against the database", async () => {
    const { readSheetTabs } = await import("@/lib/sync/sheets");
    const { parseHoldings, parseMonthlyReturns } = await import("@/lib/sync/validate");
    const { tabs } = await readSheetTabs();
    const sheetH = parseHoldings(tabs.holdings).valid;
    const sheetM = parseMonthlyReturns(tabs.monthlyReturns).valid;

    const byEmail = (rows: { email: string }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.email, (m.get(r.email) ?? 0) + 1);
      return m;
    };

    console.log("\n=== SHEET: holdings per email ===");
    for (const [e, n] of [...byEmail(sheetH)].sort()) console.log(`  ${mask(e)}: ${n}`);
    console.log("=== SHEET: monthly returns per email ===");
    for (const [e, n] of [...byEmail(sheetM)].sort()) console.log(`  ${mask(e)}: ${n}`);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: dbH } = await admin.from("holdings").select("email, report_month, instrument_name, category, invested_amount, current_value");
    const { data: dbM } = await admin.from("monthly_returns").select("email, month");
    const { data: dbC } = await admin.from("categories").select("category, sub_category, display_order, color");

    console.log("\n=== DB: holdings per email ===");
    for (const [e, n] of [...byEmail((dbH ?? []) as { email: string }[])].sort()) console.log(`  ${mask(e ?? "(null)")}: ${n}`);
    console.log(`=== DB: monthly_returns rows: ${dbM?.length ?? 0} ===`);
    console.log(`=== DB: categories rows: ${dbC?.length ?? 0} ===`);

    const losses = (dbH ?? []).filter((h) => Number(h.current_value) < Number(h.invested_amount));
    console.log(`=== DB: losing holdings: ${losses.length} ===`);
    console.log("=== DB: report months:", JSON.stringify([...new Set((dbH ?? []).map((h) => h.report_month))].sort()));
    console.log("=== DB: null category/email rows (would be hidden by RLS):",
      (dbH ?? []).filter((h) => !h.email || !h.category).length);
    expect(dbC?.length ?? 0).toBeGreaterThan(0);
  }, 60_000);
});
