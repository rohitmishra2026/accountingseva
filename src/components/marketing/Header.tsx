"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

// Ordered to match the sections' order on the page.
const NAV = [
  { href: "#services", label: "Services" },
  { href: "#litigation", label: "Litigation - GST & Income Tax" },
  { href: "#industries", label: "Industries" },
  { href: "#faq", label: "FAQ" },
  { href: "#office", label: "Contact" },
  { href: "#about", label: "About" },
];

// The Client Portal button leads the bar, sitting where the logo used to be.
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // On the homepage the nav items are in-page anchors. On any other marketing
  // page (e.g. /privacy) those sections don't exist, so route back to the
  // homepage section instead: "#services" -> "/#services". This is a Next
  // <Link> (client-side), and the layout's hash-stripping script is mount-only,
  // so the section jump survives the navigation.
  const isHome = pathname === "/";

  // Services is the page's first section: clicking it returns to the very
  // top from anywhere, rather than anchoring partway into the section.
  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href === "#services") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-700 hover:shadow-md active:scale-[0.98]"
        >
          Client Portal
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const className =
              "relative text-sm font-medium text-navy-600 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-navy-900 after:transition-transform after:duration-300 hover:text-navy-900 hover:after:scale-x-100";
            return isHome ? (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={className}
              >
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={`/${item.href}`} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-navy-100 transition-[max-height] duration-300 ease-out lg:hidden",
          open ? "max-h-96" : "max-h-0 border-t-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-6 py-4" aria-label="Mobile">
          {NAV.map((item) => {
            const className = "rounded px-2 py-2 text-navy-700 hover:bg-navy-50";
            return isHome ? (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  handleNavClick(e, item.href);
                  setOpen(false);
                }}
                className={className}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={`/${item.href}`}
                onClick={() => setOpen(false)}
                className={className}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
