import { formatDate, formatReportMonth } from "@/lib/format";


// Masthead of the report: title and client line on the left, firm logo on the
// right, closed by a hairline rule.
//
// The old masthead set the title in the report's light blue over a heavy 3px
// blue rule. The redesign sets it in near-black over a single light hairline,
// which is what lets the navy stat rail below it be the first thing the eye
// lands on. The blue heading competed with it.
//
// The client's name is now the plain first item of the meta line rather than
// carrying a "Client Account:" prefix. Whose report it is, is obvious from
// context; the prefix was doing no work.
//
// reportMonth is a YYYY-MM string straight from the holdings data, not a date.
// Holdings are a month series now, so the month is a first-class value rather
// than something inferred from an as_of_date.
export function ReportHeader({
  clientName,
  reportMonth,
  generatedAt,
}: {
  clientName: string;
  reportMonth: string | null;
  generatedAt?: string;
}) {
  const generated = formatDate(generatedAt ?? new Date().toISOString());

  return (
    <header className="border-b border-navy-100 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-navy-900">
            Portfolio Summary
          </h1>

          {/* One meta line on a wide screen, wrapping to as many as it needs on
              a phone. The separators are hidden once it wraps, because a
              dangling "|" at the end of a line reads as a mistake. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-navy-600">
            <span className="font-semibold text-navy-900">{clientName}</span>
            <Sep />
            <span>
              Report Month:{" "}
              <span className="font-semibold text-navy-900">
                {formatReportMonth(reportMonth)}
              </span>
            </span>
            <Sep />
            <span>Generated: {generated}</span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-card.png"
          alt="AccountingSeva"
          className="hidden h-14 w-auto flex-shrink-0 rounded-2xl shadow-md shadow-navy-900/10 sm:block"
        />
      </div>
    </header>
  );
}

function Sep() {
  return (
    <span aria-hidden className="hidden text-navy-300 sm:inline">
      |
    </span>
  );
}
