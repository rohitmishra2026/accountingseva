import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SessionTimeout } from "@/components/portal/SessionTimeout";
import {
  SESSION_START_COOKIE,
  millisecondsRemaining,
} from "@/lib/session-timeout";

// The entire portal is private; keep it out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Reading a cookie makes every portal route dynamic, which they already are:
// each one calls requireUser(), and none may ever be cached and served to a
// second client.
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Zero when there is no session cookie, which is the case on /portal/login
  // and /portal/reset. SessionTimeout renders nothing in that case, so the
  // countdown never appears on the pages a signed-out visitor sees.
  const remainingMs = millisecondsRemaining(
    cookies().get(SESSION_START_COOKIE)?.value
  );

  // White, not the old tinted navy wash: the redesign's panels are the light
  // grey (#F3F5F9) and they need a white page to read against.
  return (
    <div className="min-h-screen bg-white">
      {children}
      <SessionTimeout remainingMs={remainingMs} />
    </div>
  );
}
