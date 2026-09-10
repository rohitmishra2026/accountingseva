import Link from "next/link";
import { cn } from "@/lib/cn";

// Centered card used by the login and password-help pages. Matches the
// marketing design language (navy, Inter, generous whitespace).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  /**
   * Centres the heading. The sign-in page has no subtitle, so a left-aligned
   * heading sat off to one side above a centred logo and a centred button. The
   * password-help page keeps its left alignment, because it carries several
   * paragraphs of explanation that read better ranged left.
   */
  centered = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          {/* logo-card.png is the flattened, crisp-edged logo (the original
              PNG has a soft watercolor halo that reads as blur). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-card.png"
            alt="AccountingSeva Client Portal"
            className="h-16 w-auto rounded-xl shadow-sm"
          />
        </Link>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <h1
            className={cn(
              "text-xl font-semibold text-navy-900",
              centered && "text-center"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "mt-1 text-sm text-navy-600",
                centered && "text-center"
              )}
            >
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-navy-600">{footer}</div>
        )}
      </div>
    </main>
  );
}
