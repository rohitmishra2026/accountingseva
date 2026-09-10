import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const base = process.env.NEXT_PUBLIC_SITE_URL || site.seo.siteUrl;

// Only public marketing routes belong here. /portal and /api are excluded both
// by robots.txt and by page-level noindex, and must never be listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: base,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // A real, indexable page that the sitemap previously omitted.
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
