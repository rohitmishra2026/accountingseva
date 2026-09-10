import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";
import {
  SESSION_START_COOKIE,
  TIMEOUT_QUERY_FLAG,
  decideSessionAction,
} from "@/lib/session-timeout";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Supabase only works once both public env vars are set. On a fresh deploy
// (or a preview build) they may be missing; creating a client with empty
// credentials throws, and because this middleware runs on every request that
// would take down the marketing site too. So we degrade instead: the public
// site renders normally and the portal stays closed behind its login page.
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function portalPaths(pathname: string) {
  return {
    isPortal: pathname.startsWith("/portal"),
    // /portal/reset is a static explanation page telling a locked-out client to
    // email the team. It must stay reachable without a session, since anyone
    // who needs it is by definition unable to sign in.
    //
    // /portal/update-password is deliberately absent: that route no longer
    // exists. The portal has no self-service password reset.
    isAuthPublic:
      pathname === "/portal/login" || pathname.startsWith("/portal/reset"),
  };
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/portal/login";
  url.searchParams.set("redirectedFrom", pathname);
  return NextResponse.redirect(url);
}

/**
 * Strip every cookie that keeps a session alive, on whatever response is given.
 *
 * Clearing our own start cookie is not enough: Supabase's auth cookies would
 * still be valid, so winding a clock back would restore access. Dropping the
 * sb-* cookies is what actually signs the client out. Supabase chunks large
 * tokens across sb-<ref>-auth-token.0, .1 and so on, so this matches on prefix
 * rather than an exact name.
 *
 * Written as an explicit empty value with Max-Age 0 and an explicit path rather
 * than cookies.delete(), because delete() infers the path from the request and
 * a mismatch leaves the cookie in place - which is exactly the failure that
 * turned this into a redirect loop.
 */
function clearSessionCookies(response: NextResponse, request: NextRequest) {
  const kill = (name: string) =>
    response.cookies.set(name, "", { path: "/", maxAge: 0 });

  kill(SESSION_START_COOKIE);
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) kill(cookie.name);
  }
  return response;
}

/** Where a timed-out client is sent. */
function timeoutRedirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/portal/login";
  url.search = "";
  url.searchParams.set(TIMEOUT_QUERY_FLAG, "1");
  if (pathname !== "/portal") url.searchParams.set("redirectedFrom", pathname);
  return NextResponse.redirect(url);
}

// Refreshes the auth session on every matched request and enforces access to
// /portal/*. Unauthenticated users hitting the portal are redirected to login;
// the login page itself and password-reset routes stay public.
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { isPortal, isAuthPublic } = portalPaths(pathname);

  if (!SUPABASE_CONFIGURED) {
    if (isPortal && !isAuthPublic) {
      return redirectToLogin(request, pathname);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with Supabase. Do not trust
  // getSession() alone for auth decisions in server code. A network or config
  // failure here must not 500 the whole site, so treat it as "signed out".
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const isAuthed = Boolean(user);
  const startedAt = request.cookies.get(SESSION_START_COOKIE)?.value;

  /**
   * A start time with no session behind it is stale, and it is actively
   * misleading: the portal layout reads this cookie to decide whether to show
   * the countdown, so a leftover one put "Session ends in 6:35" on the login
   * page of a signed-out visitor. Clear it wherever it is found without a
   * session, on whatever response is going back.
   *
   * This happens whenever the Supabase cookies go away without ours going with
   * them - a refresh that fails, tokens cleared by hand, or a session that
   * ended somewhere this middleware did not run.
   */
  const dropStaleStart = (res: NextResponse) => {
    if (!isAuthed && startedAt !== undefined) {
      res.cookies.set(SESSION_START_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return res;
  };

  // One decision, made in a pure function so it can be tested across every
  // combination. See decideSessionAction for why: the first version of this
  // logic had a redirect loop that only shows up when you look at the
  // transitions together.
  const action = decideSessionAction({
    isPortal,
    isAuthPublic,
    isAuthed,
    startedAt,
  });

  if (action === "redirect-to-login") {
    return dropStaleStart(redirectToLogin(request, pathname));
  }

  if (action === "expire-and-redirect") {
    return clearSessionCookies(timeoutRedirect(request, pathname), request);
  }

  if (action === "expire-and-render") {
    // Already on the login page. Clearing and rendering here is what breaks the
    // loop: redirecting would just reload this same page with the session still
    // intact.
    return clearSessionCookies(NextResponse.next({ request }), request);
  }

  // Signed-in users shouldn't sit on the login page.
  //
  // EXCEPT when the login page is carrying an account error. requireUser()
  // sends an authenticated user with no profile row here with
  // ?error=no_profile; bouncing them straight back to /portal would make the
  // page redirect again, and the two would ping-pong forever. That produced a
  // blank, endlessly refreshing portal for any auth user whose profile had not
  // been provisioned yet. The error has to be reachable so it can be shown.
  const hasAccountError = request.nextUrl.searchParams.has("error");
  if (pathname === "/portal/login" && isAuthed && !hasAccountError) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // The ordinary path, including a signed-out visitor sitting on the login or
  // password-help page. dropStaleStart is what stops a leftover start time
  // rendering a countdown for a session that no longer exists.
  return dropStaleStart(response);
}
