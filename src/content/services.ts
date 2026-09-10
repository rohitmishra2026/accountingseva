// The six service cards shown in the Services section.
// EXACTLY these six, in this order. Do not add others. Never mention audits.
import type { LucideIcon } from "lucide-react";
import {
  Code2,
  Receipt,
  BookOpenCheck,
  Lightbulb,
  LineChart,
  Building2,
} from "lucide-react";

export type Service = {
  name: string;
  description: string;
  icon: LucideIcon;
};

export const services: Service[] = [
  {
    name: "CA Software Development",
    description:
      "Practice software tailored to your specific requirements, from filing trackers and client portals to automation built around how your firm actually works.",
    icon: Code2,
  },
  {
    name: "GST Return Management",
    description:
      "End-to-end GST compliance covering registration, periodic returns, reconciliations and refunds, handled so your filings stay timely and clean.",
    icon: Receipt,
  },
  {
    name: "Accounting & Bookkeeping Services",
    description:
      "Day-to-day bookkeeping and periodic accounting kept accurate and current, so your numbers are always ready for decisions and filings.",
    icon: BookOpenCheck,
  },
  {
    name: "Tax Advisory",
    description:
      "Practical, forward-looking tax advice for individuals and businesses, structured around your goals rather than generic checklists.",
    icon: Lightbulb,
  },
  {
    name: "Portfolio Management Services",
    description:
      "Consolidated visibility and reporting on 2.5 Cr+ of client assets under management, with a secure client portal that keeps your portfolio data current and clear.",
    icon: LineChart,
  },
  {
    name: "ROC Compliances and Incorporations",
    description:
      "Company and LLP incorporations plus ongoing ROC compliance, from name approval and registration through to annual and event-based filings.",
    icon: Building2,
  },
];
