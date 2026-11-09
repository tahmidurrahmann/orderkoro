import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getAllClients } from "@/lib/clients";

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
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamically include all active seller storefronts
  const activeClients = getAllClients().filter(
    (c) => c.status === "active" && c.seo?.index !== false && !c.testOnly,
  );

  const clientEntries: MetadataRoute.Sitemap = activeClients.map((client) => ({
    url: getSiteUrl(`/${client.slug}`).toString(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticEntries, ...clientEntries];
}
