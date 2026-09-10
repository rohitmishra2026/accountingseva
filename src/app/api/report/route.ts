import { NextResponse } from "next/server";
import { headers } from "next/headers";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/portal";
import { getPortfolio } from "@/lib/portfolio-data";
import { logAudit } from "@/lib/audit";
import { PortfolioPdf } from "@/components/portal/PortfolioPdf";
import { registerReportFonts, getLogoDataUri } from "@/lib/pdf-assets";
import { site } from "@/content/site";
import { formatDate, formatReportMonth } from "@/lib/format";

// @react-pdf/renderer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * NOTE: this route previously read `period`, `from` and `to` from the query
 * string, validated them, and varied the printed header accordingly. All of
 * that is gone.
 *
 * The validation existed because formatDate() returns String(iso) unchanged for
 * anything it cannot parse, so an unvalidated `from` survived round-trip
 * verbatim onto a firm-branded statement. Not accepting the parameter at all is
 * a stronger guarantee than validating it, and it also removed a second problem:
 * getPortfolio() has no period filtering, so the header could assert a period
 * the figures did not cover.
 *
 * Do not reintroduce these parameters without implementing the filtering they
 * imply.
 */

/**
 * Builds the "Report Month: ..." line printed under the firm's logo.
 *
 * The header is deliberately derived from the DATA, not from the request.
 *
 * It used to vary with `period`/`from`/`to`, but getPortfolio() has no period
 * filtering: it always returns the latest report month plus the complete
 * monthly history. So `?period=custom&from=2026-01-01&to=2026-03-31` produced a
 * firm-branded statement headed "Report Period: 01 Jan 2026 to 31 Mar 2026"
 * whose totals, holdings table and chart were the July 2026 snapshot. The
 * header asserted a period the figures did not cover, which for a document a
 * client may hand to a bank or a tax authority is worse than having no period
 * label at all.
 *
 * The portal menu no longer offers period choices either, so nothing legitimate
 * sends these parameters. Rather than half-honour them, the header now always
 * states the month the figures actually represent.
 *
 * If period filtering is implemented in getPortfolio() later, reinstate the
 * variants here and not before.
 */
function reportDateLine(reportMonth: string | null): { line: string; slug: string } {
  // The report month is a YYYY-MM key, not a date, so it formats directly.
  return { line: `Report Month: ${formatReportMonth(reportMonth)}`, slug: "monthly" };
}

// Takes no request parameter: nothing from the request influences the document.
// Client identity comes from the session via requireUser(), and the header line
// comes from the data. The IP for the audit row is read from headers() instead.
export async function GET() {
  // Verifies the session and loads the profile. Redirects (throws) if not
  // authenticated, so no unauthenticated caller reaches PDF generation.
  const { userId, profile, clientEmail } = await requireUser();

  // Scoped to this caller explicitly, not just by RLS: the RLS policy widens to
  // every client for an is_admin profile, which would render the whole book
  // into one PDF under this caller's name. See getPortfolio().
  const { holdings, groups, totals, splits, monthly, reportMonth } =
    await getPortfolio(clientEmail);

  // No caller-supplied value reaches the rendered document. The header is
  // derived entirely from the data, so a crafted link cannot put text of its
  // own choosing onto a firm-branded statement, and cannot label a snapshot as
  // a period it does not cover.
  const { line, slug } = reportDateLine(reportMonth);

  registerReportFonts();

  const generatedLine = `Generated: ${formatDate(new Date().toISOString())}`;

  const element = React.createElement(PortfolioPdf, {
    firmName: site.firmName,
    clientName: profile.full_name,
    reportDateLine: line,
    // The month on its own, for the rail's "Financial performance to ..." line.
    // Derived from the same data as `line`, never from the request.
    reportMonthLabel: formatReportMonth(reportMonth),
    generatedLine,
    logoDataUri: getLogoDataUri(),
    totals,
    groups,
    splits,
    // The rail names the best-performing holding, which needs the rows.
    holdings,
    monthly,
  }) as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);

  const fwd = headers().get("x-forwarded-for");
  await logAudit({
    event: "pdf_download",
    userId,
    ip: fwd ? fwd.split(",")[0].trim() : null,
    metadata: {
      client_code: profile.client_code,
      period: slug,
      report_month: reportMonth,
      holdings: holdings.length,
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="accountingseva-portfolio-${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
