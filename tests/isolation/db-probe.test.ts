import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// TEMPORARY diagnostic: reports the live database's readiness for the new Sheet
// schema. Prints no client PII beyond masked emails.

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const mask = (e: string | null) =>
  e ? e.replace(/^(.).*(@.*)$/, "$1***$2") : "(null)";

beforeAll(() => loadEnvLocal());

describe("live DB readiness", () => {
  it("reports schema and provisioning state", async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("\n=== MIGRATION APPLIED? ===");
    const checks: Array<[string, string]> = [
      ["profiles.email", "profiles"],
      ["categories table", "categories"],
      ["monthly_returns table", "monthly_returns"],
    ];
    for (const [label, table] of checks) {
      const col = label.includes(".") ? label.split(".")[1] : "*";
      const { error } = await admin.from(table).select(col).limit(1);
      console.log(`  ${label}: ${error ? "MISSING (" + error.message + ")" : "present"}`);
    }
    for (const col of ["report_month", "category", "sub_category", "amc", "folio"]) {
      const { error } = await admin.from("holdings").select(col).limit(1);
      console.log(`  holdings.${col}: ${error ? "MISSING" : "present"}`);
    }

    console.log("\n=== PROFILES ===");
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("client_code, full_name, is_admin");
    if (pErr) {
      console.log("  could not read profiles:", pErr.message);
    } else {
      console.log(`  ${profiles?.length ?? 0} profile row(s)`);
      for (const p of profiles ?? []) {
        console.log(`   ${p.client_code}  admin=${p.is_admin}  ${p.full_name}`);
      }
    }

    // Emails only if the column exists.
    const { data: withEmail } = await admin.from("profiles").select("client_code, email");
    if (withEmail) {
      console.log("\n=== PROFILE EMAILS ===");
      for (const p of withEmail) {
        console.log(`   ${p.client_code}: ${mask((p as { email: string | null }).email)}`);
      }
    }

    console.log("\n=== AUTH USERS vs PROFILES ===");
    // Matched on id, NOT email: requireUser() looks the profile up by
    // auth.uid(), and profiles.email may not exist yet.
    const { data: ids } = await admin.from("profiles").select("id, client_code");
    const byId = new Map((ids ?? []).map((p) => [String(p.id), String(p.client_code)]));
    const { data: userList, error: uErr } = await admin.auth.admin.listUsers();
    if (uErr) {
      console.log("  could not list auth users:", uErr.message);
    } else {
      for (const u of userList.users) {
        const code = byId.get(u.id);
        console.log(
          `   ${mask(u.email ?? null)}  profile=${code ? "YES (" + code + ")" : "NO  <-- portal shows no_profile"}`
        );
      }
    }

    console.log("\n=== HOLDINGS IN DB ===");
    const { data: h, error: hErr } = await admin.from("holdings").select("id").limit(1000);
    console.log(hErr ? `  error: ${hErr.message}` : `  ${h?.length ?? 0} row(s)`);

    expect(true).toBe(true);
  }, 60_000);
});
