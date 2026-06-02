import { NextResponse } from "next/server";
import { getFreeRotation, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") ?? "br1").trim();
  if (!isPlatform(region)) return NextResponse.json({ error: "Região inválida." }, { status: 400 });

  try {
    const data = await getFreeRotation(region);
    return NextResponse.json(data ?? { freeChampionIds: [], freeChampionIdsForNewPlayers: [], maxNewPlayerLevel: 0 });
  } catch (err) {
    if (err instanceof RiotError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erro ao buscar rotação." }, { status: 500 });
  }
}
