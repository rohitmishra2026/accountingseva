import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { IndiaMap } from "./IndiaMap";
import { site } from "@/content/site";

// Light band. The animated India map renders openly on the white background
// in its navy-gradient colourway (see IndiaMap.tsx).
export function Office() {
  return (
    <Section
      id="office"
      eyebrow="Find Us"
      heading="Visit Our Offices"
      intro="Two offices on the western corridor: Goa and Pune."
      className="bg-white"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          {site.contact.offices.map((office, i) => (
            <Reveal
              key={office.name}
              delayMs={i * 120}
              className="rounded-2xl border border-navy-100 bg-navy-50/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-navy-300 hover:shadow-lg hover:shadow-navy-900/5 motion-reduce:transition-none"
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-navy-500" />
                <div>
                  <p className="font-semibold text-navy-900">{office.name}</p>
                  <p className="mt-1 text-navy-600">{office.address}</p>
                  <a
                    href={`tel:${office.phone.replace(/\s/g, "")}`}
                    className="mt-2 inline-flex items-center gap-2 text-sm text-navy-600 transition-colors hover:text-navy-900"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0 text-navy-400" />
                    {office.phone}
                  </a>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delayMs={240} className="space-y-3 pl-1 text-sm text-navy-600">
            <p className="flex items-center gap-3">
              <Clock className="h-4 w-4 flex-shrink-0 text-navy-400" />
              {site.contact.officeHours}
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 flex-shrink-0 text-navy-400" />
              <a
                href={`mailto:${site.contact.email}`}
                className="transition-colors hover:text-navy-900"
              >
                {site.contact.email}
              </a>
            </p>
          </Reveal>
        </div>

        <Reveal delayMs={150}>
          <IndiaMap />
        </Reveal>
      </div>
    </Section>
  );
}
