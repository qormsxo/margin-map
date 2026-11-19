import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const latestGuide = GUIDES.map((g) => g.updated).sort().at(-1);

  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    {
      url: `${site.url}/tools/menu-cost-calculator`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/guides`,
      lastModified: latestGuide,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...GUIDES.map((g) => ({
      url: `${site.url}/guides/${g.slug}`,
      lastModified: g.updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${site.url}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
