// ─────────────────────────────────────────────────────────────────────────
// src/content/site.ts
//
// SINGLE SOURCE OF TRUTH for every piece of editable marketing text, link and
// contact detail on the public site. Edit values here — no layout/component
// code needs touching. Anything wrapped in [PLACEHOLDER ...] must be filled in
// by the firm before launch (see PLACEHOLDERS.md).
// ─────────────────────────────────────────────────────────────────────────

export const site = {
  firmName: "AccountingSeva",
  firmDescriptor: "Professional Advisory",
  domain: "accountingseva.in",

  // One-line value proposition shown in the hero.
  valueProp:
    "Tax, compliance and portfolio advisory for individuals and businesses across India, delivered with clarity and care.",

  contact: {
    // Two offices, each with its own direct line.
    offices: [
      {
        name: "Goa Office",
        address: "Shop No. 41, 2nd Floor, Apana Bazar, Vasco da Gama, 403802, Goa",
        phone: "+91 70836 69886",
      },
      {
        name: "Pune Office",
        address: "No. 8, 2nd Floor, Sidhi Terraces, Dhayari, 411041, Pune",
        phone: "+91 92092 91672",
      },
    ],
    // Primary line (Goa), used wherever a single number is shown.
    phone: "+91 70836 69886",
    email: "info@accountingseva.in",
    officeHours: "Monday – Saturday, 10:00 AM – 6:00 PM IST",
  },

  // Social links surfaced in the Socials section and footer.
  // Leave a value empty ("") to hide that icon.
  socials: {
    linkedin: "https://www.linkedin.com/company/accountingseva/",
    // [PLACEHOLDER — Instagram profile URL]
    instagram: "https://www.instagram.com/accountingseva",
    facebook: "https://www.facebook.com/share/19FLeYdkPA/?mibextid=wwXIfr",
    // WhatsApp click-to-chat on the Goa direct line.
    whatsapp: "https://wa.me/917083669886",
  },

  // Downloadable vCard offered in the "Save Our Contact" section.
  vcard: {
    file: "/accountingseva.vcf",
    downloadName: "accountingseva.vcf",
  },

  seo: {
    title: "AccountingSeva | Tax & Compliance Professionals",
    description:
      "AccountingSeva is a professional advisory firm with offices in Goa and Pune, serving clients across India: income tax filing, GST return management, tax advisory, litigation, ROC incorporations and portfolio management.",
    // Canonical public URL, used for OG/canonical tags.
    // Falls back to NEXT_PUBLIC_SITE_URL at runtime where available.
    siteUrl: "https://accountingseva.in",
    ogImage: "/images/og-default.jpg",
  },
} as const;

export type Site = typeof site;
