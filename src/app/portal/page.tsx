import type { Metadata } from "next";
import { requireUser } from "@/lib/portal";
import { getPortfolio } from "@/lib/portfolio-data";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { ReportHeader } from "@/components/portal/report/ReportHeader";
import { PortfolioViews } from "@/components/portal/PortfolioViews";
import { EmptyState } from "@/components/portal/EmptyState";
import { ReportFooter } from "@/components/portal/report/ReportFooter";

// robots.txt already disallows /portal, but that is advisory and does not stop
// a URL being indexed when something else links to it. The login and
// password-help pages each carry this; the dashboard did not. Page-level
// noindex is the directive that actually binds.
export const metadata: Metadata = {
  title: "Portfolio Summary",
  robots: { index: false, follow: false },
};

// Portfolio data is fetched here, in a server component, using the user's
// session client. Rows are scoped explicitly by the caller's own email as well
// as by RLS - see getPortfolio(), which documents why RLS alone is not enough
// for an admin session. The service role key is never referenced anywhere in
// the portal render path. Both the Standard and Detailed views render from
// this one fetch.
export default async function PortalDashboard() {
  const { profile, clientEmail } = await requireUser();
  const { holdings, groups, totals, splits, monthly, reportMonth } =
    await getPortfolio(clientEmail);

  const hasData = holdings.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader fullName={profile.full_name} />

      {/* pb-24 rather than py-8: the session countdown is fixed to the bottom
          of the viewport, and at py-8 it sat on top of the last table row. */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 pt-8 pb-24">
        <ReportHeader
          clientName={profile.full_name}
          reportMonth={reportMonth}
        />

        {!hasData ? (
          <EmptyState
            title="Your portfolio is being prepared"
            message="Holdings will appear here after your first sync. Please check back soon."
          />
        ) : (
          <PortfolioViews
            holdings={holdings}
            groups={groups}
            totals={totals}
            splits={splits}
            monthly={monthly}
            reportMonth={reportMonth}
          />
        )}

        {hasData && <ReportFooter />}
      </main>

    </div>
  );
}
