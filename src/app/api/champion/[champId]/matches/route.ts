import { NextRequest, NextResponse } from "next/server";
import { isPlatform, PLATFORMS } from "@/lib/types";
import { cached } from "@/lib/cache";

const API_KEY = process.env.RIOT_API_KEY;

// Mapeia label da UI para teamPosition da Riot API
const LANE_MAP: Record<string, string> = {
  top: "TOP",
  jungle: "JUNGLE",
  mid: "MIDDLE",
  adc: "BOTTOM",
  suporte: "UTILITY",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;
  const region = req.nextUrl.searchParams.get("region") ?? "br1";
  const lane   = req.nextUrl.searchParams.get("lane")   ?? "";

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida" }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ matches: [], total: 0, message: "API Key não configurada" });
  }

  // Cache separado por região + rota — versão v4 (lane filter + timeline + 6 slots)
  const cacheKey = `champion-matches-v4:${champId}:${region}:${lane}`;

  try {
    const data = await cached(cacheKey, 30 * 60 * 1000, () =>
      fetchRealMatches(champId, region, lane)
    );
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

async function fetchRealMatches(champId: string, platform: string, lane: string) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const platHost = `https://${platform}.api.riotgames.com`;
  const regHost  = `https://${p.regional}.api.riotgames.com`;

  const champNumId = await getChampionNumericId(champId);
  if (!champNumId) {
    return { matches: [], total: 0, message: `Campeão ${champId} não encontrado no DDragon` };
  }

  // Challenger + Grandmaster + Master (Diamond 4 → Challenger coberto)
  const tiers = ["challengerleagues", "grandmasterleagues", "masterleagues"];
  const allPlayers: { puuid: string; tier: string; lp: number; rank: string }[] = [];

  for (const tier of tiers) {
    try {
      const res = await riotFetch(`${platHost}/lol/league/v4/${tier}/by-queue/RANKED_SOLO_5x5`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const entry of data.entries ?? []) {
        if (!entry.puuid) continue;
        allPlayers.push({
          puuid: entry.puuid,
          tier:  data.tier  ?? "CHALLENGER",
          lp:    entry.leaguePoints ?? 0,
          rank:  entry.rank ?? "I",
        });
      }
    } catch { continue; }
  }

  if (allPlayers.length === 0) {
    return { matches: [], total: 0, message: "Leaderboard vazio — verifique a API Key" };
  }

  const top100 = allPlayers.sort((a, b) => b.lp - a.lp).slice(0, 100);

  // Últimos 30 dias (startTime em segundos Unix)
  const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  type MatchCandidate = { matchId: string; puuid: string; tier: string; rank: string; lp: number };
  const champMatchIds: MatchCandidate[] = [];
  const TARGET = 10;
  const BATCH = 5;

  for (let i = 0; i < top100.length; i += BATCH) {
    if (champMatchIds.length >= TARGET) break;
    const batch = top100.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const url =
            `${regHost}/lol/match/v5/matches/by-puuid/${player.puuid}/ids` +
            `?champion=${champNumId}&queue=420&count=3&startTime=${startTime}`;
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
    await sleep(250);
  }

  if (champMatchIds.length === 0) {
    return {
      matches: [],
      total: 0,
      message: `Nenhum jogo de ${champId} nos últimos 30 dias no Challenger/GM/Master de ${platform}`,
    };
  }

  const seenIds = new Set<string>();
  const uniqueCandidates = champMatchIds.filter((m) => {
    if (seenIds.has(m.matchId)) return false;
    seenIds.add(m.matchId);
    return true;
  }).slice(0, TARGET);

  // Lane filter: converte label da UI para teamPosition da API
  const laneFilter = lane ? (LANE_MAP[lane.toLowerCase()] ?? "") : "";

  // Detalhe das partidas
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

          const part = info.participants.find(
            (pp: { championName: string }) =>
              pp.championName?.toLowerCase() === champId.toLowerCase()
          );
          if (!part) return null;

          // Filtro de rota real: teamPosition da Riot API
          const teamPosition: string = part.teamPosition ?? part.individualPosition ?? "";
          if (laneFilter && teamPosition !== laneFilter) return null;

          const riotName = part.riotIdGameName ?? part.summonerName ?? "";
          const riotTag  = part.riotIdTagline  ?? "";

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

          const dur = info.gameDuration ?? 0;
          const mm  = Math.floor(dur / 60);
          const ss  = dur % 60;

          const totalMinionsKilled   = part.totalMinionsKilled   ?? 0;
          const neutralMinionsKilled = part.neutralMinionsKilled ?? 0;
          const cs       = totalMinionsKilled + neutralMinionsKilled;
          const csPerMin = dur > 0 ? +(cs / (dur / 60)).toFixed(1) : 0;

          const teamId    = part.teamId;
          const teamKills = info.participants
            .filter((pp: { teamId: number }) => pp.teamId === teamId)
            .reduce((sum: number, pp: { kills: number }) => sum + (pp.kills ?? 0), 0);

          const killParticipation =
            teamKills > 0
              ? Math.round(((part.kills ?? 0) + (part.assists ?? 0)) / teamKills * 100)
              : 0;

          // 6 slots de itens principais (0–5); slot 6 é ward/trindade
          const items = [
            String(part.item0 ?? 0), String(part.item1 ?? 0),
            String(part.item2 ?? 0), String(part.item3 ?? 0),
            String(part.item4 ?? 0), String(part.item5 ?? 0),
          ];

          return {
            matchId:   candidate.matchId,
            // puuid guardado temporariamente para buscar timeline depois
            _champPuuid: part.puuid ?? "",
            summonerName: riotName || "Invocador",
            tagLine:   riotTag,
            tier:      candidate.tier  || "CHALLENGER",
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
            skillOrder: "",  // preenchido depois pelo timeline
            gameDuration:        `${mm}:${String(ss).padStart(2, "0")}`,
            gameDurationSeconds: dur,
            gameCreation: info.gameCreation ?? Date.now(),
            queueId:  info.queueId ?? 0,
            region:   platform,
            platform,
            lane: teamPosition,
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

  // ── Skill order via Match Timeline API ────────────────────────────────────
  const SKILL_SLOT: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };

  for (let i = 0; i < matches.length; i += 5) {
    const batch = matches.slice(i, i + 5);

    await Promise.all(
      batch.map(async (match) => {
        const matchId    = match.matchId as string;
        const champPuuid = match._champPuuid as string;
        if (!matchId || !champPuuid) return;
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/timelines/${matchId}`);
          if (!res.ok) return;
          const data = await res.json();

          // Encontra o participantId pelo puuid do campeão
          const tlParticipants: Array<{ participantId: number; puuid: string }> =
            data.info?.participants ?? [];
          const tlParticipant = tlParticipants.find((p) => p.puuid === champPuuid);
          if (!tlParticipant) return;

          const pid = tlParticipant.participantId;

          // Coleta eventos SKILL_LEVEL_UP para esse participante
          const skillEvents: Array<{ timestamp: number; skillSlot: number }> = [];
          for (const frame of data.info?.frames ?? []) {
            for (const event of frame.events ?? []) {
              if (
                event.type === "SKILL_LEVEL_UP" &&
                event.participantId === pid &&
                event.levelUpType === "NORMAL"
              ) {
                skillEvents.push({ timestamp: event.timestamp, skillSlot: event.skillSlot });
              }
            }
          }

          skillEvents.sort((a, b) => a.timestamp - b.timestamp);
          match.skillOrder = skillEvents.map((e) => SKILL_SLOT[e.skillSlot] ?? "?").join("");
        } catch {
          // Sem timeline: mantém skillOrder vazio
        }
      })
    );

    await sleep(250);
  }

  // Remove campo interno _champPuuid antes de retornar
  for (const m of matches) {
    delete (m as Record<string, unknown>)._champPuuid;
  }

  return {
    matches,
    total:   matches.length,
    region:  platform,
    champId,
    message: `${matches.length} partidas reais encontradas`,
  };
}
