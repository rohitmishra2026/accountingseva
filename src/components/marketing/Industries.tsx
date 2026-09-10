import type { LucideIcon } from "lucide-react";
import {
  Hotel,
  UtensilsCrossed,
  Building2,
  ShoppingBag,
  Rocket,
  Briefcase,
  Factory,
  HeartPulse,
} from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { industries } from "@/content/marketing";

// Icon per industry, matched by position to content/marketing.ts.
const ICONS: LucideIcon[] = [
  Hotel,
  UtensilsCrossed,
  Building2,
  ShoppingBag,
  Rocket,
  Briefcase,
  Factory,
  HeartPulse,
];

// Gradient tones rotate so neighbouring cards read as one family without
// being identical. All deep navy, echoing the impact rail.
const TONES = [
  "from-navy-800 to-navy-600",
  "from-navy-900 to-navy-700",
  "from-navy-700 to-navy-500",
  "from-navy-800 to-navy-900",
];

// Image tiles with a header and hover-reveal copy: the industry name is
// always visible top-left; on lg+ the description slides open on hover or
// keyboard focus, below lg it is always shown (no hover on touch). If an
// industry has an `image`, the photo becomes the backdrop with a navy
// gradient scrim; otherwise a branded gradient plus icon watermark stands in.
export function Industries() {
  return (
    <Section
      id="industries"
      eyebrow="Sectors"
      heading="Industries We Serve"
      intro="Deep familiarity across the sectors our clients operate in."
      className="bg-white"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {industries.map((industry, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <Reveal key={industry.name} delayMs={i * 60}>
              <div
                tabIndex={0}
                className={`group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-6 outline-none transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy-900/25 focus-visible:-translate-y-1.5 focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-navy-400 motion-reduce:transition-none ${TONES[i % TONES.length]}`}
              >
                {industry.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={industry.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-navy-900/30 transition-colors duration-300 group-hover:from-navy-900/95 group-hover:via-navy-900/60"
                    />
                  </>
                ) : (
                  <Icon
                    aria-hidden
                    className="absolute -bottom-7 -right-7 h-36 w-36 text-white/[0.08] transition-all duration-500 group-hover:scale-110 group-hover:text-white/[0.12] motion-reduce:transition-none"
                  />
                )}

                <h3 className="relative text-lg font-semibold leading-snug text-white">
                  {industry.name}
                </h3>

                {/* Height-animated reveal on lg+; always open below lg. */}
                <div className="relative mt-auto grid grid-rows-[1fr] pt-3 transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-visible:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <p className="text-sm leading-relaxed text-navy-100">
                      {industry.description}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
