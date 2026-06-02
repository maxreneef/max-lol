// Resolve summonerId → puuid → gameName#tagLine
import { NextResponse } from "next/server";
import { RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

const API_KEY = process.env.RIOT_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const summonerId = (searchParams.get("summonerId") ?? "").trim();
  const region     = (searchParams.get("region")     ?? "br1").trim();

  if (!summonerId)     return NextResponse.json({ error: "summonerId obrigatório." }, { status: 400 });
  if (!isPlatform(region)) return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  if (!API_KEY)        return NextResponse.json({ error: "API key não configurada." }, { status: 503 });

  try {
    // 1. summonerId → puuid
    const sumRes = await fetch(
      `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );
    if (!sumRes.ok) return NextResponse.json({ error: "Invocador não encontrado." }, { status: sumRes.status });
    const summoner = await sumRes.json();

    // 2. puuid → gameName#tagLine
    const { regional } = await import("@/lib/riot").then((m) => {
      const PLATFORMS: Record<string, { regional: string }> = {
        br1: { regional: "americas" }, na1: { regional: "americas" },
        las: { regional: "americas" }, lan: { regional: "americas" },
        euw1: { regional: "europe" }, kr: { regional: "asia" },
      };
      return { regional: PLATFORMS[region]?.regional ?? "americas" };
    });

    const accRes = await fetch(
      `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${summoner.puuid}`,
      { headers: { "X-Riot-Token": API_KEY } }
    );
    if (!accRes.ok) return NextResponse.json({ riotId: null });
    const account = await accRes.json();

    return NextResponse.json({ riotId: `${account.gameName}#${account.tagLine}`, puuid: summoner.puuid });
  } catch (err) {
    if (err instanceof RiotError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erro ao resolver nome." }, { status: 500 });
  }
}
