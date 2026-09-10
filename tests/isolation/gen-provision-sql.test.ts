import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// Generates supabase/provision_clients.sql: one profile row per eligible client
// in the Sheet, joined to the matching Supabase auth user by email.
//
// Writes to a FILE rather than printing, so client emails are not echoed into a
// chat transcript. Review the file before running it.

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const sq = (v: string) => `'${String(v).replace(/'/g, "''")}'`;

beforeAll(() => loadEnvLocal());

describe("provisioning SQL", () => {
  it("writes profile inserts for every eligible Sheet client", async () => {
    const { readSheetTabs } = await import("@/lib/sync/sheets");
    const { parseClients } = await import("@/lib/sync/validate");
    const { eligibleClients } = await import("@/lib/sync/guards");
    const { getTestClientEmails } = await import("@/lib/env");

    const { tabs } = await readSheetTabs();
    const parsed = parseClients(tabs.clients, getTestClientEmails());
    const allowed = eligibleClients(parsed.valid);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: userList, error } = await admin.auth.admin.listUsers();
    if (error) throw new Error("listUsers: " + error.message);

    const idByEmail = new Map(
      userList.users.map((u) => [(u.email ?? "").toLowerCase(), u.id])
    );

    const lines: string[] = [
      "-- ─────────────────────────────────────────────────────────────────────",
      "-- provision_clients.sql   (GENERATED — review before running)",
      "--",
      "-- One profiles row per client the Sheet marks Active + Portal Access = Yes,",
      "-- joined to the matching Supabase auth user by email.",
      "--",
      "-- RUN ORDER:",
      "--   1. supabase/migrations/20240102000000_sheet_schema_v2.sql   (adds profiles.email)",
      "--   2. THIS FILE",
      "--   3. the sync (/api/sync, or the admin Sheet Sync page)",
      "--",
      "-- Without step 1 this fails: profiles.email does not exist yet.",
      "-- ─────────────────────────────────────────────────────────────────────",
      "",
    ];

    let n = 0;
    const missing: string[] = [];
    const noCode: string[] = [];

    for (const c of allowed) {
      const id = idByEmail.get(c.email);
      if (!id) {
        missing.push(c.email);
        continue;
      }
      // The Sheet's CLIENT CODE is authoritative. Only fall back to a generated
      // code if the column is blank for this row, and say so loudly, because a
      // generated code will not match what the firm uses.
      let code = (c.clientCode ?? "").trim();
      if (code === "") {
        code = `GEN${String(n + 1).padStart(4, "0")}`;
        noCode.push(c.email);
      }
      n += 1;
      lines.push(
        `insert into public.profiles (id, client_code, full_name, phone, email, is_admin)`,
        `values (${sq(id)}, ${sq(code)}, ${sq(c.clientName)}, ${c.phone ? sq(c.phone) : "null"}, ${sq(c.email)}, false)`,
        `on conflict (id) do update set`,
        `  full_name = excluded.full_name,`,
        `  email     = excluded.email,`,
        `  phone     = coalesce(excluded.phone, profiles.phone);`,
        ""
      );
    }

    if (noCode.length > 0) {
      lines.push("-- ⚠ These Sheet rows had a blank CLIENT CODE; a GENxxxx code was");
      lines.push("--   invented and will NOT match the firm's own numbering. Fill the");
      lines.push("--   Sheet column in and re-generate:");
      for (const m of noCode) lines.push(`--     ${m}`);
      lines.push("");
    }

    if (missing.length > 0) {
      lines.push("-- ⚠ No Supabase auth user exists for these Sheet clients.");
      lines.push("--   Create the auth user first, then re-generate this file:");
      for (const m of missing) lines.push(`--     ${m}`);
      lines.push("");
    }

    lines.push(
      "-- Sanity check: every auth user should now resolve to exactly one profile.",
      "select u.email, p.client_code",
      "  from auth.users u left join public.profiles p on p.id = u.id",
      " order by p.client_code nulls first;",
      ""
    );

    writeFileSync("supabase/provision_clients.sql", lines.join("\n"));

    console.log(
      `\nWrote supabase/provision_clients.sql: ${n} profile insert(s), ` +
        `${missing.length} Sheet client(s) with no auth user.`
    );
    console.log(
      `Codes taken from the Sheet: ${n - noCode.length}; generated fallbacks: ${noCode.length}`
    );

    expect(n + missing.length).toBe(allowed.length);
  }, 60_000);
});
