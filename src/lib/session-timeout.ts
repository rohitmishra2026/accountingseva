/**
 * Absolute portal session lifetime.
 *
 * A session ends 30 minutes after sign-in, full stop. Activity does not extend
 * it: a client who is mid-scroll at 30 minutes is signed out the same as one
 * who walked away at minute two. That is deliberate, not an oversight.
 *
 * HOW IT IS ENFORCED
 * On sign-in we set one cookie holding the sign-in time. Middleware reads it on
 * every /portal request and, once the deadline has passed, clears the Supabase
 * session and redirects to login. Because the check happens on the server, a
 * client cannot extend the session by editing anything in their browser: the
 * worst they can do by deleting the cookie is sign themselves out sooner.
 *
 * WHY A SEPARATE COOKIE RATHER THAN SUPABASE'S OWN EXPIRY
 * Supabase refreshes its access token automatically, which is what keeps a
 * normal session alive for days. Fighting that by disabling refresh would break
 * the session in less obvious ways. Tracking sign-in time ourselves leaves
 * Supabase's machinery untouched and puts the deadline somewhere we control.
 *
 * BROWSER CLOSE
 * This is a session cookie: no Max-Age, no Expires. Closing the browser drops
 * it, so the next visit starts at the login page even if the 30 minutes had not
 * run out. Note this is browser close, not tab close - no cookie can detect a
 * single tab closing, and the JavaScript events that come closest also fire on
 * tab switches and mobile backgrounding, which would sign people out constantly
 * for no reason. The 30 minute rule covers the closed-tab case anyway, since
 * the clock keeps running while the tab is shut.
 */

/** Sign-in time, as epoch milliseconds. Session cookie: dies on browser close. */
export const SESSION_START_COOKIE = "as_session_start";

/** 30 minutes, in milliseconds. */
export const SESSION_MAX_AGE_MS = 30 * 60 * 1000;

/** Query flag the login page reads to explain why the client landed there. */
export const TIMEOUT_QUERY_FLAG = "timeout";

/**
 * Has this session outlived its deadline?
 *
 * An absent or unparseable cookie counts as expired. Failing closed matters:
 * the alternative is that deleting one cookie grants an unlimited session.
 */
export function isSessionExpired(
  rawStartedAt: string | undefined,
  now: number = Date.now()
): boolean {
  if (!rawStartedAt) return true;
  const startedAt = Number(rawStartedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return true;
  // A start time in the future means a tampered or clock-skewed cookie. Treat
  // it as expired rather than honouring a deadline that never arrives.
  if (startedAt > now) return true;
  return now - startedAt >= SESSION_MAX_AGE_MS;
}

/**
 * What middleware should do with a portal request, given the session state.
 *
 * Extracted as a pure function because the first version of this logic
 * contained a redirect loop that no amount of reading caught: a timed-out
 * client was redirected to the login page, the deadline was not evaluated
 * there, so nothing cleared the cookies, and the "signed-in users shouldn't sit
 * on the login page" rule bounced them straight back. The page refreshed
 * forever and the client was never signed out.
 *
 * The loop is only visible when you look at the transitions together, which is
 * what the tests for this function do.
 */
export type SessionAction =
  /** Nothing to do; carry on with the normal response. */
  | "continue"
  /** Not signed in and this page needs a session. */
  | "redirect-to-login"
  /** Deadline passed: clear cookies and redirect to the login page. */
  | "expire-and-redirect"
  /** Deadline passed but already ON the login page: clear cookies and RENDER. */
  | "expire-and-render";

export function decideSessionAction(input: {
  isPortal: boolean;
  isAuthPublic: boolean;
  isAuthed: boolean;
  startedAt: string | undefined;
  now?: number;
}): SessionAction {
  const { isPortal, isAuthPublic, isAuthed, startedAt, now } = input;

  if (!isPortal) return "continue";

  // Not signed in: a page needing a session sends them to login. Checked before
  // the deadline so a signed-out visitor never sees "your session expired".
  if (!isAuthed) return isAuthPublic ? "continue" : "redirect-to-login";

  if (!isSessionExpired(startedAt, now)) return "continue";

  // Expired. Redirecting to the login page from the login page is the loop, so
  // there the session is cleared in place and the page renders.
  return isAuthPublic ? "expire-and-render" : "expire-and-redirect";
}

/** Milliseconds left, floored at zero. Used to schedule the client-side sign-out. */
export function millisecondsRemaining(
  rawStartedAt: string | undefined,
  now: number = Date.now()
): number {
  if (!rawStartedAt) return 0;
  const startedAt = Number(rawStartedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0 || startedAt > now) return 0;
  return Math.max(0, startedAt + SESSION_MAX_AGE_MS - now);
}
