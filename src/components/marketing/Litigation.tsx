import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { InView } from "./InView";
import { CountUp } from "@/components/CountUp";
import { litigation } from "@/content/impact";
import { noticeMailto } from "@/lib/mailto";

// The marquee GST & Income Tax Litigation section. Composition: an
// "authority split" with the argument on the left (heading, intro, an
// animated checklist of what the practice handles) and the proof on the
// right (the case-count monument: a huge count-up wrapped in a hairline ring
// whose arc sweeps in sync with the number and deliberately stops at three
// quarters, an ongoing practice rather than a closed book). All motion is
// one-shot and settles; the drifting orbs are the only loop. The CSS lives
// in globals.css under "Litigation section".
export function Litigation() {
  return (
    <section
      id="litigation"
      aria-labelledby="litigation-heading"
      className="relative scroll-mt-24 overflow-hidden bg-navy-900 py-20 sm:py-24"
    >
      {/* Ambient orbs, transform-only drift */}
      <div
        aria-hidden
        className="orb-drift pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full bg-navy-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="orb-drift-2 pointer-events-none absolute -left-24 bottom-0 hidden h-56 w-56 rounded-full bg-navy-400/10 blur-3xl sm:block"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16">
          {/* A. Header */}
          <Reveal className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-300">
              Litigation
            </p>
            <h2
              id="litigation-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              GST & Income Tax Litigation
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-navy-200">
              {litigation.intro}
            </p>
          </Reveal>

          {/* B. Monument */}
          <Reveal
            delayMs={120}
            className="mt-12 lg:col-span-5 lg:row-span-2 lg:mt-0 lg:self-center"
          >
            <InView activeClass="lit-monument-in" threshold={0.4}>
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-10 sm:text-left lg:flex-col lg:text-center">
                <div className="relative flex min-h-[220px] items-center justify-center sm:min-h-[260px] lg:min-h-[320px]">
                  <svg
                    aria-hidden
                    viewBox="0 0 100 100"
                    className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 sm:h-[260px] sm:w-[260px] lg:h-[320px] lg:w-[320px]"
                  >
                    {/* The plinth: a hairline circle that exists before any motion */}
                    <circle
                      cx="50"
                      cy="50"
                      r="49"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />
                    {/* The sweep: same 1800ms and ease-out cubic as CountUp,
                        stopping at 75%. An open arc reads as ongoing work. */}
                    <g transform="rotate(-90 50 50)">
                      <circle
                        cx="50"
                        cy="50"
                        r="49"
                        fill="none"
                        pathLength={1}
                        className="monument-arc"
                        stroke="rgba(255,255,255,0.28)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                  <CountUp
                    target={litigation.caseCount}
                    suffix="+"
                    className="relative bg-gradient-to-b from-white to-navy-200 bg-clip-text text-[6.5rem] font-semibold leading-none tracking-tight text-transparent tabular-nums sm:text-[7.5rem] lg:text-[8.5rem]"
                  />
                </div>

                <div className="mt-3 flex flex-col items-center sm:mt-0 sm:items-start lg:items-center">
                  <p className="text-sm text-navy-300">
                    Litigation matters handled to date
                  </p>
                  <div className="mt-8 grid w-full max-w-xs grid-cols-2 gap-6 border-t border-white/10 pt-5">
                    <div
                      className="monument-fact"
                      style={{ "--fact-delay": "300ms" } as React.CSSProperties}
                    >
                      <p className="text-lg font-semibold text-white">
                        <CountUp target={15} suffix="+" /> years
                      </p>
                      <p className="mt-0.5 text-xs text-navy-400">in practice</p>
                    </div>
                    <div
                      className="monument-fact"
                      style={{ "--fact-delay": "400ms" } as React.CSSProperties}
                    >
                      <p className="text-lg font-semibold text-white">Founder led</p>
                      <p className="mt-0.5 text-xs text-navy-400">
                        attention on every matter
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </InView>
          </Reveal>

          {/* C. Checklist, closing with the section's CTA */}
          <div className="mt-12 lg:col-span-7 lg:mt-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              What we handle
            </p>
            <InView activeClass="lit-in-view" threshold={0.25}>
              <ul className="mt-4">
                {litigation.handles.map((item, i) => (
                  <li
                    key={item}
                    className="lit-row flex items-center gap-4 border-b border-white/10 py-3.5"
                    style={
                      {
                        "--row-delay": `${i * 80}ms`,
                        "--check-delay": `${i * 80 + 250}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <span className="check-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15">
                      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4">
                        <path
                          d="M3 8l3.5 3.5L13 4"
                          pathLength={1}
                          className="check-path"
                          stroke="white"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </span>
                    <span className="text-[15px] font-medium text-white sm:text-base">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </InView>

            <Reveal className="mt-8">
              <a
                href={noticeMailto()}
                className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy-900 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-100 motion-reduce:transition-none"
              >
                Discuss a notice
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
