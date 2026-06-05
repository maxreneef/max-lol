import { NextRequest, NextResponse } from "next/server";
import { isPlatform, PLATFORMS } from "@/lib/types";
import { cached } from "@/lib/cache";

const API_KEY = process.env.RIOT_API_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;
  const region = req.nextUrl.searchParams.get("region") ?? "br1";

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida" }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ matches: [], total: 0, message: "API Key não configurada" });
  }

  const cacheKey = `champion-matches:${champId}:${region}`;

  try {
    const data = await cached(cacheKey, 5 * 60 * 1000, () => fetchRealMatches(champId, region));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg, matches: [], total: 0 }, { status: 500 });
  }
}

async function fetchRealMatches(champId: string, platform: string) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const platHost = `https://${platform}.api.riotgames.com`;
  const regHost = `https://${p.regional}.api.riotgames.com`;

  // 1. Leaderboard (Challenger/GM/Master) — nomes REAIS
  const tiers = ["challengerleagues", "grandmasterleagues", "masterleagues"];
  const players: { summonerId: string; summonerName: string; tier: string; rank: string; lp: number }[] = [];

  for (const tier of tiers) {
    try {
      const url = `${platHost}/lol/league/v4/${tier}/by-queue/RANKED_SOLO_5x5`;
      const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY! } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const e of (data.entries ?? [])) {
        players.push({
          summonerId: e.summonerId,
          summonerName: e.summonerName ?? "",
          tier: data.tier ?? tier.replace("leagues", ""),
          rank: e.rank ?? "",
          lp: e.leaguePoints ?? 0,
        });
      }
    } catch { continue; }
  }

  if (players.length === 0) {
    return { matches: [], total: 0, message: "Leaderboard vazio" };
  }

  // 2. Top 20 jogadores → PUUIDs
  const top20 = players.sort((a, b) => b.lp - a.lp).slice(0, 20);
  const puuids: { puuid: string; player: typeof top20[0] }[] = [];

  for (const player of top20) {
    try {
      const url = `${platHost}/lol/summoner/v4/summoners/${encodeURIComponent(player.summonerId)}`;
      const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY! } });
      if (!res.ok) continue;
      const d = await res.json();
      puuids.push({ puuid: d.puuid, player });
      await sleep(50);
    } catch { continue; }
  }

  // 3. Histórico de partidas dos jogadores
  const matchIds: { mid: string; puuid: string; player: typeof top20[0] }[] = [];

  for (const { puuid, player } of puuids) {
    try {
      const url = `${regHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`;
      const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY! } });
      if (!res.ok) continue;
      const ids: string[] = await res.json();
      for (const mid of ids) matchIds.push({ mid, puuid, player });
      await sleep(60);
    } catch { continue; }
  }

  // 4. Detalhes das partidas — filtra pelo campeão
  const unique = [...new Set(matchIds.map((m) => m.mid))].slice(0, 15);
  const matches: Record<string, unknown>[] = [];

  for (const mid of unique) {
    try {
      const url = `${regHost}/lol/match/v5/matches/${mid}`;
      const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY! } });
      if (!res.ok) continue;
      const match = await res.json();
      const info = match.info;
      if (!info?.participants) continue;

      const part = info.participants.find(
        (p: { championName: string }) => p.championName?.toLowerCase() === champId.toLowerCase()
      );
      if (!part) continue;

      const src = matchIds.find((m) => m.mid === mid && m.puuid === part.puuid);
      const player = src?.player;

      const items = [part.item0, part.item1, part.item2, part.item3, part.item4, part.item5, part.item6]
        .filter((i: number) => i > 0).map(String);

      const dur = info.gameDuration ?? 0;
      const m = Math.floor(dur / 60);
      const s = dur % 60;

      // Busca riotId pelo summonerName original
      const riotName = part.riotIdGameName ?? part.summonerName ?? "";
      const riotTag  = part.riotIdTagline ?? "";

      matches.push({
        matchId: mid,
        summonerName: riotName || player?.summonerName || "Invocador",
        tagLine: riotTag || "",
        tier: player?.tier || "",
        rank: player?.rank || "",
        championId: part.championName ?? champId,
        win: part.win,
        kills: part.kills ?? 0,
        deaths: part.deaths ?? 0,
        assists: part.assists ?? 0,
        kda: `${part.kills ?? 0}/${part.deaths ?? 0}/${part.assists ?? 0}`,
        items,
        runes: { primary: "Riot", secondary: "Riot", keystone: "Riot" },
        summonerSpells: [String(part.summoner1Id ?? ""), String(part.summoner2Id ?? "")],
        skillOrder: "Q>W>E",
        gameDuration: `${m}:${String(s).padStart(2, "0")}`,
        gameCreation: info.gameCreation ?? Date.now(),
        queueId: info.queueId ?? 0,
        region: player?.summonerName ?? platform,
        platform,
      });
      await sleep(60);
    } catch { continue; }
  }

  return {
    matches,
    total: matches.length,
    region: platform,
    champId,
    message: `${matches.length} partidas reais encontradas`,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
