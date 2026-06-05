import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchChampions, fetchChampionDetail, DD_BASE, splashArt, championIcon } from "@/lib/ddragon";
import { generateChampionBuildData } from "@/lib/mockChampData";
import { ChampionPageClient } from "./ChampionPageClient";
import { PageWithAds } from "@/components/PageWithAds";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ champId: string }>;
}): Promise<Metadata> {
  const { champId } = await params;
  return {
    title: `${champId} Build, Runas e Counters — Max LoL`,
    description: `Build, runas, ordem de habilidades, counters e sinergias de ${champId}. Tier, win rate e pick rate por patch.`,
  };
}

export default async function ChampionPage({
  params,
}: {
  params: Promise<{ champId: string }>;
}) {
  const { champId } = await params;
  const allChampions = await fetchChampions();
  const champ = allChampions.find((c) => c.id === champId);
  if (!champ) notFound();

  const detail = await fetchChampionDetail(champ.id);
  const buildData = generateChampionBuildData(champ, allChampions);

  return (
    <PageWithAds>
      <ChampionPageClient
        champ={champ}
        detail={detail}
        buildData={buildData}
        allChampions={allChampions}
        ddBase={DD_BASE}
        splashUrl={splashArt(champ.id, 0)}
      />
    </PageWithAds>
  );
}
