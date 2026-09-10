import { Section } from "./Section";
import { differentiators } from "@/content/marketing";

// Static cards: no scroll reveal, no hover animation. Number, title and
// description are always visible. 3 across on desktop, 2 rows.
export function WhyChoose() {
  return (
    <Section
      id="why"
      eyebrow="Why Us"
      heading="Why Choose AccountingSeva"
      tone="dark"
      className="bg-navy-900"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {differentiators.map((d, i) => (
          <div
            key={d.title}
            className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="mb-3 text-2xl font-semibold text-navy-400">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="text-lg font-semibold text-white">{d.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">
              {d.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
