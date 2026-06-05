import type { Metadata } from "next";
import { fetchChampions, mockTierStats, primaryRole, championIcon } from "@/lib/ddragon";
import { ChampionsGrid } from "./ChampionsGrid";
import { PageWithAds } from "@/components/PageWithAds";

export const metadata: Metadata = {
  title: "Campeões — Max LoL",
  description: "Todos os campeões de League of Legends com tier, win rate e filtros por role e classe.",
};
export const revalidate = 3600;

export default async function ChampionsPage() {
  const champions = await fetchChampions();
  const entries = champions
    .map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      tags: c.tags,
      role: primaryRole(c.tags),
      icon: championIcon(c.id),
      ...mockTierStats(c.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <PageWithAds><ChampionsGrid entries={entries} /></PageWithAds>;
}
