import { DD_BASE } from "@/lib/ddragon";
import { NextRequest, NextResponse } from "next/server";
import { isPlatform, PLATFORMS } from "@/lib/types";
import { cached } from "@/lib/cache";
import { hasDB, getStoredMatches, getOtpPlayers } from "@/lib/matchStore";

// Permite até 60 s no Vercel (busca em várias fases)
export const maxDuration = 60;

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
  EMERALD:     4,
};
const DIV_ORDER: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };

// ── Orçamento de requisições (dev key = 100 req / 2 min por região) ──
//   br1 (plataforma): leaderboard (8) + mastery scan (MASTERY_SCAN)
//   americas (regional): match IDs (MAX_CANDIDATES) + detalhes (DETAIL_BUDGET) + timelines (≤ count)
//
// Em tempo real, os "mains" de um campeão se concentram no topo (Challenger/GM);
// escanear esse topo e ler os maiores one-tricks maximiza o volume da amostra.
const MASTERY_SCAN   = 80; // top N jogadores cujo lastPlayTime do campeão é verificado
const MAX_CANDIDATES = 15; // quantos "mains" (ordenados por maestria) têm o histórico lido
const MATCH_IDS_PER  = 40; // match IDs ranqueados por candidato
const DETAIL_BUDGET  = 60; // teto de detalhes baixados (para ao atingir o count alvo)
const REVALIDATE     = 30 * 60; // 30 min no Vercel Data Cache (persiste entre invocações)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;
  const region     = req.nextUrl.searchParams.get("region") ?? "br1";
  const lane       = req.nextUrl.searchParams.get("lane")   ?? "";
  const rawCount   = parseInt(req.nextUrl.searchParams.get("count") ?? "20", 10);
  const count      = Math.min(Math.max(rawCount, 5), 500);
  const minMastery = parseInt(req.nextUrl.searchParams.get("minMastery") ?? "0", 10);

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida" }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ matches: [], total: 0, message: "API Key não configurada" });
  }

  const laneFilter = lane ? (LANE_MAP[lane.toLowerCase()] ?? "") : "";

  // ── 1. BANCO (preenchido pelo robô /api/cron/scan): leitura instantânea ──
  if (hasDB) {
    try {
      // Modo One-Trick (minMastery > 0): consulta tabela otp_mastery pré-computada
      if (minMastery > 0) {
        const otpPlayers = await getOtpPlayers(region, champId, minMastery);
        if (otpPlayers.length > 0) {
          const otpPuuids = otpPlayers.map((p) => p.puuid);
          const stored = await getStoredMatches(region, champId, {
            lane: laneFilter || undefined,
            limit: count,
            puuids: otpPuuids,
          });
          if (stored.length > 0) {
            return NextResponse.json({
              matches: stored,
              total: stored.length,
              region,
              champId,
              source: "db",
              tiers: [...new Set(stored.map((m) => (m as Record<string, unknown>).tier as string))],
              otpPlayers: otpPlayers.length,
              message: `${stored.length} partidas de One-Tricks (${minMastery.toLocaleString()}+ maestria) — banco`,
            });
          }
          // Se tem OTPs mas nenhuma partida no banco, busca ao vivo só deles
          const liveCount = Math.min(count, 20);
          const cacheKey = `champion-matches-v14:${champId}:${region}:${lane}:${liveCount}:otp`;
          try {
            const data = await cached(cacheKey, 30 * 60 * 1000, () =>
              fetchRealMatchesForPlayers(champId, region, lane, liveCount, otpPlayers)
            );
            return NextResponse.json({ ...data, source: "live-otp", otpPlayers: otpPlayers.length });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro desconhecido";
            return NextResponse.json({ error: msg, matches: [], total: 0 }, { status: 500 });
          }
        }
        // OTP table vazia — fallback para busca ao vivo tradicional
      }

      // Modo normal (todos os elos): leitura direta do banco
      if (minMastery === 0) {
        const stored = await getStoredMatches(region, champId, {
          lane: laneFilter || undefined,
          limit: count,
        });
        if (stored.length > 0) {
          return NextResponse.json({
            matches: stored,
            total: stored.length,
            region,
            champId,
            source: "db",
            tiers: [...new Set(stored.map((m) => (m as Record<string, unknown>).tier as string))],
            message: `${stored.length} partidas reais de ${champId} (banco — Diamante a Desafiante)`,
          });
        }
      }
    } catch {
      /* banco indisponível → cai na busca ao vivo */
    }
  }

  // ── 2. AO VIVO (fallback enquanto o robô ainda não indexou este campeão) ──
  const liveCount = Math.min(count, 20);
  const cacheKey = `champion-matches-v14:${champId}:${region}:${lane}:${liveCount}:m${minMastery}`;

  try {
    const data = await cached(cacheKey, 30 * 60 * 1000, () =>
      fetchRealMatches(champId, region, lane, liveCount, minMastery)
    );
    return NextResponse.json({ ...data, source: "live" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg, matches: [], total: 0 }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch à Riot API usando o Vercel Data Cache (persiste entre invocações
 * serverless — diferente do Map em memória). Cache hits NÃO consomem o
 * rate limit da Riot, então page-loads repetidos ficam baratos e rápidos.
 */
async function riotFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "X-Riot-Token": API_KEY! },
    next: { revalidate: REVALIDATE },
  });
}

async function getChampionNumericId(champName: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${DD_BASE}/data/en_US/champion.json`,
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

type Player = { puuid: string; tier: string; rank: string; lp: number; points?: number };

/** Ordem de prioridade: Challenger > GM > Master > D1 > D2 > D3 > D4, depois LP */
function playerSortKey(p: Player): number {
  const t = (TIER_ORDER[p.tier.toUpperCase()] ?? 99) * 10_000;
  const d = (DIV_ORDER[p.rank]             ?? 0)  *  1_000;
  return t + d - p.lp; // menor = mais prioritário
}

async function fetchRealMatches(champId: string, platform: string, lane: string, count = 20, minMastery = 0) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const platHost = `https://${platform}.api.riotgames.com`;
  const regHost  = `https://${p.regional}.api.riotgames.com`;

  const champNumId = await getChampionNumericId(champId);
  if (!champNumId) {
    return { matches: [], total: 0, message: `Campeão ${champId} não encontrado no DDragon` };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 1 — Leaderboard (host plataforma): Challenger + GM + Master + Diamond
  // ════════════════════════════════════════════════════════════════════════════
  const allPlayers: Player[] = [];

  const apexTiers = [
    { endpoint: "challengerleagues",  tier: "CHALLENGER" },
    { endpoint: "grandmasterleagues", tier: "GRANDMASTER" },
    { endpoint: "masterleagues",      tier: "MASTER" },
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

  await sleep(300);

  // Fetch dinamico: continua paginando ate resposta vazia
  async function fetchAllPages(div: string, tier: string, maxPages = 50): Promise<Player[]> {
    const out: Player[] = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const tierPath = tier === "EMERALD" ? "EMERALD" : "DIAMOND";
        const res = await riotFetch(
          `${platHost}/lol/league/v4/entries/RANKED_SOLO_5x5/${tierPath}/${div}?page=${page}`
        );
        if (!res.ok) break;
        const entries: Array<{ puuid?: string; leaguePoints?: number }> = await res.json();
        if (!Array.isArray(entries) || entries.length === 0) break;
        for (const e of entries) {
          if (!e.puuid) continue;
          out.push({ puuid: e.puuid, tier, lp: e.leaguePoints ?? 0, rank: div } satisfies Player);
        }
        if (entries.length < 200) break;
        await sleep(50);
      } catch { break; }
    }
    return out;
  }

  // Diamond I–IV e Emerald I (todas as paginas)
  for (const div of ["I", "II", "III", "IV"]) {
    const players = await fetchAllPages(div, "DIAMOND");
    for (const p of players) allPlayers.push(p);
  }

  const emeraldPlayers = await fetchAllPages("I", "EMERALD");
  for (const p of emeraldPlayers) allPlayers.push(p);

  if (allPlayers.length === 0) {
    return { matches: [], total: 0, message: "Leaderboard vazio — verifique a API Key" };
  }

  const sorted = allPlayers.sort((a, b) => playerSortKey(a) - playerSortKey(b));

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 2 — Mastery scan: descobre QUEM realmente jogou o campeão nos últimos 30d
  //   O endpoint by-puuid/ids NÃO filtra por campeão; usar maestria + lastPlayTime
  //   é o filtro correto e barato (1 req por jogador, no host plataforma).
  // ════════════════════════════════════════════════════════════════════════════
  const startTimeSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const startTimeMs  = startTimeSec * 1000;

  const scanPool = sorted.slice(0, MASTERY_SCAN);
  const candidates: Player[] = [];

  for (let i = 0; i < scanPool.length; i += 10) {
    const batch = scanPool.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const res = await riotFetch(
            `${platHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${player.puuid}/by-champion/${champNumId}`
          );
          if (!res.ok) return null; // 404 = jogador nunca jogou o campeão
          const m = await res.json();
          // Guarda os pontos de maestria para priorizar one-tricks (mais Jayce ranqueado)
          return (m.lastPlayTime ?? 0) >= startTimeMs
            ? { ...player, points: m.championPoints ?? 0 }
            : null;
        } catch {
          return null;
        }
      })
    );
    for (const r of results) if (r) candidates.push(r);
    await sleep(700); // respeita 20 req/s com folga
  }

  // ── Filtro de maestria mínima (modo "One-Trick") ──
  if (minMastery > 0) {
    const filtrados = candidates.filter((c) => (c.points ?? 0) >= minMastery);
    if (filtrados.length === 0) {
      return {
        matches: [],
        total: 0,
        tiers: [],
        message: `Nenhum jogador do topo de ${platform} tem ${minMastery.toLocaleString()}+ de maestria com ${champId} nos últimos 30 dias`,
      };
    }
    candidates.length = 0;
    candidates.push(...filtrados);
  }

  if (candidates.length === 0) {
    return {
      matches: [],
      total: 0,
      message: `Nenhum jogador do topo de ${platform} jogou ${champId} nos últimos 30 dias`,
    };
  }

  // Prioriza one-tricks: quem tem mais pontos de maestria joga o campeão com muito
  // mais frequência na ranqueada → taxa de acerto muito maior ao baixar os detalhes.
  candidates.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 3 — Match IDs ranqueados dos candidatos (host regional)
  // ════════════════════════════════════════════════════════════════════════════
  const laneFilter = lane ? (LANE_MAP[lane.toLowerCase()] ?? "") : "";
  const useCandidates = candidates.slice(0, MAX_CANDIDATES);

  type MatchCandidate = Player & { matchId: string };
  const champMatchIds: MatchCandidate[] = [];

  for (let i = 0; i < useCandidates.length; i += 10) {
    const batch = useCandidates.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const url =
            `${regHost}/lol/match/v5/matches/by-puuid/${player.puuid}/ids` +
            `?queue=420&count=${MATCH_IDS_PER}&startTime=${startTimeSec}`;
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
    await sleep(700);
  }

  // Deduplica (jogadores de alto elo se enfrentam → mesmo matchId aparece várias vezes)
  const seenIds = new Set<string>();
  const uniqueIds = champMatchIds.filter((m) => {
    if (seenIds.has(m.matchId)) return false;
    seenIds.add(m.matchId);
    return true;
  });

  if (uniqueIds.length === 0) {
    return {
      matches: [],
      total: 0,
      message: `Nenhuma partida ranqueada recente dos jogadores de ${champId} em ${platform}`,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 4 — Detalhes: baixa até atingir `count` partidas DO campeão (ou esgotar budget)
  // ════════════════════════════════════════════════════════════════════════════
  const matches: Record<string, unknown>[] = [];
  const detailPool = uniqueIds.slice(0, DETAIL_BUDGET);

  for (let i = 0; i < detailPool.length; i += 10) {
    if (matches.length >= count) break; // já temos o suficiente
    const batch = detailPool.slice(i, i + 10);

    const results = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/matches/${candidate.matchId}`);
          if (!res.ok) return null;
          const match = await res.json();
          const info = match.info;
          if (!info?.participants) return null;

          // Encontra o participante que é o CANDIDATO e jogou o campeao
          // (antes buscava qualquer Jayce na partida, podendo ser outro jogador)
          const part = info.participants.find(
            (pp: { puuid: string; championName: string }) =>
              pp.puuid === candidate.puuid &&
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

          const items = [
            String(part.item0 ?? 0), String(part.item1 ?? 0),
            String(part.item2 ?? 0), String(part.item3 ?? 0),
            String(part.item4 ?? 0), String(part.item5 ?? 0),
          ];

          // Todos os 10 participantes da partida (para exibir nomes reais no painel)
          const allParticipants = (info.participants as Array<Record<string, unknown>>).map((pp) => ({
            summonerName: (pp.riotIdGameName as string) || (pp.summonerName as string) || "",
            tagLine: (pp.riotIdTagline as string) || "",
            championId: (pp.championName as string) || "",
            teamId: pp.teamId as number,
            win: pp.win as boolean,
            puuid: pp.puuid as string,
          }));

          return {
            matchId:      candidate.matchId,
            _champPuuid:  part.puuid ?? "",
            summonerName: riotName || "Invocador",
            tagLine:      riotTag,
            tier:         candidate.tier  || "DIAMOND",
            rank:         candidate.rank  || "IV",
            lp:           candidate.lp    || 0,
            championId:   part.championName ?? champId,
            win:          part.win,
            allParticipants,
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
            skillOrder:          "",
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
            // Dano detalhado
            physicalDamageDealtToChampions: part.physicalDamageDealtToChampions ?? 0,
            magicDamageDealtToChampions:   part.magicDamageDealtToChampions   ?? 0,
            trueDamageDealtToChampions:    part.trueDamageDealtToChampions    ?? 0,
            totalDamageTaken:              part.totalDamageTaken              ?? 0,
            // Visao
            visionScore:        part.visionScore        ?? 0,
            wardsPlaced:        part.wardsPlaced        ?? 0,
            wardsKilled:        part.wardsKilled        ?? 0,
            visionWardsBought:  part.visionWardsBoughtInGame ?? 0,
            // Objetivos
            dragonKills:   part.dragonKills   ?? 0,
            baronKills:    part.baronKills    ?? 0,
            turretKills:   part.turretKills   ?? 0,
            // Outros
            champLevel:          part.champLevel          ?? 0,
            goldSpent:           part.goldSpent           ?? 0,
            totalTimeSpentDead:  part.totalTimeSpentDead  ?? 0,
            firstBloodKill:      part.firstBloodKill      ?? false,
            firstTowerKill:      part.firstTowerKill      ?? false,
            doubleKills: part.doubleKills ?? 0,
            tripleKills: part.tripleKills ?? 0,
            quadraKills: part.quadraKills ?? 0,
            pentaKills:  part.pentaKills  ?? 0,
            // Timeline (preenchido na Fase 5)
            itemPurchaseOrder: [],
            skillLevelUpOrder: [],
          };
        } catch {
          return null;
        }
      })
    );

    for (const r of results) if (r !== null) matches.push(r);
    await sleep(700);
  }

  if (matches.length === 0) {
    return {
      matches: [],
      total: 0,
      message: `Nenhuma partida de ${champId} encontrada nas ranqueadas recentes dos mains em ${platform}`,
    };
  }

  // Ordena por mais recente e corta no count alvo
  matches.sort(
    (a, b) => (b.gameCreation as number) - (a.gameCreation as number)
  );
  const finalMatches = matches.slice(0, count);

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 5 — Skill order via Match Timeline API (só das partidas exibidas)
  // ════════════════════════════════════════════════════════════════════════════
  const SKILL_SLOT: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };

  for (let i = 0; i < finalMatches.length; i += 10) {
    const batch = finalMatches.slice(i, i + 10);
    await Promise.all(
      batch.map(async (match) => {
        const matchId    = match.matchId    as string;
        const champPuuid = match._champPuuid as string;
        if (!matchId || !champPuuid) return;
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/matches/${matchId}/timeline`);
          if (!res.ok) return;
          const data = await res.json();

          const tlParticipants: Array<{ participantId: number; puuid: string }> =
            data.info?.participants ?? [];
          const tlPart = tlParticipants.find((x) => x.puuid === champPuuid);
          if (!tlPart) return;
          const pid = tlPart.participantId;

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
          match.skillLevelUpOrder = skillEvents;

          // Extrai ordem de compra de itens da timeline
          const itemPurchases: Array<{ itemId: number; timestamp: number }> = [];
          for (const frame of data.info?.frames ?? []) {
            for (const ev of frame.events ?? []) {
              if (ev.type === "ITEM_PURCHASED" && ev.participantId === pid) {
                itemPurchases.push({ itemId: ev.itemId as number, timestamp: ev.timestamp as number });
              }
            }
          }
          itemPurchases.sort((a, b) => a.timestamp - b.timestamp);
          match.itemPurchaseOrder = itemPurchases;
        } catch {
          /* sem timeline — mantém vazio */
        }
      })
    );
    await sleep(700);
  }

  for (const m of finalMatches) delete (m as Record<string, unknown>)._champPuuid;

  return {
    matches: finalMatches,
    total:   finalMatches.length,
    region:  platform,
    champId,
    tiers:   [...new Set(finalMatches.map((m) => m.tier as string))],
    scanned: { players: scanPool.length, mains: candidates.length, matchesSeen: uniqueIds.length },
    message: `${finalMatches.length} partidas reais de ${champId} (mains do topo de ${platform})`,
  };
}

/** Busca ao vivo otimizada: usa jogadores OTP já validados (sem leaderboard, sem mastery check). */
async function fetchRealMatchesForPlayers(
  champId: string,
  platform: string,
  lane: string,
  count: number,
  otpPlayers: Array<{ puuid: string; tier: string; rank: string; lp: number; points: number }>
) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  const regHost = `https://${p.regional}.api.riotgames.com`;

  const startTimeSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const laneFilter = lane ? (LANE_MAP[lane.toLowerCase()] ?? "") : "";

  const candidates = otpPlayers.slice(0, MAX_CANDIDATES);

  // ── Fase 1: Match IDs dos OTPs ──
  type MatchCandidate = { puuid: string; tier: string; rank: string; lp: number; points: number; matchId: string };
  const champMatchIds: MatchCandidate[] = [];

  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const url =
            `${regHost}/lol/match/v5/matches/by-puuid/${player.puuid}/ids` +
            `?queue=420&count=${MATCH_IDS_PER}&startTime=${startTimeSec}`;
          const res = await riotFetch(url);
          if (!res.ok) return [];
          const ids: string[] = await res.json();
          return ids.map((id) => ({ matchId: id, ...player }));
        } catch { return []; }
      })
    );
    for (const r of results) champMatchIds.push(...r);
    await sleep(700);
  }

  const seenIds = new Set<string>();
  const uniqueIds = champMatchIds.filter((m) => {
    if (seenIds.has(m.matchId)) return false;
    seenIds.add(m.matchId);
    return true;
  });

  if (uniqueIds.length === 0) {
    return {
      matches: [], total: 0,
      message: `Nenhuma partida recente dos One-Tricks de ${champId} em ${platform}`,
    };
  }

  // ── Fase 2: Detalhes das partidas ──
  const matches: Record<string, unknown>[] = [];
  const detailPool = uniqueIds.slice(0, DETAIL_BUDGET);

  for (let i = 0; i < detailPool.length; i += 10) {
    if (matches.length >= count) break;
    const batch = detailPool.slice(i, i + 10);

    const results = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/matches/${candidate.matchId}`);
          if (!res.ok) return null;
          const match = await res.json();
          const info = match.info;
          if (!info?.participants) return null;

          const part = info.participants.find(
            (pp: { puuid: string; championName: string }) =>
              pp.puuid === candidate.puuid &&
              pp.championName?.toLowerCase() === champId.toLowerCase()
          );
          if (!part) return null;

          const teamPosition: string = part.teamPosition ?? part.individualPosition ?? "";
          if (laneFilter && teamPosition !== laneFilter) return null;

          const riotName = part.riotIdGameName ?? part.summonerName ?? "";
          const riotTag  = part.riotIdTagline  ?? "";

          const primaryStyle  = part.perks?.styles?.[0]?.style ?? 0;
          const subStyle      = part.perks?.styles?.[1]?.style ?? 0;
          const primaryRuneId = part.perks?.styles?.[0]?.selections?.[0]?.perk ?? 0;
          const runeSelections: number[] = (part.perks?.styles?.[0]?.selections ?? []).map((s: { perk: number }) => s.perk);
          const subSelections: number[] = (part.perks?.styles?.[1]?.selections ?? []).map((s: { perk: number }) => s.perk);
          const statShards: number[] = Object.values(part.perks?.statPerks ?? {}).filter((v): v is number => typeof v === "number");

          const spell1Id = part.summoner1Id ?? 0;
          const spell2Id = part.summoner2Id ?? 0;

          const dur = info.gameDuration ?? 0;
          const mm = Math.floor(dur / 60);
          const ss = dur % 60;

          const totalMinionsKilled = part.totalMinionsKilled ?? 0;
          const neutralMinionsKilled = part.neutralMinionsKilled ?? 0;
          const cs = totalMinionsKilled + neutralMinionsKilled;
          const csPerMin = dur > 0 ? +(cs / (dur / 60)).toFixed(1) : 0;

          const teamId = part.teamId;
          const teamKills = info.participants
            .filter((pp: { teamId: number }) => pp.teamId === teamId)
            .reduce((sum: number, pp: { kills: number }) => sum + (pp.kills ?? 0), 0);
          const killParticipation = teamKills > 0 ? Math.round(((part.kills ?? 0) + (part.assists ?? 0)) / teamKills * 100) : 0;

          const items = [
            String(part.item0 ?? 0), String(part.item1 ?? 0),
            String(part.item2 ?? 0), String(part.item3 ?? 0),
            String(part.item4 ?? 0), String(part.item5 ?? 0),
          ];

          const allParticipants = (info.participants as Array<Record<string, unknown>>).map((pp) => ({
            summonerName: (pp.riotIdGameName as string) || (pp.summonerName as string) || "",
            tagLine: (pp.riotIdTagline as string) || "",
            championId: (pp.championName as string) || "",
            teamId: pp.teamId as number,
            win: pp.win as boolean,
            puuid: pp.puuid as string,
          }));

          return {
            matchId: candidate.matchId,
            _champPuuid: part.puuid ?? "",
            summonerName: riotName || "Invocador",
            tagLine: riotTag,
            tier: candidate.tier || "DIAMOND",
            rank: candidate.rank || "IV",
            lp: candidate.lp || 0,
            championId: part.championName ?? champId,
            win: part.win,
            allParticipants,
            kills: part.kills ?? 0, deaths: part.deaths ?? 0, assists: part.assists ?? 0,
            kda: `${part.kills ?? 0}/${part.deaths ?? 0}/${part.assists ?? 0}`,
            items,
            runes: {
              primary: primaryStyle ? String(primaryStyle) : "",
              secondary: subStyle ? String(subStyle) : "",
              keystone: primaryRuneId ? String(primaryRuneId) : "",
              primaryStyle, subStyle, primaryRuneId, runeSelections, subSelections, statShards,
            },
            summonerSpells: [String(spell1Id), String(spell2Id)],
            spell1Id, spell2Id,
            skillOrder: "",
            gameDuration: `${mm}:${String(ss).padStart(2, "0")}`,
            gameDurationSeconds: dur,
            gameCreation: info.gameCreation ?? Date.now(),
            queueId: info.queueId ?? 0,
            region: platform, platform,
            lane: teamPosition,
            primaryStyle, subStyle, primaryRuneId, runeSelections, subSelections, statShards,
            item0: part.item0 ?? 0, item1: part.item1 ?? 0, item2: part.item2 ?? 0,
            item3: part.item3 ?? 0, item4: part.item4 ?? 0, item5: part.item5 ?? 0, item6: part.item6 ?? 0,
            totalMinionsKilled, neutralMinionsKilled, cs, csPerMin, teamKills, killParticipation,
            goldEarned: part.goldEarned ?? 0,
            totalDamageDealtToChampions: part.totalDamageDealtToChampions ?? 0,
            physicalDamageDealtToChampions: part.physicalDamageDealtToChampions ?? 0,
            magicDamageDealtToChampions: part.magicDamageDealtToChampions ?? 0,
            trueDamageDealtToChampions: part.trueDamageDealtToChampions ?? 0,
            totalDamageTaken: part.totalDamageTaken ?? 0,
            visionScore: part.visionScore ?? 0,
            wardsPlaced: part.wardsPlaced ?? 0,
            wardsKilled: part.wardsKilled ?? 0,
            visionWardsBought: part.visionWardsBoughtInGame ?? 0,
            dragonKills: part.dragonKills ?? 0,
            baronKills: part.baronKills ?? 0,
            turretKills: part.turretKills ?? 0,
            champLevel: part.champLevel ?? 0,
            goldSpent: part.goldSpent ?? 0,
            totalTimeSpentDead: part.totalTimeSpentDead ?? 0,
            firstBloodKill: part.firstBloodKill ?? false,
            firstTowerKill: part.firstTowerKill ?? false,
            doubleKills: part.doubleKills ?? 0, tripleKills: part.tripleKills ?? 0,
            quadraKills: part.quadraKills ?? 0, pentaKills: part.pentaKills ?? 0,
            itemPurchaseOrder: [],
            skillLevelUpOrder: [],
          };
        } catch { return null; }
      })
    );

    for (const r of results) if (r !== null) matches.push(r);
    await sleep(700);
  }

  if (matches.length === 0) {
    return {
      matches: [], total: 0,
      message: `Nenhuma partida de ${champId} encontrada nas ranqueadas recentes dos One-Tricks em ${platform}`,
    };
  }

  matches.sort((a, b) => (b.gameCreation as number) - (a.gameCreation as number));
  const finalMatches = matches.slice(0, count);

  // ── Fase 3: Skill order via Timeline ──
  const SKILL_SLOT: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };

  for (let i = 0; i < finalMatches.length; i += 10) {
    const batch = finalMatches.slice(i, i + 10);
    await Promise.all(
      batch.map(async (match) => {
        const matchId = match.matchId as string;
        const champPuuid = match._champPuuid as string;
        if (!matchId || !champPuuid) return;
        try {
          const res = await riotFetch(`${regHost}/lol/match/v5/matches/${matchId}/timeline`);
          if (!res.ok) return;
          const data = await res.json();
          const tlParticipants: Array<{ participantId: number; puuid: string }> = data.info?.participants ?? [];
          const tlPart = tlParticipants.find((x) => x.puuid === champPuuid);
          if (!tlPart) return;
          const pid = tlPart.participantId;

          const skillEvents: Array<{ timestamp: number; skillSlot: number }> = [];
          for (const frame of data.info?.frames ?? []) {
            for (const ev of frame.events ?? []) {
              if (ev.type === "SKILL_LEVEL_UP" && ev.participantId === pid && ev.levelUpType === "NORMAL") {
                skillEvents.push({ timestamp: ev.timestamp, skillSlot: ev.skillSlot });
              }
            }
          }
          skillEvents.sort((a, b) => a.timestamp - b.timestamp);
          match.skillOrder = skillEvents.map((e) => SKILL_SLOT[e.skillSlot] ?? "?").join("");
          match.skillLevelUpOrder = skillEvents;

          const itemPurchases: Array<{ itemId: number; timestamp: number }> = [];
          for (const frame of data.info?.frames ?? []) {
            for (const ev of frame.events ?? []) {
              if (ev.type === "ITEM_PURCHASED" && ev.participantId === pid) {
                itemPurchases.push({ itemId: ev.itemId as number, timestamp: ev.timestamp as number });
              }
            }
          }
          itemPurchases.sort((a, b) => a.timestamp - b.timestamp);
          match.itemPurchaseOrder = itemPurchases;
        } catch { /* sem timeline */ }
      })
    );
    await sleep(700);
  }

  for (const m of finalMatches) delete (m as Record<string, unknown>)._champPuuid;

  return {
    matches: finalMatches,
    total: finalMatches.length,
    region: platform,
    champId,
    tiers: [...new Set(finalMatches.map((m) => m.tier as string))],
    message: `${finalMatches.length} partidas reais de ${champId} (One-Tricks de ${platform})`,
  };
}
