import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Only the public pages are worth indexing; everything else is behind login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: [
        "/api/",
        "/dashboard",
        "/onboarding",
        "/ingredients",
        "/menus",
        "/sales",
        "/contribution",
        "/fixed-costs",
        "/purchases",
        "/alerts",
        "/simulation",
        "/health",
        "/offline",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
