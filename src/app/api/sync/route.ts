import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { runSync } from "@/lib/sync/run";

// Node runtime: googleapis + service role client are not Edge-compatible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Accepts the secret via EITHER:
//   - x-cron-secret: <CRON_SECRET>            (per the build spec)
//   - Authorization: Bearer <CRON_SECRET>     (what Vercel Cron sends natively)
// Anything else is rejected with 401. Uses a constant-time-ish compare.
function isAuthorized(req: NextRequest): boolean {
  let secret: string;
  try {
    secret = getCronSecret();
  } catch {
    return false;
  }
  const headerSecret = req.headers.get("x-cron-secret");
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = headerSecret ?? bearer ?? "";
  return provided.length > 0 && safeEqual(provided, secret);
}

/**
 * Constant-time secret comparison.
 *
 * The previous hand-rolled version returned early when the two strings differed
 * in length, so response timing distinguished a wrong-length guess from a
 * right-length one and leaked the secret's length. Hashing both sides to a
 * fixed 32 bytes first removes that oracle entirely - every comparison is over
 * the same width regardless of input - and timingSafeEqual is the real
 * primitive rather than a loop the JIT is free to optimise.
 *
 * Behaviour is unchanged: equal inputs still compare equal, unequal still
 * unequal. Only the timing profile and the primitive differ.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    // Record the rejection. Previously a failed attempt returned a bare 401 and
    // wrote nothing, so someone guessing at the secret that guards the
    // RLS-bypassing write path left no trace whatsoever: audit_log would show
    // sync_run and sync_error rows and nothing at all about the attempts in
    // between. Best-effort, and logAudit never throws into the caller, so this
    // cannot turn a 401 into a 500.
    const fwd = req.headers.get("x-forwarded-for");
    await logAudit({
      event: "sync_auth_failed",
      ip: fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip"),
      metadata: {
        method: req.method,
        presented: req.headers.get("x-cron-secret")
          ? "x-cron-secret"
          : req.headers.get("authorization")
            ? "authorization"
            : "none",
      },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSync("cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// Vercel Cron issues a GET. Allow POST too for manual/curl triggering.
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
