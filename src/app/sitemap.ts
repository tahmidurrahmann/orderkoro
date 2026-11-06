import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getAllClients } from "@/lib/clients";

// Real last-modified constant manually updated on site content releases.
// Never use new Date() per request to avoid misleading search crawlers.
export const LAST_MODIFIED = new Date("2026-11-06T00:00:00.000Z");

interface PublicRouteEntry {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
}

// Single array driving public indexable pages for easy addition of future pages.
// NEVER include /api/* or draft previews here.
const PUBLIC_ROUTES: readonly PublicRouteEntry[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    path: "/privacy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: getSiteUrl(route.path).toString(),
    lastModified: LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamically include all active seller storefronts
  const activeClients = getAllClients().filter(
    (c) => c.status === "active" && c.seo?.index !== false && !c.testOnly,
  );

  const clientEntries: MetadataRoute.Sitemap = activeClients.flatMap((client) => [
    {
      url: getSiteUrl(`/${client.slug}`).toString(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: getSiteUrl(`/${client.slug}/privacy`).toString(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: getSiteUrl(`/${client.slug}/terms`).toString(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
  ]);

  return [...staticEntries, ...clientEntries];
}
