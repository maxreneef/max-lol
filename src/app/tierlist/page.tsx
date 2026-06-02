import type { Metadata } from "next";
import { fetchChampions, mockTierStats, primaryRole, championIcon } from "@/lib/ddragon";
import { TierListClient } from "./TierListClient";

export const metadata: Metadata = {
  title: "Tier List — Max LoL",
  description: "Ranking de campeões de League of Legends por tier, win rate e pick rate. Atualizado por patch.",
};

export const revalidate = 3600; // re-fetch Data Dragon a cada 1h

export default async function TierListPage() {
  const champions = await fetchChampions();

  const entries = champions.map((c) => ({
    id: c.id,
    name: c.name,
    tags: c.tags,
    role: primaryRole(c.tags),
    icon: championIcon(c.id),
    ...mockTierStats(c.id),
  }));

  // Ordena por tier (S→D) e win rate
  const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  entries.sort(
    (a, b) =>
      (tierOrder[a.tier as keyof typeof tierOrder] ?? 5) -
      (tierOrder[b.tier as keyof typeof tierOrder] ?? 5) ||
      b.winRate - a.winRate
  );

  return <TierListClient entries={entries} />;
}
