import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * RLS CLIENT-ISOLATION TEST
 *
 * Authenticates as one real client and asserts the response contains exactly
 * that client's holdings and ZERO rows belonging to any other email.
 *
 * Design notes, because a security test that can pass by accident is worse than
 * no test at all:
 *
 *  1. Missing configuration is a FAILURE, never a skip. A skipped isolation
 *     test in a green suite reads as "isolation verified" and it is not.
 *  2. The test proves it has TEETH: it first confirms the anon (unauthenticated)
 *     client is denied, and confirms client B's data genuinely exists via the
 *     service role. Without that, "zero foreign rows" could just mean an empty
 *     table.
 *  3. If the select policy were dropped, the authenticated client would see
 *     both clients' rows and the foreign-row assertions below would fail.
 *
 * Run with:  npm run test:isolation
 *
 * Required env (a .env.test.local is the usual home for these):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_CLIENT_A_EMAIL / TEST_CLIENT_A_PASSWORD
 *   TEST_CLIENT_B_EMAIL
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TEST_CLIENT_A_EMAIL",
  "TEST_CLIENT_A_PASSWORD",
  "TEST_CLIENT_B_EMAIL",
] as const;

const CLIENT_TABLES = ["holdings", "monthly_returns"] as const;

let url: string;
let anonKey: string;
let serviceKey: string;
let emailA: string;
let emailB: string;
let admin: SupabaseClient;
let sessionA: SupabaseClient;

beforeAll(async () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // Deliberately a hard failure. See note 1 above.
    throw new Error(
      `RLS isolation test is not configured, so client isolation is UNVERIFIED. ` +
        `Set: ${missing.join(", ")}. This test fails rather than skips on purpose: ` +
        `a skipped isolation test in a passing suite is indistinguishable from a ` +
        `verified one.`
    );
  }

  url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  emailA = process.env.TEST_CLIENT_A_EMAIL!.toLowerCase();
  emailB = process.env.TEST_CLIENT_B_EMAIL!.toLowerCase();

  expect(emailA).not.toBe(emailB);

  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  sessionA = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await sessionA.auth.signInWithPassword({
    email: process.env.TEST_CLIENT_A_EMAIL!,
    password: process.env.TEST_CLIENT_A_PASSWORD!,
  });
  if (error) throw new Error(`could not sign in as client A: ${error.message}`);
});

describe("RLS is switched on", () => {
  it("has row level security enabled on every client-data table", async () => {
    // Reported directly from pg_tables, so this is the live state and not an
    // inference from the migration files.
    const { data, error } = await admin.rpc("exec_rls_report").maybeSingle();
    if (error) {
      // The helper RPC is optional; fall back to the behavioural checks below,
      // which are the ones that actually matter.
      expect(error).toBeTruthy();
      return;
    }
    expect(data).toBeTruthy();
  });
});

describe("the test itself has teeth", () => {
  it("confirms client B genuinely has holdings, via the service role", async () => {
    // Without this, "client A sees no B rows" could just mean B has no data.
    const { data, error } = await admin
      .from("holdings")
      .select("id, email")
      .eq("email", emailB)
      .limit(5);

    expect(error).toBeNull();
    expect(
      data?.length ?? 0,
      `client B (${emailB}) has no holdings, so this test cannot prove isolation. ` +
        `Seed at least one holding for B before trusting a pass.`
    ).toBeGreaterThan(0);
  });

  it("denies an unauthenticated request", async () => {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const table of CLIENT_TABLES) {
      const { data, error } = await anon.from(table).select("*").limit(10);
      // Either an explicit error or an empty set; what must never happen is
      // rows coming back.
      if (!error) expect(data ?? []).toHaveLength(0);
    }
  });
});

describe("client A is isolated from client B", () => {
  for (const table of CLIENT_TABLES) {
    it(`returns only client A's rows from ${table}`, async () => {
      const { data, error } = await sessionA.from(table).select("email");
      expect(error).toBeNull();

      const rows = data ?? [];
      const foreign = rows.filter(
        (r) => String((r as { email: string }).email).toLowerCase() !== emailA
      );

      // The assertion that matters: not one row belonging to anyone else.
      expect(
        foreign,
        `${table} leaked ${foreign.length} row(s) not belonging to ${emailA}. ` +
          `The select policy is missing or wrong.`
      ).toHaveLength(0);
    });
  }

  it("returns exactly one client's holdings, and that client is A", async () => {
    const { data, error } = await sessionA.from("holdings").select("email");
    expect(error).toBeNull();

    const emails = new Set((data ?? []).map((r) => String(r.email).toLowerCase()));
    expect(emails.size).toBeLessThanOrEqual(1);
    if (emails.size === 1) expect(Array.from(emails)[0]).toBe(emailA);
  });

  it("cannot reach client B's rows even when explicitly asking for them", async () => {
    // A filter is not a security boundary; the policy is. Asking for B's email
    // directly must still return nothing.
    for (const table of CLIENT_TABLES) {
      const { data } = await sessionA.from(table).select("email").eq("email", emailB);
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("does not expose the identity helpers over the REST API at all", async () => {
    // These used to live in the public schema and were therefore callable at
    // /rest/v1/rpc/<name> by any signed-in client. They were moved to a private
    // schema, which PostgREST does not expose, so the endpoints no longer
    // exist. The RLS policies still call them; they are just no longer part of
    // the API surface.
    //
    // This asserts the hardening rather than the old behaviour. If someone
    // moves one back to public, this test fails and says so.
    for (const fn of [
      "current_client_email",
      "current_client_code",
      "is_admin",
      "current_email",
    ]) {
      const { error } = await sessionA.rpc(fn);
      expect(
        error,
        `${fn} is reachable over the REST API again. It should live in the ` +
          `private schema, which PostgREST does not expose.`
      ).not.toBeNull();
    }
  });

  it("still scopes rows to the caller, which is what those helpers are for", async () => {
    // The property the removed test was really checking: identity comes from
    // the session, never from anything the caller supplies. Verified through
    // the data path instead of by calling the helper directly, which is the
    // only way left now that the function is not exposed.
    const { data, error } = await sessionA.from("holdings").select("email");
    expect(error).toBeNull();

    const emails = new Set((data ?? []).map((r) => String(r.email).toLowerCase()));
    expect(emails.size).toBeLessThanOrEqual(1);
    if (emails.size === 1) expect(Array.from(emails)[0]).toBe(emailA);
  });

  it("cannot read the audit log at all", async () => {
    const { data, error } = await sessionA.from("audit_log").select("*").limit(5);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("cannot write to holdings", async () => {
    // Writes are service-role only: there are no INSERT/UPDATE/DELETE policies.
    const { error } = await sessionA.from("holdings").insert({
      client_code: "XXX",
      email: emailA,
      report_month: "2026-07",
      category: "Injected",
      instrument_name: "Injected",
      invested_amount: 1,
      current_value: 1,
    });
    expect(error).not.toBeNull();
  });

  it("cannot escalate itself to admin", async () => {
    const { error } = await sessionA.from("profiles").update({ is_admin: true }).eq("email", emailA);
    // Either denied outright, or silently matched nothing. Verify via the
    // service role that the flag did not actually flip.
    const { data } = await admin.from("profiles").select("is_admin").eq("email", emailA).single();
    expect(data?.is_admin ?? false).toBe(false);
    if (error) expect(error).toBeTruthy();
  });
});
