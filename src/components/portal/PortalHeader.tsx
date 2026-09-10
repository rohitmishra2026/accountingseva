import Link from "next/link";
import { signOut } from "@/app/portal/login/actions";
import { PortalMenu } from "./PortalMenu";

// Portal masthead. The inner container matches the dashboard's own
// `max-w-6xl px-6` so the logo lines up with the content below it. Controls
// live behind the menu button; only the client's name sits alongside.
export function PortalHeader({ fullName }: { fullName: string }) {
  return (
    <header
      data-print="hide"
      className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur transition-colors duration-300"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/portal" className="group flex items-center gap-3">
          {/* logo-card.png is the flattened, crisp-edged logo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-card.png"
            alt="AccountingSeva"
            className="h-9 w-auto rounded-md transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400 sm:inline">
            Client Portal
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <p className="hidden text-sm font-medium text-navy-900 sm:block">
            {fullName}
          </p>

          <form action={signOut} className="flex items-center">
            <button
              type="submit"
              className="rounded-full border border-navy-200 px-4 py-1.5 text-sm font-medium text-navy-700 transition-all duration-200 hover:border-navy-700 hover:bg-navy-900 hover:text-white active:scale-95"
            >
              Sign out
            </button>
          </form>

          <PortalMenu />
        </div>
      </div>
    </header>
  );
}
