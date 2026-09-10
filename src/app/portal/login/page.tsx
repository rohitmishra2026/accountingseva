import type { Metadata } from "next";
import { AuthShell } from "@/components/portal/AuthShell";
import { TIMEOUT_QUERY_FLAG } from "@/lib/session-timeout";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

// Account-level problems that requireUser() bounces back to this page. They are
// distinct from a failed sign-in: the credentials worked, the account is just
// not usable yet. Wording is deliberately non-technical and never blames the
// client.
const ACCOUNT_ERRORS: Record<string, string> = {
  no_profile:
    "Your sign-in worked, but your portal account is not fully set up yet. Please contact us and we will finish setting it up.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; timeout?: string };
}) {
  // A timed-out session is not an error and should not read like one. Without
  // this the client is silently returned to a login page having done nothing
  // wrong, which reads as the portal being broken.
  const timedOut = searchParams?.[TIMEOUT_QUERY_FLAG] === "1";

  const notice = searchParams?.error
    ? ACCOUNT_ERRORS[searchParams.error] ?? null
    : null;

  return (
    <AuthShell title="Sign in to your portal" centered>
      {timedOut && !notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-800"
        >
          You were signed out automatically. Every session ends 30 minutes after
          you sign in, whether or not you were using it, and also when you close
          your browser, so your portfolio is never left open on an unattended
          screen. Sign in again to continue.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {notice}
        </p>
      )}
      <LoginForm />

      {/* Shown only on narrow screens. On a desktop it would be telling the
          client to do the thing they are already doing. The portal works on a
          phone, but the holdings table and the charts have a lot of columns
          and read far better with the width. */}
      <p className="mt-6 text-center text-xs text-navy-500 sm:hidden">
        For the best experience, view your portfolio on a desktop.
      </p>
    </AuthShell>
  );
}
