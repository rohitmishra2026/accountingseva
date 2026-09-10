import { Linkedin, Instagram, Facebook, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";

const links = [
  { key: "linkedin", label: "LinkedIn", href: site.socials.linkedin, Icon: Linkedin },
  { key: "instagram", label: "Instagram", href: site.socials.instagram, Icon: Instagram },
  { key: "facebook", label: "Facebook", href: site.socials.facebook, Icon: Facebook },
  { key: "whatsapp", label: "WhatsApp", href: site.socials.whatsapp, Icon: MessageCircle },
].filter((l) => l.href && l.href.length > 0);

export function Socials() {
  if (links.length === 0) return null;
  return (
    <section id="socials" className="scroll-mt-24 bg-white px-6 py-16 sm:py-20">
      <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">
          Connect with us
        </p>
        <div className="flex items-center gap-4">
          {links.map(({ key, label, href, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 text-navy-700 transition-all duration-300 hover:-translate-y-1 hover:border-navy-900 hover:bg-navy-900 hover:text-white hover:shadow-lg"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
