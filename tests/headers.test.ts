import { describe, expect, it } from "vitest";
import { buildColumnMap, cell, columnLetter, normaliseHeader } from "@/lib/sync/headers";
import { parseClients, parseHoldings } from "@/lib/sync/validate";

// The Holdings tab's real header row. Column A is headed "a", not "Email".
const HOLDINGS_HEADER = [
  "a",
  "Report Month",
  "Category",
  "Sub Category",
  "AMC",
  "Folio",
  "Investment Name",
  "Invested Amount",
  "Current Value",
  "Last Updated",
];

describe("normaliseHeader", () => {
  it("lowercases, trims and strips punctuation", () => {
    expect(normaliseHeader("  Actual Return %  ")).toBe("actual return");
    expect(normaliseHeader("Sub_Category")).toBe("sub category");
    expect(normaliseHeader("Folio No.")).toBe("folio no");
  });
});

describe("buildColumnMap", () => {
  it('maps the known-bad "a" header to email', () => {
    const { map, warnings } = buildColumnMap("Holdings", HOLDINGS_HEADER);
    expect(map.email).toBe(0);
    // "a" is a deliberate alias, so it must NOT be reported as unknown.
    expect(warnings.filter((w) => w.reason.includes('"a"'))).toHaveLength(0);
  });

  it("maps every column of the real Holdings header", () => {
    const { map } = buildColumnMap("Holdings", HOLDINGS_HEADER);
    expect(map).toMatchObject({
      email: 0,
      reportMonth: 1,
      category: 2,
      subCategory: 3,
      amc: 4,
      folio: 5,
      investmentName: 6,
      investedAmount: 7,
      currentValue: 8,
      lastUpdated: 9,
    });
  });

  it("survives reordered columns, because it maps by name not index", () => {
    const shuffled = ["Investment Name", "a", "Current Value", "Invested Amount", "Report Month"];
    const { map } = buildColumnMap("Holdings", shuffled);
    expect(map.investmentName).toBe(0);
    expect(map.email).toBe(1);
    expect(map.currentValue).toBe(2);
  });

  it("warns about an unknown header and ignores it, never throwing", () => {
    const { map, warnings } = buildColumnMap("Holdings", [
      ...HOLDINGS_HEADER,
      "Some New Column Rohit Added",
    ]);
    expect(map.email).toBe(0); // the known columns still resolve
    expect(warnings.some((w) => w.reason.includes("Some New Column"))).toBe(true);
    expect(warnings.some((w) => w.reason.includes("ignored"))).toBe(true);
  });

  it("keeps the first of a duplicated header and says so", () => {
    const { map, warnings } = buildColumnMap("Holdings", ["a", "Category", "Category"]);
    expect(map.category).toBe(1);
    expect(warnings.some((w) => w.reason.includes("duplicate"))).toBe(true);
  });

  it('resolves "Month" per tab: reportMonth on Holdings, month elsewhere', () => {
    expect(buildColumnMap("Holdings", ["Month"]).map.reportMonth).toBe(0);
    expect(buildColumnMap("Monthly Returns", ["Month"]).map.month).toBe(0);
  });

  it("warns rather than throwing on a missing header row", () => {
    const { map, warnings } = buildColumnMap("Holdings", undefined);
    expect(map).toEqual({});
    expect(warnings).toHaveLength(1);
  });
});

describe("cell", () => {
  it("returns an empty string for absent columns and blank cells", () => {
    const { map } = buildColumnMap("Holdings", HOLDINGS_HEADER);
    expect(cell(["a@b.com"], map, "amc")).toBe("");
    expect(cell([], map, "email")).toBe("");
  });

  it("stringifies numeric cells so the parsers can read them", () => {
    const { map } = buildColumnMap("Holdings", HOLDINGS_HEADER);
    const row = ["a@b.com", 45870, "", "", "", "", "X", 1000, 900, ""];
    expect(cell(row, map, "reportMonth")).toBe("45870");
    expect(cell(row, map, "investedAmount")).toBe("1000");
  });
});

describe("columnLetter", () => {
  it("names columns the way the Sheet does", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
  });
});

describe("parseHoldings against the real header", () => {
  it("ingests a normal row", () => {
    const result = parseHoldings([
      HOLDINGS_HEADER,
      [
        "Ravi@Example.com",
        "2026-07",
        "Mutual Funds",
        "Equity M.F",
        "PPFAS",
        "12345678",
        "Parag Parikh Flexi Cap",
        "10,00,000",
        "12,00,000",
        "13/07/2026",
      ],
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      email: "ravi@example.com", // lowercased on the write path
      reportMonth: "2026-07",
      category: "Mutual Funds",
      subCategory: "Equity M.F",
      investedAmount: 1_000_000,
      currentValue: 1_200_000,
    });
  });

  it("keeps a losing holding", () => {
    const result = parseHoldings([
      HOLDINGS_HEADER,
      ["a@b.com", "2026-07", "Mutual Funds", "Equity M.F", "", "", "SBI Consumption", "50000", "44394", ""],
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].currentValue).toBe(44394);
  });

  it("drops sub-category grouping rows instead of emitting them as holdings", () => {
    const result = parseHoldings([
      HOLDINGS_HEADER,
      // This is what the Sheet actually contains: label in the name column,
      // "0" in category, zeros for the amounts.
      ["a@b.com", "2026-07", "0", "", "", "", "Equity M.F", "0", "0", ""],
      ["a@b.com", "2026-07", "Mutual Funds", "Equity M.F", "", "", "Real Fund", "1000", "1100", ""],
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].investmentName).toBe("Real Fund");
    expect(result.skipped.some((s) => s.reason.includes("grouping row"))).toBe(true);
  });

  it("keeps a row whose category is blank, and warns", () => {
    // Never drop a holding for a missing category: it falls back downstream.
    const result = parseHoldings([
      HOLDINGS_HEADER,
      ["a@b.com", "2026-07", "", "", "", "", "Mystery Bond", "1000", "1100", ""],
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.warnings.some((w) => w.reason.includes("no category"))).toBe(true);
  });

  it("skips one bad row without losing the good ones", () => {
    const result = parseHoldings([
      HOLDINGS_HEADER,
      ["a@b.com", "not a month", "MF", "", "", "", "Bad Row", "1000", "1100", ""],
      ["a@b.com", "2026-07", "MF", "", "", "", "Good Row", "1000", "1100", ""],
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].investmentName).toBe("Good Row");
    expect(result.skipped).toHaveLength(1);
  });
});

// The Clients tab gained a CLIENT CODE column in position A, pushing Email to B.
// Because columns are located by header name, that shift needs no code change —
// this pins the behaviour so a future reorder cannot silently break it.
const CLIENTS_HEADER_WITH_CODE = [
  "CLIENT CODE",
  "Email",
  "Client Name",
  "Phone",
  "Date of Birth",
  "Advisor",
  "Onboarding Date",
  "Status",
  "Portal Access",
  "Notes",
];

describe("Clients tab with a CLIENT CODE column", () => {
  it("maps client code to A and email to B, not by fixed index", () => {
    const { map, warnings } = buildColumnMap("Clients", CLIENTS_HEADER_WITH_CODE);
    expect(map.clientCode).toBe(0);
    expect(map.email).toBe(1);
    expect(map.status).toBe(7);
    expect(map.portalAccess).toBe(8);
    // A recognised column must never be reported as unknown.
    expect(warnings.filter((w) => w.reason.includes("CLIENT CODE"))).toHaveLength(0);
  });

  it("accepts the CLIENT ID spelling too", () => {
    expect(buildColumnMap("Clients", ["Client ID"]).map.clientCode).toBe(0);
    expect(buildColumnMap("Clients", ["client_code"]).map.clientCode).toBe(0);
  });

  it("carries the Sheet's client code onto the parsed row", () => {
    const result = parseClients(
      [
        CLIENTS_HEADER_WITH_CODE,
        ["AS0002", "Ravi@Example.com", "Ravi Naik", "9800000000", "", "", "", "Active", "Yes", ""],
      ],
      new Set()
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      clientCode: "AS0002",
      email: "ravi@example.com",
      active: true,
      portalAccess: true,
    });
  });

  it("still parses when the client code column is absent", () => {
    // The column is new; the sync must not require it.
    const result = parseClients(
      [
        ["Email", "Client Name", "Status", "Portal Access"],
        ["a@b.com", "A B", "Active", "Yes"],
      ],
      new Set()
    );
    expect(result.valid[0].clientCode).toBeNull();
    expect(result.valid[0].portalAccess).toBe(true);
  });

  it("still applies the denylist with the code column present", () => {
    const result = parseClients(
      [
        CLIENTS_HEADER_WITH_CODE,
        ["AS0001", "test@accountingseva.in", "Dr. Shailesh Kamat", "", "", "", "", "Active", "Yes", ""],
      ],
      new Set(["test@accountingseva.in"])
    );
    expect(result.valid).toHaveLength(0);
    expect(result.skipped[0].reason).toContain("denylisted");
  });
});

describe("a renamed Holdings email column", () => {
  it('accepts "client mail" (with the trailing space the Sheet has)', () => {
    const header = ["client mail ", ...HOLDINGS_HEADER.slice(1)];
    const { map, warnings } = buildColumnMap("Holdings", header);
    expect(map.email).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it("still accepts the original bare \"a\"", () => {
    expect(buildColumnMap("Holdings", HOLDINGS_HEADER).map.email).toBe(0);
  });

  it("reports a FATAL reason naming the column when email cannot be found", () => {
    // Renaming this column previously took the tab silently to zero rows, which
    // then surfaced as a misleading "zero data rows" abort.
    const header = ["something nobody aliased", ...HOLDINGS_HEADER.slice(1)];
    const result = parseHoldings([
      header,
      ["a@b.com", "2026-07", "MF", "", "", "", "X", "1000", "1100", ""],
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.fatal).toBeTruthy();
    expect(result.fatal).toContain("email");
    // The header row is echoed so the offending Sheet edit is obvious.
    expect(result.fatal).toContain("something nobody aliased");
  });

  it("has no fatal reason when the header is fine", () => {
    const result = parseHoldings([
      HOLDINGS_HEADER,
      ["a@b.com", "2026-07", "MF", "", "", "", "X", "1000", "1100", ""],
    ]);
    expect(result.fatal).toBeUndefined();
    expect(result.valid).toHaveLength(1);
  });
});
