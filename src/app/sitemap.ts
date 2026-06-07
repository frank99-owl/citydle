import type { MetadataRoute } from "next";

const SITE_URL = "https://street-guesser.vercel.app"; // TODO: update with real domain

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
