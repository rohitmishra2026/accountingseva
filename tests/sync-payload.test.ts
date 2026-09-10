import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HOLDING_PAYLOAD_KEYS,
  MONTHLY_PAYLOAD_KEYS,
  toHoldingPayload,
  toMonthlyPayload,
} from "@/lib/sync/payload";

// The sync hands rows to a Postgres function as JSON, and the function pulls
// each value out with `r->>'<key>'`. A key that does not match arrives as NULL
// and the insert fails on a NOT NULL column — which is exactly how
// `investment_name` vs `instrument_name` got through code review, a passing
// type-check and a clean build, only to fail on the first real sync.
//
// TypeScript cannot catch this: the boundary is a JSON blob and a SQL string.
// So the contract is asserted by reading the migration and comparing key sets.

const MIGRATION = "supabase/migrations/20240102000000_sheet_schema_v2.sql";

/** Every `r->>'key'` the given SQL function body reads. */
function keysReadBy(sql: string, functionName: string): Set<string> {
  const start = sql.indexOf(`function public.${functionName}`);
  expect(start, `${functionName} not found in the migration`).toBeGreaterThan(-1);
  // Function bodies are dollar-quoted; take up to the closing $$.
  const bodyStart = sql.indexOf("$$", start);
  const bodyEnd = sql.indexOf("$$", bodyStart + 2);
  const body = sql.slice(bodyStart, bodyEnd);

  const keys = new Set<string>();
  for (const m of body.matchAll(/r->>'([a-z_]+)'/g)) keys.add(m[1]);
  return keys;
}

describe("holdings replace payload matches the SQL function", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("sends exactly the keys replace_holdings_for_month() reads", () => {
    const sqlKeys = keysReadBy(sql, "replace_holdings_for_month");
    expect(sqlKeys.size).toBeGreaterThan(0);

    const sent = new Set(Object.keys(toHoldingPayload(sampleRow(), "AS0002")));

    const missing = [...sqlKeys].filter((k) => !sent.has(k)).sort();
    const extra = [...sent].filter((k) => !sqlKeys.has(k)).sort();

    expect(
      missing,
      `the SQL function reads these keys but the sync never sends them, so they ` +
        `arrive NULL: ${missing.join(", ")}`
    ).toEqual([]);
    expect(
      extra,
      `the sync sends these keys but the SQL function ignores them: ${extra.join(", ")}`
    ).toEqual([]);
  });

  it("keeps the declared key list in step with what is actually sent", () => {
    const sent = Object.keys(toHoldingPayload(sampleRow(), "AS0002")).sort();
    expect(sent).toEqual([...HOLDING_PAYLOAD_KEYS].sort());
  });

  it("uses instrument_name, the real column, not investment_name", () => {
    const payload = toHoldingPayload(sampleRow(), "AS0002");
    expect(payload.instrument_name).toBe("SBI Consumption");
    expect(payload).not.toHaveProperty("investment_name");
  });

  it("never sends null for a NOT NULL column", () => {
    const payload = toHoldingPayload(sampleRow(), "AS0002");
    for (const col of ["client_code", "instrument_name", "invested_amount", "current_value"]) {
      expect(payload[col], `${col} is NOT NULL in the schema`).not.toBeNull();
      expect(payload[col]).not.toBeUndefined();
    }
  });

  it("passes blanks as empty strings, which the function turns back into NULL", () => {
    // The function wraps optional fields in nullif(..., ''), so "" is correct
    // here and an actual null would break the ::numeric / ::timestamptz casts.
    const payload = toHoldingPayload(
      { ...sampleRow(), subCategory: null, amc: null, folio: null, lastUpdated: null },
      "AS0002"
    );
    expect(payload.sub_category).toBe("");
    expect(payload.amc).toBe("");
    expect(payload.folio).toBe("");
    expect(payload.last_updated).toBe("");
  });

  it("preserves a loss at full precision", () => {
    const payload = toHoldingPayload(sampleRow(), "AS0002");
    expect(payload.invested_amount).toBe(50000);
    expect(payload.current_value).toBe(44394);
  });
});

describe("monthly returns payload matches the SQL function", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("reads only keys the sync actually sends", () => {
    const sqlKeys = keysReadBy(sql, "replace_monthly_returns");
    // Mirrors the object built in run.ts for replace_monthly_returns.
    const sent = new Set(
      Object.keys(
        toMonthlyPayload({ month: "2026-07", actualPct: 1.4, expectedPct: 0.9, portfolioValue: 1 })
      )
    );
    expect([...sent].sort()).toEqual([...MONTHLY_PAYLOAD_KEYS].sort());
    const missing = [...sqlKeys].filter((k) => !sent.has(k)).sort();
    expect(missing, `arrive NULL: ${missing.join(", ")}`).toEqual([]);
  });
});

function sampleRow() {
  return {
    category: "Mutual Funds",
    subCategory: "Equity M.F" as string | null,
    amc: "SBI MF" as string | null,
    folio: "78901234" as string | null,
    investmentName: "SBI Consumption",
    investedAmount: 50000,
    currentValue: 44394,
    lastUpdated: "2026-07-13T00:00:00.000Z" as string | null,
  };
}
