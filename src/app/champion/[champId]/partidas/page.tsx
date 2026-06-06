import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchChampions } from "@/lib/ddragon";
import { PageWithAds } from "@/components/PageWithAds";
import { PartidasClient } from "./PartidasClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ champId: string }>;
}): Promise<Metadata> {
  const { champId } = await params;
  return {
    title: `${champId} — Partidas Recentes (Diamond–Desafiante) | Max LoL`,
    description: `Veja as partidas reais de ${champId} nos últimos 30 dias, do Diamond IV ao Desafiante.`,
  };
}

export default async function PartidasPage({
  params,
  searchParams,
}: {
  params: Promise<{ champId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { champId } = await params;

  // Valida se o campeão existe
  const allChampions = await fetchChampions();
  const champ = allChampions.find((c) => c.id === champId);
  if (!champ) notFound();

  const sp = await searchParams;
  const region = sp.region ?? "br1";
  const lane   = sp.lane   ?? "";

  return (
    <PageWithAds>
      <PartidasClient
        champId={champId}
        champName={champ.name}
        initialRegion={region}
        initialLane={lane}
      />
    </PageWithAds>
  );
}
