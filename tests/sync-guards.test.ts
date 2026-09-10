import { describe, expect, it } from "vitest";
import {
  buildReplacePlan,
  deleteSet,
  eligibleClients,
  ineligibleReasons,
  verifyDeleteSet,
  verifyNonEmpty,
  verifyPriorMonthsPreserved,
  verifyTabsReadable,
} from "@/lib/sync/guards";
import { parseClients } from "@/lib/sync/validate";
import type { ClientRow, HoldingRow } from "@/lib/sync/types";

function hold(email: string, month: string, name: string): HoldingRow {
  return {
    email,
    reportMonth: month,
    category: "Mutual Funds",
    subCategory: "Equity M.F",
    amc: null,
    folio: null,
    investmentName: name,
    investedAmount: 1000,
    currentValue: 1100,
    lastUpdated: null,
  };
}

function client(email: string, active: boolean, access: boolean): ClientRow {
  return {
    email,
    clientCode: null,
    clientName: email,
    phone: null,
    dateOfBirth: null,
    advisor: null,
    onboardingDate: null,
    active,
    portalAccess: access,
    notes: null,
  };
}

describe("replace scope narrows to (client, report_month)", () => {
  it("produces one unit per client per month, not one per client", () => {
    const plan = buildReplacePlan([
      hold("a@b.com", "2026-07", "X"),
      hold("a@b.com", "2026-07", "Y"),
      hold("a@b.com", "2026-06", "Z"),
      hold("c@d.com", "2026-07", "W"),
    ]);
    expect(plan).toHaveLength(3);
    expect(deleteSet(plan)).toEqual(
      new Set(["a@b.com|2026-07", "a@b.com|2026-06", "c@d.com|2026-07"])
    );
  });

  it("groups every holding for a month into one unit", () => {
    const plan = buildReplacePlan([
      hold("a@b.com", "2026-07", "X"),
      hold("a@b.com", "2026-07", "Y"),
    ]);
    expect(plan).toHaveLength(1);
    expect(plan[0].rows).toHaveLength(2);
  });
});

describe("delete-set assertion", () => {
  it("passes when the plan only touches months in the payload", () => {
    const payload = [hold("a@b.com", "2026-07", "X")];
    expect(verifyDeleteSet(buildReplacePlan(payload), payload).ok).toBe(true);
  });

  it("aborts if the plan would ever delete a month absent from the payload", () => {
    // Simulates a future planner bug that widens the scope.
    const payload = [hold("a@b.com", "2026-07", "X")];
    const rogue = [
      ...buildReplacePlan(payload),
      { email: "a@b.com", reportMonth: "2026-01", rows: [] },
    ];
    const result = verifyDeleteSet(rogue, payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("a@b.com|2026-01");
      expect(result.reason).toContain("delete-set assertion failed");
    }
  });
});

describe("prior months are immutable", () => {
  const existing = [
    { email: "a@b.com", reportMonth: "2026-05" },
    { email: "a@b.com", reportMonth: "2026-06" },
    { email: "a@b.com", reportMonth: "2026-07" },
  ];

  it("preserves historical months absent from the payload", () => {
    // The Sheet only sends July. May and June must survive untouched.
    const payload = [hold("a@b.com", "2026-07", "X")];
    const result = verifyPriorMonthsPreserved(buildReplacePlan(payload), existing, payload);
    expect(result.ok).toBe(true);
    expect(result.preserved).toEqual(["a@b.com|2026-05", "a@b.com|2026-06"]);
  });

  it("allows replacement WITHIN a month present in the payload", () => {
    // An edit or removal inside the current month is a correction, not history
    // loss, so it is permitted.
    const payload = [hold("a@b.com", "2026-07", "Edited")];
    expect(verifyPriorMonthsPreserved(buildReplacePlan(payload), existing, payload).ok).toBe(true);
  });

  it("aborts if a historical month is in the delete set", () => {
    const payload = [hold("a@b.com", "2026-07", "X")];
    const rogue = [
      ...buildReplacePlan(payload),
      { email: "a@b.com", reportMonth: "2026-05", rows: [] },
    ];
    // The payload only contains July, so a plan entry for May must be caught
    // even though the plan itself claims May is in scope.
    const result = verifyPriorMonthsPreserved(rogue, existing, payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("a@b.com|2026-05");
      expect(result.reason).toContain("prior-month assertion failed");
    }
  });

  it("preserves other clients' months when only one client is synced", () => {
    const payload = [hold("a@b.com", "2026-07", "X")];
    const result = verifyPriorMonthsPreserved(
      buildReplacePlan(payload),
      [...existing, { email: "other@b.com", reportMonth: "2026-07" }],
      payload
    );
    expect(result.ok).toBe(true);
    expect(result.preserved).toContain("other@b.com|2026-07");
  });
});

describe("zero-row abort guard", () => {
  it("aborts on an empty Holdings read rather than deleting everything", () => {
    const result = verifyNonEmpty("Holdings", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("zero data rows");
      expect(result.reason).toContain("Nothing was written");
    }
  });

  it("passes when there is data", () => {
    expect(verifyNonEmpty("Holdings", 1).ok).toBe(true);
  });

  it("aborts when a tab could not be read at all", () => {
    const result = verifyTabsReadable(["Categories"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Categories");
    expect(verifyTabsReadable([]).ok).toBe(true);
  });
});

describe("client eligibility is enforced server-side", () => {
  it("requires BOTH Active status and Portal Access = Yes", () => {
    const clients = [
      client("ok@b.com", true, true),
      client("inactive@b.com", false, true),
      client("noaccess@b.com", true, false),
      client("neither@b.com", false, false),
    ];
    expect(eligibleClients(clients).map((c) => c.email)).toEqual(["ok@b.com"]);
  });

  it("explains why each excluded client was excluded", () => {
    const reasons = ineligibleReasons([
      client("inactive@b.com", false, true),
      client("noaccess@b.com", true, false),
      client("neither@b.com", false, false),
    ]);
    expect(reasons.find((r) => r.email === "inactive@b.com")!.reason).toContain("not Active");
    expect(reasons.find((r) => r.email === "noaccess@b.com")!.reason).toContain("not Yes");
    expect(reasons.find((r) => r.email === "neither@b.com")!.reason).toContain("and");
  });
});

describe("test-account denylist", () => {
  const HEADER = ["Email", "Client Name", "Phone", "Date of Birth", "Advisor", "Onboarding Date", "Status", "Portal Access", "Notes"];

  it("filters the dummy account via the configurable denylist", () => {
    const rows = [
      HEADER,
      ["real@client.com", "Real Client", "", "", "", "", "Active", "Yes", ""],
      ["test@accountingseva.in", "Test Account", "", "", "", "", "Active", "Yes", ""],
    ];
    const result = parseClients(rows, new Set(["test@accountingseva.in"]));
    expect(result.valid.map((c) => c.email)).toEqual(["real@client.com"]);
    expect(result.skipped.some((s) => s.reason.includes("denylisted"))).toBe(true);
  });

  it("keeps the dummy account when the denylist is empty, so the filter is config not code", () => {
    const rows = [
      HEADER,
      ["test@accountingseva.in", "Test Account", "", "", "", "", "Active", "Yes", ""],
    ];
    expect(parseClients(rows, new Set()).valid).toHaveLength(1);
  });

  it("matches the denylist case-insensitively", () => {
    const rows = [HEADER, ["TEST@AccountingSeva.in", "T", "", "", "", "", "Active", "Yes", ""]];
    const result = parseClients(rows, new Set(["test@accountingseva.in"]));
    expect(result.valid).toHaveLength(0);
  });
});
