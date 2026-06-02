import { NextResponse } from "next/server";
import { getLeaderboard, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") ?? "br1").trim();
  const queue = (searchParams.get("queue") ?? "RANKED_SOLO_5x5") as "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
  const tier = (searchParams.get("tier") ?? "challenger") as "challenger" | "grandmaster" | "master";

  if (!isPlatform(region)) return NextResponse.json({ error: "Região inválida." }, { status: 400 });

  try {
    const data = await getLeaderboard(region, queue, tier);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof RiotError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erro ao buscar leaderboard." }, { status: 500 });
  }
}
