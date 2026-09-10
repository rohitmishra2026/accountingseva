// Closes the report the way the site closes a page: a hairline, then the firm's
// name set quietly. Kept to a single line rather than the marketing footer's
// four columns - a client reading their own statement does not need the
// navigation, and the portal is behind a login.
//
// Page furniture rather than part of either view, so it sits in the page and
// renders the same whichever tab is open. A footer that appeared and vanished
// as you switched tabs would read as a rendering fault.
export function ReportFooter() {
  return (
    <footer className="border-t border-navy-100 pt-5 text-right">
      <p className="text-sm font-semibold text-navy-900">AccountingSeva</p>
      <p className="mt-0.5 text-xs text-navy-500">
        Tax &amp; Compliance Professionals
      </p>
    </footer>
  );
}
