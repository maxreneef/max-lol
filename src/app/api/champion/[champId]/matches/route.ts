import { NextRequest, NextResponse } from "next/server";
import { isPlatform, PLATFORMS } from "@/lib/types";
import { cached } from "@/lib/cache";

const API_KEY = process.env.RIOT_API_KEY;

// Mapeia label da UI → teamPosition da Riot API
const LANE_MAP: Record<string, string> = {
  top:     "TOP",
  jungle:  "JUNGLE",
  mid:     "MIDDLE",
  adc:     "BOTTOM",
  suporte: "UTILITY",
};

// Prioridade de tier para ordenação (menor = melhor)
const TIER_ORDER: Record<string, number> = {
  CHALLENGER:  0,
  GRANDMASTER: 1,
  MASTER:      2,
  DIAMOND:     3,
};
const DIV_ORDER: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };

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

  // v5: inclui Diamond + sort por tier
  const cacheKey = `champion-matches-v5:${champId}:${region}:${lane}`;

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

type Player = { puuid: string; tier: string; rank: string; lp: number };

/** Ordem de busca: Challenger > GM > Master > D1 > D2 > D3 > D4 */
function playerSortKey(p: Player): number {
  const t = (TIER_ORDER[p.tier.toUpperCase()] ?? 99) * 10_000;
  const d = (DIV_ORDER[p.rank]             ?? 0)  *  1_000;
  return t + d - p.lp; // menor = mais prioritário
}

async function fetchRealMatches(champId: string, platform: string, lane: string) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const platHost = `https://${platform}.api.riotgames.com`;
  const regHost  = `https://${p.regional}.api.riotgames.com`;

  const champNumId = await getChampionNumericId(champId);
  if (!champNumId) {
    return { matches: [], total: 0, message: `Campeão ${champId} não encontrado no DDragon` };
  }

  const allPlayers: Player[] = [];

  // ── 1. Apex tiers (uma chamada cada, retorna todos os jogadores com puuid) ──
  const apexTiers = [
    { endpoint: "challengerleagues", tier: "CHALLENGER" },
    { endpoint: "grandmasterleagues", tier: "GRANDMASTER" },
    { endpoint: "masterleagues", tier: "MASTER" },
  ];

  const apexResults = await Promise.all(
    apexTiers.map(async ({ endpoint, tier }) => {
      try {
        const res = await riotFetch(
          `${platHost}/lol/league/v4/${endpoint}/by-queue/RANKED_SOLO_5x5`
        );
        if (!res.ok) return [];
        const data = await res.json();
        const players: Player[] = [];
        for (const entry of data.entries ?? []) {
          if (!entry.puuid) continue;
          players.push({
            puuid: entry.puuid,
            tier,
            lp:   entry.leaguePoints ?? 0,
            rank: entry.rank ?? "I",
          });
        }
        return players;
      } catch {
        return [];
      }
    })
  );
  for (const batch of apexResults) allPlayers.push(...batch);

  await sleep(250); // respeita rate limit após 3 chamadas paralelas

  // ── 2. Diamond D1–D4 via endpoint paginado /entries ──
  //    Busca 2 páginas do D1 e 1 página de D2, D3, D4 em paralelo
  const diamondRequests: Array<{ div: string; page: number }> = [
    { div: "I", page: 1 }, { div: "I", page: 2 },
    { div: "II",  page: 1 },
    { div: "III", page: 1 },
    { div: "IV",  page: 1 },
  ];

  const diamondResults = await Promise.all(
    diamondRequests.map(async ({ div, page }) => {
      try {
        const res = await riotFetch(
          `${platHost}/lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/${div}?page=${page}`
        );
        if (!res.ok) return [];
        const entries: Array<{ puuid?: string; leaguePoints?: number }> = await res.json();
        if (!Array.isArray(entries) || entries.length === 0) return [];
        return entries
          .filter((e) => !!e.puuid)
          .map((e) => ({
            puuid: e.puuid!,
            tier: "DIAMOND",
            lp:   e.leaguePoints ?? 0,
            rank: div,           // I, II, III, IV
          } satisfies Player));
      } catch {
        return [];
      }
    })
  );
  for (const batch of diamondResults) allPlayers.push(...batch);

  if (allPlayers.length === 0) {
    return { matches: [], total: 0, message: "Leaderboard vazio — verifique a API Key" };
  }

  // ── 3. Ordena: Challenger > GM > Master > D1 > D2 > D3 > D4, depois por LP ──
  const sorted = allPlayers
    .sort((a, b) => playerSortKey(a) - playerSortKey(b))
    .slice(0, 300); // pool ampliado para cobrir Diamond

  // ── 4. Últimos 30 dias ──
  const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // Converte filtro de rota
  const laneFilter = lane ? (LANE_MAP[lane.toLowerCase()] ?? "") : "";

  type MatchCandidate = Player & { matchId: string };
  const champMatchIds: MatchCandidate[] = [];
  const TARGET = 10;
  const BATCH  = 5;

  // ── 5. Busca match IDs filtrados pelo campeão ──
  for (let i = 0; i < sorted.length; i += BATCH) {
    if (champMatchIds.length >= TARGET) break;
    const batch = sorted.slice(i, i + BATCH);

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
      message: `Nenhum jogo de ${champId} nos últimos 30 dias no Diamond–Challenger de ${platform}`,
    };
  }

  // Deduplica
  const seenIds = new Set<string>();
  const unique = champMatchIds.filter((m) => {
    if (seenIds.has(m.matchId)) return false;
    seenIds.add(m.matchId);
    return true;
  }).slice(0, TARGET);

  // ── 6. Detalhe das partidas ──
  const matches: Record<string, unknown>[] = [];

  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);

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

          // Filtro de rota real
          const teamPosition: string = part.teamPosition ?? part.individualPosition ?? "";
          if (laneFilter && teamPosition !== laneFilter) return null;

          const riotName = part.riotIdGameName ?? part.summonerName ?? "";
          const riotTag  = part.riotIdTagline  ?? "";

          const primaryStyle  = part.perks?.styles?.[0]?.style ?? 0;
          const subStyle      = part.perks?.styles?.[1]?.style ?? 0;
          const primaryRuneId = part.perks?.styles?.[0]?.selections?.[0]?.perk ?? 0;
          const runeSelections: number[] = (part.perks?.styles?.[0]?.selections ?? []).map(
            (s: { perk: number }) => s.perk
          );
          const subSelections: number[] = (part.perks?.styles?.[1]?.selections ?? []).map(
            (s: { perk: number }) => s.perk
          );
          const statShards: number[] = Object.values(part.perks?.statPerks ?? {}).filter(
            (v): v is number => typeof v === "number"
          );

          const spell1Id = part.summoner1Id ?? 0;
          const spell2Id = part.summoner2Id ?? 0;

          const dur  = info.gameDuration ?? 0;
          const mm   = Math.floor(dur / 60);
          const ss   = dur % 60;

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

          // 6 slots de itens (0–5); slot 6 = ward/trindade (excluído da tabela)
          const items = [
            String(part.item0 ?? 0), String(part.item1 ?? 0),
            String(part.item2 ?? 0), String(part.item3 ?? 0),
            String(part.item4 ?? 0), String(part.item5 ?? 0),
          ];

          return {
            matchId:      candidate.matchId,
            _champPuuid:  part.puuid ?? "",   // removido antes de retornar
            summonerName: riotName || "Invocador",
            tagLine:      riotTag,
            tier:         candidate.tier  || "DIAMOND",
            rank:         candidate.rank  || "IV",
            lp:           candidate.lp    || 0,
            championId:   part.championName ?? champId,
            win:          part.win,
            kills:        part.kills   ?? 0,
            deaths:       part.deaths  ?? 0,
            assists:      part.assists ?? 0,
            kda:          `${part.kills ?? 0}/${part.deaths ?? 0}/${part.assists ?? 0}`,
            items,
            runes: {
              primary:      primaryStyle  ? String(primaryStyle)  : "",
              secondary:    subStyle      ? String(subStyle)      : "",
              keystone:     primaryRuneId ? String(primaryRuneId) : "",
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
            skillOrder:          "",   // preenchido pela timeline abaixo
            gameDuration:        `${mm}:${String(ss).padStart(2, "0")}`,
            gameDurationSeconds: dur,
            gameCreation:        info.gameCreation ?? Date.now(),
            queueId:             info.queueId ?? 0,
            region:              platform,
            platform,
            lane:                teamPosition,
            primaryStyle,
            subStyle,
            primaryRuneId,
            runeSelections,
            subSelections,
            statShards,
            item0: part.item0 ?? 0, item1: part.item1 ?? 0,
            item2: part.item2 ?? 0, item3: part.item3 ?? 0,
            item4: part.item4 ?? 0, item5: part.item5 ?? 0,
            item6: part.item6 ?? 0,
            totalMinionsKilled,
            neutralMinionsKilled,
            cs,
            csPerMin,
            teamKills,
            killParticipation,
            goldEarned:                  part.goldEarned                  ?? 0,
            totalDamageDealtToChampions: part.totalDamageDealtToChampions ?? 0,
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

  // ── 7. Skill order via Match Timeline API ──
  const SKILL_SLOT: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };

  for (let i = 0; i < matches.length; i += 5) {
    const batch = matches.slice(i, i + 5);

    await Promise.all(
      batch.map(async (match) => {
        const matchId    = match.matchId    as string;
        const champPuuid = match._champPuuid as string;
        if (!matchId || !champPuuid) return;
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/timelines/${matchId}`);
          if (!res.ok) return;
          const data = await res.json();

          // Encontra o participantId pelo puuid do campeão
          const tlParticipants: Array<{ participantId: number; puuid: string }> =
            data.info?.participants ?? [];
          const tlPart = tlParticipants.find((x) => x.puuid === champPuuid);
          if (!tlPart) return;

          const pid = tlPart.participantId;

          // Coleta SKILL_LEVEL_UP ordenados por timestamp
          const skillEvents: Array<{ timestamp: number; skillSlot: number }> = [];
          for (const frame of data.info?.frames ?? []) {
            for (const ev of frame.events ?? []) {
              if (
                ev.type === "SKILL_LEVEL_UP" &&
                ev.participantId === pid &&
                ev.levelUpType === "NORMAL"
              ) {
                skillEvents.push({ timestamp: ev.timestamp, skillSlot: ev.skillSlot });
              }
            }
          }
          skillEvents.sort((a, b) => a.timestamp - b.timestamp);
          match.skillOrder = skillEvents.map((e) => SKILL_SLOT[e.skillSlot] ?? "?").join("");
        } catch {
          // Sem timeline disponível — mantém skillOrder vazio
        }
      })
    );
    await sleep(250);
  }

  // Remove campo interno antes de retornar
  for (const m of matches) delete (m as Record<string, unknown>)._champPuuid;

  return {
    matches,
    total:   matches.length,
    region:  platform,
    champId,
    tiers:   [...new Set(matches.map((m) => m.tier as string))],
    message: `${matches.length} partidas reais (Diamond–Challenger) encontradas`,
  };
}
