import Link from "next/link";
import { site } from "@/content/site";
import { careersMailto } from "@/lib/mailto";
import { Logo } from "@/components/Logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-navy-900 text-navy-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="-ml-3 h-20 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-navy-300">{site.valueProp}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-300">
            Contact
          </p>
          <ul className="mt-4 space-y-3 text-sm text-navy-200">
            {site.contact.offices.map((office) => (
              <li key={office.name}>
                <p className="font-medium text-white">{office.name}</p>
                <p className="mt-0.5 text-navy-300">{office.address}</p>
                <a
                  href={`tel:${office.phone.replace(/\s/g, "")}`}
                  className="mt-0.5 inline-block transition-colors hover:text-white"
                >
                  {office.phone}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.contact.email}`}
                className="transition-colors hover:text-white"
              >
                {site.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-300">
            Quick links
          </p>
          <ul className="mt-4 space-y-2 text-sm text-navy-200">
            <li><a href="#services" className="transition-colors hover:text-white">Services</a></li>
            <li><a href="#about" className="transition-colors hover:text-white">About</a></li>
            <li><a href="#faq" className="transition-colors hover:text-white">FAQ</a></li>
            <li><a href="#office" className="transition-colors hover:text-white">Visit us</a></li>
            <li><a href={careersMailto()} className="transition-colors hover:text-white">Careers</a></li>
            <li><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-300">
            Clients
          </p>
          <ul className="mt-4 space-y-2 text-sm text-navy-200">
            <li>
              <Link
                href="/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Client Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-navy-400">
          © {year} {site.firmName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
