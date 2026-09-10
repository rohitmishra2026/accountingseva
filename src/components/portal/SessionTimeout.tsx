"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Client half of the absolute session timeout.
 *
 * The server is what enforces the deadline: middleware checks it on every
 * portal request and clears the session cookies. This component exists for two
 * reasons.
 *
 * First, so the sign-out HAPPENS. Without it, someone reading their holdings at
 * minute 35 would still be looking at a rendered page, signed out but unaware,
 * until they navigated.
 *
 * Second, so the countdown is VISIBLE the whole time. A session that ends
 * without warning reads as the portal breaking. A client who can see they have
 * four minutes left can finish reading, or download their statement now rather
 * than discovering the deadline by hitting it.
 *
 * It is not a security control. Disabling JavaScript skips it entirely, and
 * that is fine: the next request still hits middleware and is still redirected.
 */

/** Below this the pill turns urgent, and starts announcing to screen readers. */
const WARN_AT_MS = 60_000;

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimeout({ remainingMs }: { remainingMs: number }) {
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    if (remainingMs <= 0) return;

    // Compare against a fixed end time rather than decrementing a counter.
    // Background tabs get their timers throttled, so a tick-based countdown
    // drifts badly; measuring against a deadline does not.
    const endsAt = Date.now() + remainingMs;

    const check = () => {
      const rest = endsAt - Date.now();
      setLeft(rest);
      if (rest <= 0) {
        // Full navigation, not a client-side route change: this has to pass
        // through middleware so the session cookies are actually cleared.
        window.location.assign("/portal/login?timeout=1");
      }
    };

    check();
    const id = window.setInterval(check, 1_000);
    // A throttled background tab can overshoot the deadline. Re-check the
    // moment it comes back into view.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [remainingMs]);

  // No session, no countdown. This component sits in the portal layout, which
  // also wraps the login and password-help pages, and a timer on those would be
  // nonsense.
  if (remainingMs <= 0) return null;

  const urgent = left <= WARN_AT_MS;

  return (
    // Bottom-LEFT, not centred and no longer right. A fixed element always
    // floats over something, so it belongs in a corner rather than over a
    // heading - but the report's footer is right-aligned by design, and on a
    // short report the page barely scrolls, so a right-hand chip sat directly
    // on top of "AccountingSeva / Tax & Compliance Professionals". The left
    // corner is the only one with nothing in it.
    <div
      data-print="hide"
      className="pointer-events-none fixed bottom-0 left-0 z-50 px-3 pb-3 sm:px-5 sm:pb-4"
    >
      <div
        role="timer"
        // Announcing every second would make a screen reader unusable. Stay
        // silent until the last minute, then speak.
        aria-live={urgent ? "polite" : "off"}
        aria-label={`Session ends in ${format(left)}`}
        className={cn(
          "pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
          urgent
            ? "bg-[#C0392B] text-white"
            : "border border-navy-200 bg-white/95 text-navy-700 backdrop-blur"
        )}
      >
        <Clock
          className={cn(
            "h-3.5 w-3.5 sm:h-4 sm:w-4",
            urgent ? "text-white" : "text-navy-500"
          )}
        />
        <span className="tabular-nums">
          {/* On a phone the label is dropped and only the time is shown: at
              full width the pill spanned most of the screen and sat across
              whatever heading happened to be at the bottom of the viewport. */}
          <span className="hidden sm:inline">
            {urgent ? "Signing out in " : "Session ends in "}
          </span>
          <span className="font-semibold">{format(left)}</span>
        </span>
      </div>
    </div>
  );
}
