// Fails the build if any server-only secret leaks into the client bundle.
// Scans .next/static (everything shipped to browsers) for the VALUES of the
// server-only env vars and for tell-tale key markers. Run after `next build`.
//
// Usage: node scripts/check-bundle-secrets.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIR = ".next/static";

// Server-only vars whose VALUES must never appear in client JS.
const SECRET_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "SHEET_ID",
];

// Literal markers that should never be in a browser bundle.
const FORBIDDEN_MARKERS = [
  "BEGIN PRIVATE KEY",
  "service_role",
  ".iam.gserviceaccount.com",
];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|cjs)$/.test(entry)) out.push(p);
  }
  return out;
}

if (!existsSync(CLIENT_DIR)) {
  console.error(`✗ ${CLIENT_DIR} not found. Run \`next build\` first.`);
  process.exit(1);
}

const secretValues = SECRET_ENV_VARS.map((name) => ({
  name,
  value: process.env[name],
})).filter((x) => x.value && x.value.length >= 8);

const files = walk(CLIENT_DIR);
const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const { name, value } of secretValues) {
    if (content.includes(value)) findings.push(`${name} value found in ${file}`);
  }
  for (const marker of FORBIDDEN_MARKERS) {
    if (content.includes(marker)) findings.push(`Forbidden marker "${marker}" in ${file}`);
  }
}

if (findings.length > 0) {
  console.error("✗ SECRET LEAK DETECTED in client bundle:");
  for (const f of findings) console.error("  - " + f);
  process.exit(1);
}

console.log(
  `✓ No secrets found in ${files.length} client bundle files ` +
    `(checked ${secretValues.length} env values + ${FORBIDDEN_MARKERS.length} markers).`
);
