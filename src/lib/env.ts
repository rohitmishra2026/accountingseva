// Centralised env access. Public vars are inlined by Next at build time.
// Server-only getters throw if read from the browser bundle, giving a loud
// failure instead of a silent undefined.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ── Public (safe in the browser) ──────────────────────────────────────────
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ── Server-only accessors ───────────────────────────────────────────────
// Guard against accidental import into a client component.
function assertServer(name: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${name} must never be read in the browser.`);
  }
}

export function getServiceRoleKey(): string {
  assertServer("SUPABASE_SERVICE_ROLE_KEY");
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getCronSecret(): string {
  assertServer("CRON_SECRET");
  return required("CRON_SECRET", process.env.CRON_SECRET);
}

/**
 * Test/dummy client accounts to exclude from a sync, as a comma-separated list
 * in TEST_CLIENT_EMAILS. The Sheet keeps a dummy row alongside real clients, so
 * the denylist is configuration rather than something hardcoded in a component:
 * it can differ between production and a preview deploy.
 *
 * Returns lowercased entries, matching how every email is normalised.
 */
export function getTestClientEmails(): Set<string> {
  const raw = process.env.TEST_CLIENT_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  );
}

export function getGoogleServiceAccount(): {
  email: string;
  privateKey: string;
  sheetId: string;
} {
  assertServer("GOOGLE_SERVICE_ACCOUNT");
  return {
    email: required("GOOGLE_SERVICE_ACCOUNT_EMAIL", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    // Dashboards store the key with literal \n; restore real newlines.
    privateKey: required("GOOGLE_PRIVATE_KEY", process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n"),
    sheetId: required("SHEET_ID", process.env.SHEET_ID),
  };
}
