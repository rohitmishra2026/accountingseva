"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { SESSION_START_COOKIE } from "@/lib/session-timeout";

export type AuthState = { error?: string; message?: string };

// Deliberately generic. Never reveal whether an email exists or which half of
// the credentials was wrong — that's an account-enumeration leak.
const GENERIC_LOGIN_ERROR =
  "We couldn't sign you in. Check your email and password and try again.";

// Shown when the deployment has no Supabase credentials set, so the form
// fails with a clear message instead of an unhandled server error.
const NOT_CONFIGURED_ERROR =
  "The client portal is not set up on this deployment yet. Please contact us and we will get you in.";

const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/*
 * NOTE: this file previously exported requestPasswordReset() and
 * updatePassword(), which sent a Supabase reset email and consumed the link.
 * Both are gone, along with /portal/update-password.
 *
 * The portal has no self-service password reset by deliberate choice: reset
 * links in email are a common account-takeover route, and with a small client
 * list the team can verify identity and set a password directly instead.
 * /portal/reset is now a page explaining that and offering a mailto.
 *
 * This also removed the unthrottled reset endpoint and the app's dependency on
 * Supabase's transactional email quota. Do not reintroduce either action
 * without reinstating the throttling and reauthentication they lacked.
 */

function clientIp(): string | null {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (!SUPABASE_CONFIGURED) {
    return { error: NOT_CONFIGURED_ERROR };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Record the failure. Without this, audit_log held nothing between an
    // attacker's first guess and the one that succeeded, so a credential-
    // stuffing run against a known client email left no trace at all.
    //
    // The email is hashed, not stored: audit_log is readable by admins, and a
    // failed-login table in clear would become a list of client addresses
    // alongside the fact that someone is targeting them. A hash still lets you
    // group attempts per account and spot a spike.
    await logAudit({
      event: "login_failed",
      ip: clientIp(),
      metadata: {
        email_sha256: createHash("sha256").update(email.toLowerCase()).digest("hex"),
        reason: error?.message ?? "no_user",
      },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await logAudit({
    event: "login",
    userId: data.user.id,
    ip: clientIp(),
    metadata: { method: "password" },
  });

  // Start the absolute 30-minute clock. Deliberately a SESSION cookie - no
  // maxAge, no expires - so closing the browser drops it too. See
  // lib/session-timeout.ts for why the deadline is tracked here rather than
  // through Supabase's own token expiry.
  cookies().set(SESSION_START_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/portal");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) {
    await logAudit({ event: "logout", userId: user.id, ip: clientIp() });
  }
  // Clear the clock too, so a stale start time cannot outlive the session it
  // belonged to and shorten the next one.
  //
  // Written as an explicit empty value with Max-Age 0 and a matching path
  // rather than cookies().delete(), for the same reason as middleware: delete()
  // infers the path, and a mismatch silently leaves the cookie in place. The
  // sign-in above sets it with path "/", so this clears it with path "/".
  cookies().set(SESSION_START_COOKIE, "", { path: "/", maxAge: 0 });
  redirect("/portal/login");
}
