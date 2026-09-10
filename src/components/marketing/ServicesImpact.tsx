import { Reveal } from "@/components/Reveal";
import { ImpactRail } from "./ImpactRail";
import { services } from "@/content/services";

// Merged Services + Impact section: one white bento grid where the dark
// impact rail (see ImpactRail.tsx) is the tall anchor tile and the six
// hover-reveal service cards fill the remaining cells. At lg the grid is four
// columns and two rows (rail spans both rows) so the whole section fits a
// laptop viewport at once; at sm the rail becomes a full-width band above a
// 2x3 card grid; on mobile everything stacks with the rail first.
export function ServicesImpact() {
  return (
    <section
      id="services"
      className="scroll-mt-24 bg-white px-6 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          {/* Flattened logo (logo-card.png): the original PNG has a soft
              watercolor halo that reads as blur at this size, so we use a
              crisp-edged version cropped to the solid artwork.

              Leads the section on mobile, sitting above the eyebrow; from md
              the row goes horizontal and `order-last` returns it to the right
              of the text, which is where it sat before. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-card.png"
            alt="AccountingSeva"
            className="h-20 w-auto flex-shrink-0 self-center rounded-2xl shadow-md shadow-navy-900/10 md:order-last md:h-28 lg:h-36"
          />
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-navy-500">
              Our Practice
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
              Complete tax, compliance and advisory solutions
            </h1>
            <p className="mt-4 text-lg text-navy-600">
              Every engagement is founder led, backed by 15+ years of
              experience, and delivered end to end. The numbers alongside are
              the running record, updated each financial year.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Anchor tile: the rail lands first, cards cascade after it */}
          <Reveal className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <ImpactRail />
          </Reveal>

          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.name} delayMs={(i + 1) * 100}>
                <div
                  tabIndex={0}
                  className="group flex h-full flex-col rounded-3xl border border-navy-100 bg-navy-50/70 p-6 outline-none transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-navy-800 hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/15 focus-visible:-translate-y-1.5 focus-visible:border-navy-800 focus-visible:bg-navy-800 focus-visible:shadow-xl focus-visible:shadow-navy-900/15 motion-reduce:transition-none lg:min-h-[220px]"
                >
                  <div className="mb-8 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-700 shadow-sm transition-colors duration-300 group-hover:bg-white/10 group-hover:text-white group-focus-visible:bg-white/10 group-focus-visible:text-white lg:mb-0">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="lg:mt-auto">
                    <h3 className="text-base font-semibold text-navy-900 transition-colors duration-300 group-hover:text-white group-focus-visible:text-white">
                      {service.name}
                    </h3>
                    {/* Height-animated reveal on lg+; always open below lg. */}
                    <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-visible:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <p className="pt-2 text-sm leading-relaxed text-navy-600 transition-colors duration-300 group-hover:text-navy-100 group-focus-visible:text-navy-100">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
