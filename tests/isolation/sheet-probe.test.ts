import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

// TEMPORARY diagnostic: reads the real Sheet with the real service account and
// reports what the ingestion layer makes of it. Deliberately prints NO client
// PII: header rows, counts, category names and months only.

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

beforeAll(() => loadEnvLocal());

describe("real Sheet ingestion probe", () => {
  it("reads all four tabs and parses them", async () => {
    const { readSheetTabs } = await import("@/lib/sync/sheets");
    const {
      parseCategories,
      parseClients,
      parseHoldings,
      parseMonthlyReturns,
      dedupeHoldings,
    } = await import("@/lib/sync/validate");
    const { buildColumnMap } = await import("@/lib/sync/headers");

    const { tabs, unreadable } = await readSheetTabs();
    console.log("\n=== TAB READ ===");
    console.log("unreadable tabs:", unreadable.length ? unreadable.join(", ") : "(none)");
    for (const [name, rows] of Object.entries(tabs)) {
      console.log(`${name}: ${rows.length} rows (incl. header)`);
    }

    console.log("\n=== HEADER ROWS (verbatim) ===");
    console.log("Clients        :", JSON.stringify(tabs.clients[0] ?? null));
    console.log("Holdings       :", JSON.stringify(tabs.holdings[0] ?? null));
    console.log("Monthly Returns:", JSON.stringify(tabs.monthlyReturns[0] ?? null));
    console.log("Categories     :", JSON.stringify(tabs.categories[0] ?? null));

    console.log("\n=== HEADER RESOLUTION ===");
    for (const [tab, rows] of [
      ["Clients", tabs.clients],
      ["Holdings", tabs.holdings],
      ["Monthly Returns", tabs.monthlyReturns],
      ["Categories", tabs.categories],
    ] as const) {
      const { map, warnings } = buildColumnMap(tab, rows[0]);
      console.log(`${tab}: mapped ${Object.keys(map).length} columns ->`, JSON.stringify(map));
      for (const w of warnings) console.log(`  WARN ${w.reason}`);
    }

    const clients = parseClients(tabs.clients, new Set(["test@accountingseva.in"]));
    const holdings = parseHoldings(tabs.holdings);
    const monthly = parseMonthlyReturns(tabs.monthlyReturns);
    const categories = parseCategories(tabs.categories);
    const deduped = dedupeHoldings(holdings.valid);

    console.log("\n=== PARSE RESULTS ===");
    console.log(
      `Clients : ${clients.valid.length} valid, ${clients.skipped.length} skipped, ${clients.warnings.length} warnings`
    );
    console.log(
      `Holdings: ${holdings.valid.length} valid (${deduped.rows.length} after dedupe), ${holdings.skipped.length} skipped, ${holdings.warnings.length} warnings`
    );
    console.log(
      `Monthly : ${monthly.valid.length} valid, ${monthly.skipped.length} skipped, ${monthly.warnings.length} warnings`
    );
    console.log(
      `Categories: ${categories.valid.length} valid, ${categories.skipped.length} skipped`
    );

    console.log("\n=== CLIENT ELIGIBILITY (emails masked) ===");
    for (const c of clients.valid) {
      const masked = c.email.replace(/^(.).*(@.*)$/, "$1***$2");
      console.log(`  ${masked}: active=${c.active} portalAccess=${c.portalAccess}`);
    }

    console.log("\n=== CATEGORIES FROM SHEET ===");
    for (const c of categories.valid) {
      console.log(
        `  ${c.displayOrder}. ${c.category}${c.subCategory ? " / " + c.subCategory : ""}  ${c.color}`
      );
    }

    console.log("\n=== HOLDINGS SHAPE ===");
    console.log("report months:", JSON.stringify([...new Set(deduped.rows.map((h) => h.reportMonth))].sort()));
    console.log("categories used:", JSON.stringify([...new Set(deduped.rows.map((h) => h.category))]));
    const losses = deduped.rows.filter((h) => h.currentValue < h.investedAmount);
    console.log(`losing holdings: ${losses.length}`);
    console.log("monthly months:", JSON.stringify([...new Set(monthly.valid.map((m) => m.month))].sort()));

    console.log("\n=== SKIPPED (first 20) ===");
    for (const s of [...clients.skipped, ...holdings.skipped, ...monthly.skipped, ...categories.skipped].slice(0, 20)) {
      console.log(`  ${s.tab} row ${s.row}: ${s.reason}`);
    }

    console.log("\n=== WARNINGS (first 20) ===");
    for (const w of [...clients.warnings, ...holdings.warnings, ...monthly.warnings, ...categories.warnings, ...deduped.warnings].slice(0, 20)) {
      console.log(`  ${w.tab}: ${w.reason}`);
    }

    expect(unreadable).toEqual([]);
  }, 60_000);
});
