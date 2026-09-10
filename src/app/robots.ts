import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const base = process.env.NEXT_PUBLIC_SITE_URL || site.seo.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The portal is private; keep it out of the index.
      disallow: ["/portal", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
