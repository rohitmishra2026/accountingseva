import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_MS,
  decideSessionAction,
  isSessionExpired,
  millisecondsRemaining,
} from "@/lib/session-timeout";

// This logic decides whether a client stays signed in, so the cases that matter
// are the malformed ones: anything that returns "not expired" for input an
// attacker controls is a way to hold a session open indefinitely.

const NOW = 1_800_000_000_000; // fixed clock, so nothing here is time-dependent

describe("session deadline", () => {
  it("is 30 minutes", () => {
    expect(SESSION_MAX_AGE_MS).toBe(30 * 60 * 1000);
  });

  it("allows a session just inside the window", () => {
    const startedAt = NOW - (SESSION_MAX_AGE_MS - 1_000);
    expect(isSessionExpired(String(startedAt), NOW)).toBe(false);
  });

  it("expires exactly on the boundary", () => {
    const startedAt = NOW - SESSION_MAX_AGE_MS;
    expect(isSessionExpired(String(startedAt), NOW)).toBe(true);
  });

  it("expires past the boundary", () => {
    expect(isSessionExpired(String(NOW - SESSION_MAX_AGE_MS - 1), NOW)).toBe(true);
  });

  it("does not extend with activity: a fresh check on an old session still expires", () => {
    const startedAt = NOW - SESSION_MAX_AGE_MS * 3;
    // Called repeatedly, as it is on every request. Must never reset.
    expect(isSessionExpired(String(startedAt), NOW)).toBe(true);
    expect(isSessionExpired(String(startedAt), NOW + 1_000)).toBe(true);
  });
});

describe("malformed cookies fail closed", () => {
  const bad = [
    ["missing", undefined],
    ["empty", ""],
    ["not a number", "abc"],
    ["zero", "0"],
    ["negative", "-1"],
    ["NaN literal", "NaN"],
    ["Infinity", "Infinity"],
    ["whitespace", "   "],
    ["injection-ish", "1;drop"],
  ] as const;

  for (const [label, value] of bad) {
    it(`treats ${label} as expired`, () => {
      expect(isSessionExpired(value as string | undefined, NOW)).toBe(true);
    });
  }

  it("treats a future start time as expired rather than granting a longer session", () => {
    // A tampered cookie set far ahead would otherwise never reach its deadline.
    expect(isSessionExpired(String(NOW + 60_000), NOW)).toBe(true);
    expect(isSessionExpired(String(NOW + SESSION_MAX_AGE_MS * 100), NOW)).toBe(true);
  });
});

describe("millisecondsRemaining", () => {
  it("counts down from the deadline", () => {
    // Expressed against SESSION_MAX_AGE_MS rather than a literal, so changing
    // the session length does not silently leave this asserting the old one.
    const elapsed = 5 * 60 * 1000;
    const startedAt = NOW - elapsed;
    expect(millisecondsRemaining(String(startedAt), NOW)).toBe(
      SESSION_MAX_AGE_MS - elapsed
    );
  });

  it("is zero for an expired session, never negative", () => {
    expect(millisecondsRemaining(String(NOW - SESSION_MAX_AGE_MS * 2), NOW)).toBe(0);
  });

  it("is zero when there is no cookie, so the countdown never renders", () => {
    // The portal layout wraps the login page too. A non-zero value here would
    // put a countdown on a page nobody is signed in to.
    expect(millisecondsRemaining(undefined, NOW)).toBe(0);
    expect(millisecondsRemaining("", NOW)).toBe(0);
  });

  it("is zero for a future start time", () => {
    expect(millisecondsRemaining(String(NOW + 60_000), NOW)).toBe(0);
  });

  it("agrees with isSessionExpired at every boundary", () => {
    for (const offset of [0, 1, 1_000, SESSION_MAX_AGE_MS - 1, SESSION_MAX_AGE_MS, SESSION_MAX_AGE_MS + 1]) {
      const startedAt = String(NOW - offset);
      const expired = isSessionExpired(startedAt, NOW);
      const remaining = millisecondsRemaining(startedAt, NOW);
      expect(remaining === 0).toBe(expired);
    }
  });
});

// ── The redirect loop ────────────────────────────────────────────────────
// The first version of this shipped a loop: a timed-out client was redirected
// to /portal/login, the deadline was not evaluated there so nothing cleared the
// cookies, the "signed-in users shouldn't sit on the login page" rule bounced
// them to /portal, and /portal expired them back to login. The page refreshed
// forever and the client was never signed out. These tests walk the transitions
// rather than checking a single call, because that is the only way the loop is
// visible.
describe("middleware session decision", () => {
  const FRESH = String(NOW - 60_000);
  const STALE = String(NOW - SESSION_MAX_AGE_MS - 1);
  const decide = (o: Partial<Parameters<typeof decideSessionAction>[0]>) =>
    decideSessionAction({
      isPortal: true,
      isAuthPublic: false,
      isAuthed: true,
      startedAt: FRESH,
      now: NOW,
      ...o,
    });

  it("leaves non-portal pages alone entirely", () => {
    expect(decide({ isPortal: false, isAuthed: false, startedAt: undefined })).toBe("continue");
    expect(decide({ isPortal: false, startedAt: STALE })).toBe("continue");
  });

  it("lets a live session through", () => {
    expect(decide({})).toBe("continue");
  });

  it("sends a signed-out visitor to login", () => {
    expect(decide({ isAuthed: false, startedAt: undefined })).toBe("redirect-to-login");
  });

  it("does not claim a session expired when the visitor was never signed in", () => {
    // Otherwise a first-time visitor is told their session timed out.
    expect(decide({ isAuthed: false, startedAt: STALE })).toBe("redirect-to-login");
    expect(decide({ isAuthed: false, isAuthPublic: true, startedAt: STALE })).toBe("continue");
  });

  it("expires and redirects from a protected page", () => {
    expect(decide({ startedAt: STALE })).toBe("expire-and-redirect");
  });

  it("expires and RENDERS on the login page, never redirects", () => {
    // The whole bug: redirecting from the login page targets the login page, so
    // the session is never cleared and the client bounces forever.
    expect(decide({ isAuthPublic: true, startedAt: STALE })).toBe("expire-and-render");
  });

  it("terminates: following each action reaches a stable state", () => {
    // Start expired on /portal. Follow the redirect to /portal/login. The
    // second step must clear and render, not redirect again.
    const onPortal = decide({ isAuthPublic: false, startedAt: STALE });
    expect(onPortal).toBe("expire-and-redirect");

    const onLoginStillAuthed = decide({ isAuthPublic: true, startedAt: STALE });
    expect(onLoginStillAuthed).not.toBe("expire-and-redirect");

    // After cookies are cleared the client is signed out, and the login page
    // simply renders. No further transition.
    const afterClear = decide({ isAuthPublic: true, isAuthed: false, startedAt: undefined });
    expect(afterClear).toBe("continue");
  });
});
