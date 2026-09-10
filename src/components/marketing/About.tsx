import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { AboutCarousel } from "./AboutCarousel";
import { about } from "@/content/marketing";

// Dark band: together with the Save Our Contact band below it, this forms the
// page's dark closing block before the socials strip and footer.
export function About() {
  return (
    <Section
      id="about"
      eyebrow="About Us"
      heading={about.heading}
      tone="dark"
      className="bg-navy-900"
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <Reveal className="space-y-5 text-lg leading-relaxed text-navy-200 lg:col-span-3">
          {about.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </Reveal>
        <Reveal className="lg:col-span-2" delayMs={150}>
          <AboutCarousel />
        </Reveal>
      </div>
    </Section>
  );
}
