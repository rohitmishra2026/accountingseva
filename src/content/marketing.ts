// Longer-form marketing copy: About, Industries, differentiators, FAQ.
// All firm-supplied text lives here so components stay presentational.
// [PLACEHOLDER] entries must be reviewed/filled by the firm before launch.

export const about = {
  heading: "About AccountingSeva",
  body: [
    "AccountingSeva is a professional advisory firm with offices in Goa and Pune, serving individuals, professionals and businesses across India. We work across income tax, GST, tax advisory, litigation, company and LLP incorporations, and portfolio management, so our clients get one firm that understands their full financial picture rather than a different specialist for every form.",
    "The practice is built on a simple idea: compliance should create clarity, not confusion. Every engagement is founder-led, deadlines are tracked so they are never yours to worry about, and advice is given in plain language with the reasoning explained. Whether it is a salaried professional filing a return, a growing business managing GST, or a dispute that needs representation, we treat each matter with the same care and attention.",
  ],
} as const;

// Photos shown in the About section carousel, in order. Replace the SVG
// placeholders in public/images with real firm photos (same filenames work,
// or update the paths here).
export const aboutPhotos = [
  { src: "/images/about-1.svg", alt: "AccountingSeva office" },
  { src: "/images/about-2.svg", alt: "The AccountingSeva team at work" },
  { src: "/images/about-3.svg", alt: "Meeting with a client at AccountingSeva" },
] as const;

// (The former Team and Founder sections were removed from the page; their
// content used to live here.)

// Industries the firm serves. Tuned to a Goa client base; edit freely.
// `image` is optional: set it to a path under public/ (e.g.
// "/images/industries/hospitality.jpg") to show a photo behind the card;
// without it the card uses a branded navy gradient with the icon watermark.
export type Industry = {
  name: string;
  description: string;
  image?: string;
};

export const industries: Industry[] = [
  {
    name: "Hospitality & Tourism",
    description:
      "GST on rooms and F&B, seasonal cash flow planning and licence-linked compliance for hotels, resorts and travel operators.",
  },
  {
    name: "Restaurants & Cafés",
    description:
      "Aggregator reconciliations, the right GST scheme and clean daily books for restaurants, cafés and cloud kitchens.",
  },
  {
    name: "Real Estate & Construction",
    description:
      "Project-wise accounting, works contract GST, TDS on property and lender-ready reporting for builders and contractors.",
  },
  {
    name: "Retail & Trading",
    description:
      "Inventory-heavy books, e-invoicing, input credit hygiene and clear margin visibility for shops, dealers and traders.",
  },
  {
    name: "Startups & IT Services",
    description:
      "Incorporation to investor-ready books: founder tax planning, ESOP questions and export invoicing done right.",
  },
  {
    name: "Professionals & Freelancers",
    description:
      "Presumptive taxation, advance tax planning and tidy records for doctors, lawyers, designers and consultants.",
  },
  {
    name: "Pharma & Manufacturing",
    description:
      "Multi-state GST, job work documentation and fixed asset registers for plants, labs and distributors.",
  },
  {
    name: "Healthcare & Wellness",
    description:
      "Exempt and taxable supply mapping, equipment depreciation and payroll for clinics, gyms and wellness centres.",
  },
];

export type Differentiator = { title: string; description: string };

// Why Choose AccountingSeva: 6 differentiators, grounded in the firm's actual
// offering (the six services + the client portal). Edit to taste.
export const differentiators: Differentiator[] = [
  {
    title: "Led by the founder",
    description:
      "Your work is handled personally by the founder, not passed down a chain. One point of contact who knows your file.",
  },
  {
    title: "Filings on time, every time",
    description:
      "Income tax, GST and ROC deadlines are tracked and met, so you avoid last-minute scrambles, notices and late fees.",
  },
  {
    title: "Advice in plain language",
    description:
      "We translate compliance into clear decisions you can act on, without the jargon and with the reasoning explained.",
  },
  {
    title: "Everything under one roof",
    description:
      "Tax filing, GST, advisory, litigation, incorporations and portfolio reporting from a single firm that already knows your business.",
  },
  {
    title: "A secure client portal",
    description:
      "Log in any time to see your portfolio summary, holdings and transactions, and download a report, with your data kept private and protected.",
  },
  {
    title: "Offices in Goa and Pune",
    description:
      "Two offices, one standard of work. We serve clients across India, from hospitality and retail to startups and clinics.",
  },
];

export type FaqItem = { q: string; a: string };

// Advisory-firm Q&As, grounded in the firm's actual services. Edit freely.
export const faqs: FaqItem[] = [
  {
    q: "What services does AccountingSeva offer?",
    a: "We handle income tax return filing, GST return management, tax advisory, litigation support, LLP and private limited incorporations with ongoing ROC compliance, and portfolio management services, for individuals and businesses across India.",
  },
  {
    q: "How do I get started as a new client?",
    a: "Use the Write to Us button to send us your name, the nature of your query (GST, ITR, advisory or litigation) and your preferred contact detail. We will get back to you to understand your requirements and set up your engagement.",
  },
  {
    q: "What documents do I need for income tax return filing?",
    a: "It depends on your sources of income, but usually your PAN and Aadhaar, Form 16 or income statements, bank interest details, proof of investments and deductions, and details of any capital gains. Once we understand your case, we share a checklist specific to your situation.",
  },
  {
    q: "How does GST return management work with your firm?",
    a: "We manage the full cycle: registration if you need it, periodic returns filed on time, input tax reconciliations, and refunds where applicable. You share the data each period and we handle the filings and any follow-ups with the department.",
  },
  {
    q: "Can you represent me in tax notices, assessments or appeals?",
    a: "Yes. Our litigation services cover responding to notices, representation during assessments, and appeals before the relevant authorities, so you are not dealing with the department on your own.",
  },
  {
    q: "What is the client portal and what can I see there?",
    a: "The client portal gives portfolio clients a secure, read-only view of their investments: a summary of what has been invested and its current value, a breakdown of holdings and transactions, and a downloadable PDF report. Access is set up for you by the firm.",
  },
  {
    q: "How is my data kept secure?",
    a: "The client portal is used only for Portfolio Management Services; GST, income tax and other filings are handled directly with us, not through the portal. Portal access uses an individual login and each portfolio client can see only their own records. Data is stored on secure infrastructure, and firm access is restricted and logged.",
  },
];
