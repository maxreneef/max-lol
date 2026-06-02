import type { MetadataRoute } from "next";

const BASE = "https://max-lol.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: BASE, priority: 1.0, changeFrequency: "weekly" as const },
    { url: `${BASE}/summoner`, priority: 0.9, changeFrequency: "daily" as const },
    { url: `${BASE}/tierlist`, priority: 0.9, changeFrequency: "daily" as const },
    { url: `${BASE}/leaderboard`, priority: 0.8, changeFrequency: "hourly" as const },
    { url: `${BASE}/lobby`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${BASE}/compare`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${BASE}/privacy`, priority: 0.3, changeFrequency: "yearly" as const },
    { url: `${BASE}/terms`, priority: 0.3, changeFrequency: "yearly" as const },
    { url: `${BASE}/contact`, priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return staticRoutes.map((r) => ({
    url: r.url,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
