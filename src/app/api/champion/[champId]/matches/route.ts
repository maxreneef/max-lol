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

  // Cache por 30 minutos — partidas de high elo mudam lentamente
  const cacheKey = `champion-matches-v3:${champId}:${region}`;

  try {
    const data = await cached(cacheKey, 30 * 60 * 1000, () => fetchRealMatches(champId, region));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg, matches: [], total: 0 }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function riotFetch(url: string): Promise<Response> {
  return fetch(url, { headers: { "X-Riot-Token": API_KEY! } });
}

/** Resolve o ID numérico do campeão a partir do DDragon */
async function getChampionNumericId(champName: string): Promise<number | null> {
  try {
    const res = await fetch(
      "https://ddragon.leagueoflegends.com/cdn/15.11.1/data/en_US/champion.json",
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const champ = data.data?.[champName];
    return champ ? Number(champ.key) : null;
  } catch {
    return null;
  }
}

// ── Rota principal ────────────────────────────────────────────────────────────

async function fetchRealMatches(champId: string, platform: string) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const platHost = `https://${platform}.api.riotgames.com`;
  const regHost  = `https://${p.regional}.api.riotgames.com`;

  // 1. ID numérico do campeão (necessário para filtrar na API de match history)
  const champNumId = await getChampionNumericId(champId);
  if (!champNumId) {
    return { matches: [], total: 0, message: `Campeão ${champId} não encontrado no DDragon` };
  }

  // 2. Leaderboard Challenger + GM — a API já retorna puuid diretamente!
  const tiers = ["challengerleagues", "grandmasterleagues"];
  const allPlayers: { puuid: string; tier: string; lp: number; rank: string }[] = [];

  for (const tier of tiers) {
    try {
      const res = await riotFetch(`${platHost}/lol/league/v4/${tier}/by-queue/RANKED_SOLO_5x5`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const entry of data.entries ?? []) {
        if (!entry.puuid) continue;
        allPlayers.push({
          puuid:  entry.puuid,
          tier:   data.tier  ?? "Challenger",
          lp:     entry.leaguePoints ?? 0,
          rank:   entry.rank ?? "I",
        });
      }
    } catch { continue; }
  }

  if (allPlayers.length === 0) {
    return { matches: [], total: 0, message: "Leaderboard vazio — verifique a API Key" };
  }

  // Ordena por LP e pega até 100 jogadores (5 batches × 20 = 100 chamadas → seguro no rate limit)
  const top200 = allPlayers.sort((a, b) => b.lp - a.lp).slice(0, 100);

  // 3. Busca match IDs filtrados pelo campeão (batches de 5 paralelos)
  //    Com o filtro &champion=, a API retorna APENAS partidas desse campeão.
  //    Para quem não joga o campeão → retorno imediato com []. Eficiente!
  type MatchCandidate = { matchId: string; puuid: string; tier: string; rank: string; lp: number };
  const champMatchIds: MatchCandidate[] = [];
  const TARGET = 10; // 10 matches → 2 batches de detalhes = rápido
  const BATCH = 5;

  for (let i = 0; i < top200.length; i += BATCH) {
    if (champMatchIds.length >= TARGET) break;
    const batch = top200.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const url =
            `${regHost}/lol/match/v5/matches/by-puuid/${player.puuid}/ids` +
            `?champion=${champNumId}&queue=420&count=3`;
          const res = await riotFetch(url);
          if (!res.ok) return [];
          const ids: string[] = await res.json();
          return ids.map((id) => ({ matchId: id, ...player }));
        } catch {
          return [];
        }
      })
    );

    for (const r of results) champMatchIds.push(...r);
    // 5 req por batch ÷ 250ms = 20 req/s — respeita exatamente o limite da Riot
    await sleep(250);
  }

  if (champMatchIds.length === 0) {
    return {
      matches: [],
      total: 0,
      message: `Nenhum jogo de ${champId} encontrado no Challenger/GM de ${platform}`,
    };
  }

  // Deduplica match IDs
  const seenIds = new Set<string>();
  const uniqueCandidates = champMatchIds.filter((m) => {
    if (seenIds.has(m.matchId)) return false;
    seenIds.add(m.matchId);
    return true;
  }).slice(0, TARGET);

  // 4. Detalhes das partidas (batches de 5 paralelos)
  const matches: Record<string, unknown>[] = [];

  for (let i = 0; i < uniqueCandidates.length; i += 5) {
    const batch = uniqueCandidates.slice(i, i + 5);

    const results = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/matches/${candidate.matchId}`);
          if (!res.ok) return null;
          const match = await res.json();
          const info = match.info;
          if (!info?.participants) return null;

          // Encontra o participante que jogou o campeão
          const part = info.participants.find(
            (pp: { championName: string }) =>
              pp.championName?.toLowerCase() === champId.toLowerCase()
          );
          if (!part) return null;

          // Nome do jogador vem dos dados da partida (riotIdGameName/tagLine)
          const riotName = part.riotIdGameName ?? part.summonerName ?? "";
          const riotTag  = part.riotIdTagline  ?? "";

          // Runas
          const primaryStyle  = part.perks?.styles?.[0]?.style ?? 0;
          const subStyle      = part.perks?.styles?.[1]?.style ?? 0;
          const primaryRuneId = part.perks?.styles?.[0]?.selections?.[0]?.perk ?? 0;

          const runeSelections: number[] =
            (part.perks?.styles?.[0]?.selections ?? []).map(
              (s: { perk: number }) => s.perk
            );
          const subSelections: number[] =
            (part.perks?.styles?.[1]?.selections ?? []).map(
              (s: { perk: number }) => s.perk
            );
          const statShards: number[] = Object.values(
            part.perks?.statPerks ?? {}
          ).filter((v): v is number => typeof v === "number");

          const spell1Id = part.summoner1Id ?? 0;
          const spell2Id = part.summoner2Id ?? 0;
          const lane     = part.teamPosition ?? part.lane ?? "";

          const dur = info.gameDuration ?? 0;
          const mm  = Math.floor(dur / 60);
          const ss  = dur % 60;

          const totalMinionsKilled   = part.totalMinionsKilled   ?? 0;
          const neutralMinionsKilled = part.neutralMinionsKilled ?? 0;
          const cs      = totalMinionsKilled + neutralMinionsKilled;
          const csPerMin = dur > 0 ? +(cs / (dur / 60)).toFixed(1) : 0;

          const teamId   = part.teamId;
          const teamKills = info.participants
            .filter((pp: { teamId: number }) => pp.teamId === teamId)
            .reduce((sum: number, pp: { kills: number }) => sum + (pp.kills ?? 0), 0);

          const killParticipation =
            teamKills > 0
              ? Math.round(((part.kills ?? 0) + (part.assists ?? 0)) / teamKills * 100)
              : 0;

          const items = [
            part.item0, part.item1, part.item2,
            part.item3, part.item4, part.item5, part.item6,
          ].filter((id: number) => id > 0).map(String);

          // Ordem de habilidades (disponível no campo challenges em alguns patches)
          let skillOrder = "";
          if (typeof part.challenges?.skillOrder === "string") {
            skillOrder = part.challenges.skillOrder;
          }

          return {
            matchId:   candidate.matchId,
            summonerName: riotName || "Invocador",
            tagLine:   riotTag,
            tier:      candidate.tier  || "Challenger",
            rank:      candidate.rank  || "I",
            lp:        candidate.lp    || 0,
            championId: part.championName ?? champId,
            win:    part.win,
            kills:  part.kills   ?? 0,
            deaths: part.deaths  ?? 0,
            assists: part.assists ?? 0,
            kda:    `${part.kills ?? 0}/${part.deaths ?? 0}/${part.assists ?? 0}`,
            items,
            runes: {
              primary:    primaryStyle ? String(primaryStyle) : "",
              secondary:  subStyle     ? String(subStyle)     : "",
              keystone:   primaryRuneId ? String(primaryRuneId) : "",
              primaryStyle,
              subStyle,
              primaryRuneId,
              runeSelections,
              subSelections,
              statShards,
            },
            summonerSpells: [String(spell1Id), String(spell2Id)],
            spell1Id,
            spell2Id,
            skillOrder,
            gameDuration:        `${mm}:${String(ss).padStart(2, "0")}`,
            gameDurationSeconds: dur,
            gameCreation: info.gameCreation ?? Date.now(),
            queueId:  info.queueId ?? 0,
            region:   platform,
            platform,
            // Campos para o buildAggregator
            lane,
            primaryStyle,
            subStyle,
            primaryRuneId,
            runeSelections,
            subSelections,
            statShards,
            item0: part.item0 ?? 0,
            item1: part.item1 ?? 0,
            item2: part.item2 ?? 0,
            item3: part.item3 ?? 0,
            item4: part.item4 ?? 0,
            item5: part.item5 ?? 0,
            item6: part.item6 ?? 0,
            totalMinionsKilled,
            neutralMinionsKilled,
            cs,
            csPerMin,
            teamKills,
            killParticipation,
            goldEarned:                   part.goldEarned                   ?? 0,
            totalDamageDealtToChampions:  part.totalDamageDealtToChampions  ?? 0,
          };
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (r !== null) matches.push(r);
    }

    await sleep(250);
  }

  return {
    matches,
    total:   matches.length,
    region:  platform,
    champId,
    message: `${matches.length} partidas reais encontradas`,
  };
}
