import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
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
      align="center"
      className="bg-navy-900"
    >
      <Reveal className="mx-auto max-w-4xl space-y-5 text-center text-lg leading-relaxed text-navy-200">
        {about.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </Reveal>
    </Section>
  );
}
