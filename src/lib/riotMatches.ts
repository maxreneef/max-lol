/**
 * Helpers compartilhados da Riot API — usados tanto pela busca ao vivo (/matches)
 * quanto pelo robô de varredura (/api/cron/scan).
 *
 * Todos os fetches usam o Vercel Data Cache (next.revalidate) para persistir entre
 * invocações serverless e não estourar o rate limit da dev key (100 req/2min).
 */
import { DD_BASE } from "@/lib/ddragon";
import { PLATFORMS } from "@/lib/types";

const API_KEY = process.env.RIOT_API_KEY;

// Cache: apenas sucesso (2xx) é cacheado. Erros NUNCA são cacheados.
// Usamos revalidate por padrão para leituras de client, mas o scan passa cache:false.
const REVALIDATE = 30 * 60; // 30 min (usado apenas para rotas de leitura do client)

// Mapa label da UI → teamPosition da Riot API
export const LANE_MAP: Record<string, string> = {
  top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", adc: "BOTTOM", suporte: "UTILITY",
};

const TIER_ORDER: Record<string, number> = {
  CHALLENGER: 0, GRANDMASTER: 1, MASTER: 2, DIAMOND: 3, EMERALD: 4,
};
const DIV_ORDER: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };

export type Player = { puuid: string; tier: string; rank: string; lp: number; points?: number };

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function hosts(platform: string) {
  const p = PLATFORMS[platform as keyof typeof PLATFORMS];
  return {
    platHost: `https://${platform}.api.riotgames.com`,
    regHost: `https://${p.regional}.api.riotgames.com`,
  };
}

/**
 * Fetch da Riot API com retry automático em erros 5xx e 429 (rate limit).
 *
 * - Erros 5xx: até 3 retentativas com backoff exponencial (1s, 2s, 4s).
 * - Erro 429 (rate limit): espera o Retry-After header ou 10s e tenta de novo (até 3x).
 * - Erros 4xx (fora 429): NÃO retenta — falha imediata.
 * - `useCache`: quando true (default), usa cache Data Cache do Next.js (30 min) para leituras
 *   do site. Quando false (scan/robô), usa cache curto de 2 min — evita rate limit do scan
 *   sem envenenar o cache de longo prazo com dados potencialmente inconsistentes.
 */
export async function riotFetch(
  url: string,
  opts?: { useCache?: boolean; retries?: number }
): Promise<Response> {
  const useCache = opts?.useCache ?? true;
  const maxRetries = opts?.retries ?? 3;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const fetchOpts: RequestInit = {
        headers: { "X-Riot-Token": API_KEY! },
      };
      // NEXT: useCache=true → cache longo (30 min) para leituras do site.
      // useCache=false → cache curto (2 min) para scans: evita rate limit sem envenenar
      // o cache de longo prazo com dados potencialmente inconsistentes.
      const revalidate = useCache ? REVALIDATE : 120; // 2 min para scans
      (fetchOpts as Record<string, unknown>).next = { revalidate };

      const res = await fetch(url, fetchOpts);

      // Sucesso — retorna imediatamente
      if (res.ok) return res;

      // Rate limit — espera e retenta
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10_000;
        if (attempt < maxRetries) {
          console.warn(`[riotFetch] 429 rate limit — aguardando ${waitMs}ms (tentativa ${attempt + 1}/${maxRetries})`);
          await sleep(waitMs);
          continue;
        }
        return res; // sem retentativas restantes, retorna o 429
      }

      // Erros 5xx (servidor da Riot) — backoff e retenta
      if (res.status >= 500 && res.status < 600) {
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`[riotFetch] ${res.status} da Riot — backoff ${backoff}ms (tentativa ${attempt + 1}/${maxRetries})`);
          await sleep(backoff);
          continue;
        }
        return res; // sem retentativas restantes, retorna o erro 5xx
      }

      // Erros 4xx (fora 429) — não retenta
      return res;
    } catch (err: unknown) {
      // Erro de rede (DNS, timeout, conexão recusada) — retenta
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(`[riotFetch] Erro de rede: ${lastError.message} — backoff ${backoff}ms (tentativa ${attempt + 1}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
    }
  }

  // Todas as retentativas falharam
  throw lastError ?? new Error("[riotFetch] Todas as retentativas falharam");
}

export async function getChampionNumericId(champName: string): Promise<number | null> {
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

export function playerSortKey(p: Player): number {
  const t = (TIER_ORDER[p.tier.toUpperCase()] ?? 99) * 10_000;
  const d = (DIV_ORDER[p.rank] ?? 0) * 1_000;
  return t + d - p.lp;
}

/** Leaderboard completo (Challenger + GM + Master + Diamond I–IV + Emerald I), ordenado por elo+LP.
 *  @param useCache - true (default) usa cache Data Cache do Next.js (30 min). O scan também usa
 *  cache=true porque o leaderboard não muda a cada minuto e centenas de páginas sem cache
 *  estouram os 60s do Vercel. */
export async function getLeaderboard(platform: string, useCache = true): Promise<Player[]> {
  const { platHost } = hosts(platform);
  const all: Player[] = [];

  const apexTiers = [
    { endpoint: "challengerleagues", tier: "CHALLENGER" },
    { endpoint: "grandmasterleagues", tier: "GRANDMASTER" },
    { endpoint: "masterleagues", tier: "MASTER" },
  ];
  const apex = await Promise.all(
    apexTiers.map(async ({ endpoint, tier }) => {
      try {
        const res = await riotFetch(`${platHost}/lol/league/v4/${endpoint}/by-queue/RANKED_SOLO_5x5`, { useCache });
        if (!res.ok) return [];
        const data = await res.json();
        const out: Player[] = [];
        for (const e of data.entries ?? []) {
          if (!e.puuid) continue;
          out.push({ puuid: e.puuid, tier, lp: e.leaguePoints ?? 0, rank: e.rank ?? "I" });
        }
        return out;
      } catch {
        return [];
      }
    })
  );
  for (const b of apex) all.push(...b);

  await sleep(300);

  // Fetch dinâmico: continua paginando até resposta vazia ou < 200 entradas.
  // maxPages reduzido de 50 para 5 — o scan processa 15 jogadores por vez, então
  // 5 páginas (≈1000 jogadores por divisão) é mais que suficiente.
  async function fetchAllPages(div: string, tier: string, maxPages = 5): Promise<Player[]> {
    const out: Player[] = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const res = await riotFetch(
          `${platHost}/lol/league/v4/entries/RANKED_SOLO_5x5/${tier === "EMERALD" ? "EMERALD" : "DIAMOND"}/${div}?page=${page}`,
          { useCache }
        );
        if (!res.ok) break;
        const entries: Array<{ puuid?: string; leaguePoints?: number }> = await res.json();
        if (!Array.isArray(entries) || entries.length === 0) break;
        for (const e of entries) {
          if (!e.puuid) continue;
          out.push({ puuid: e.puuid, tier, lp: e.leaguePoints ?? 0, rank: div });
        }
        if (entries.length < 200) break; // ultima pagina (incompleta)
        await sleep(50); // evita estourar rate limit
      } catch {
        break;
      }
    }
    return out;
  }

  // Diamond I–IV + Emerald I (paralelo entre divisões para caber nos 60s do Vercel)
  const divisionResults = await Promise.all([
    ...["I", "II", "III", "IV"].map((div) => fetchAllPages(div, "DIAMOND")),
    fetchAllPages("I", "EMERALD"),
  ]);
  for (const players of divisionResults) all.push(...players);

  return all.sort((a, b) => playerSortKey(a) - playerSortKey(b));
}

/** Busca as match IDs ranqueadas (solo/duo) recentes de um jogador.
 *  @param useCache - false para scan/robô, true (default) para leituras do site. */
export async function getRankedMatchIds(
  platform: string,
  puuid: string,
  count: number,
  startTimeSec: number,
  useCache = true
): Promise<string[]> {
  const { regHost } = hosts(platform);
  try {
    const res = await riotFetch(
      `${regHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=${count}&startTime=${startTimeSec}`,
      { useCache }
    );
    if (!res.ok) return [];
    const ids: string[] = await res.json();
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

const SKILL_SLOT: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };

/** Extrai todos os campos detalhados de um participante (dano, visao, objetivos, etc.) */
export function extractDetailedStats(part: Record<string, unknown>): Record<string, unknown> {
  return {
    // Dano
    physicalDamageDealtToChampions: (part.physicalDamageDealtToChampions as number) ?? 0,
    magicDamageDealtToChampions: (part.magicDamageDealtToChampions as number) ?? 0,
    trueDamageDealtToChampions: (part.trueDamageDealtToChampions as number) ?? 0,
    totalDamageTaken: (part.totalDamageTaken as number) ?? 0,
    physicalDamageTaken: (part.physicalDamageTaken as number) ?? 0,
    magicDamageTaken: (part.magicDamageTaken as number) ?? 0,
    trueDamageTaken: (part.trueDamageTaken as number) ?? 0,
    damageSelfMitigated: (part.damageSelfMitigated as number) ?? 0,
    totalDamageDealtToChampions: (part.totalDamageDealtToChampions as number) ?? 0,
    // Visao
    visionScore: (part.visionScore as number) ?? 0,
    wardsPlaced: (part.wardsPlaced as number) ?? 0,
    wardsKilled: (part.wardsKilled as number) ?? 0,
    visionWardsBought: (part.visionWardsBoughtInGame as number) ?? 0,
    // Objetivos
    dragonKills: (part.dragonKills as number) ?? 0,
    baronKills: (part.baronKills as number) ?? 0,
    turretKills: (part.turretKills as number) ?? 0,
    turretTakedowns: (part.turretTakedowns as number) ?? 0,
    inhibitorTakedowns: (part.inhibitorTakedowns as number) ?? 0,
    // Outros
    champLevel: (part.champLevel as number) ?? 0,
    champExperience: (part.champExperience as number) ?? 0,
    goldSpent: (part.goldSpent as number) ?? 0,
    totalTimeSpentDead: (part.totalTimeSpentDead as number) ?? 0,
    firstBloodKill: (part.firstBloodKill as boolean) ?? false,
    firstTowerKill: (part.firstTowerKill as boolean) ?? false,
    doubleKills: (part.doubleKills as number) ?? 0,
    tripleKills: (part.tripleKills as number) ?? 0,
    quadraKills: (part.quadraKills as number) ?? 0,
    pentaKills: (part.pentaKills as number) ?? 0,
    killingSprees: (part.killingSprees as number) ?? 0,
    bountyLevel: (part.bountyLevel as number) ?? 0,
  };
}

/** Extrai ordem de compra de itens da timeline */
export function extractItemPurchases(
  timeline: Record<string, unknown>,
  participantId: number
): Array<{ itemId: number; timestamp: number }> {
  const info = (timeline?.info ?? {}) as { frames?: Array<{ events?: Array<Record<string, unknown>> }> };
  const purchases: Array<{ itemId: number; timestamp: number }> = [];
  for (const frame of info.frames ?? []) {
    for (const ev of frame.events ?? []) {
      if (ev.type === "ITEM_PURCHASED" && ev.participantId === participantId) {
        purchases.push({ itemId: ev.itemId as number, timestamp: ev.timestamp as number });
      }
    }
  }
  purchases.sort((a, b) => a.timestamp - b.timestamp);
  return purchases;
}

/** Extrai ordem de upagem de skills com timestamps */
export function extractSkillLevelUps(
  timeline: Record<string, unknown>,
  participantId: number
): Array<{ skillSlot: number; timestamp: number }> {
  const info = (timeline?.info ?? {}) as { frames?: Array<{ events?: Array<Record<string, unknown>> }> };
  const levelUps: Array<{ skillSlot: number; timestamp: number }> = [];
  for (const frame of info.frames ?? []) {
    for (const ev of frame.events ?? []) {
      if (ev.type === "SKILL_LEVEL_UP" && ev.participantId === participantId && ev.levelUpType === "NORMAL") {
        levelUps.push({ skillSlot: ev.skillSlot as number, timestamp: ev.timestamp as number });
      }
    }
  }
  levelUps.sort((a, b) => a.timestamp - b.timestamp);
  return levelUps;
}

/** Extrai a ordem de habilidades (ex: "QWEQQ...") de um participante a partir da timeline. */
export function extractSkillOrder(timeline: Record<string, unknown>, puuid: string): string {
  const info = (timeline?.info ?? {}) as {
    participants?: Array<{ participantId: number; puuid: string }>;
    frames?: Array<{ events?: Array<Record<string, unknown>> }>;
  };
  const tlPart = (info.participants ?? []).find((x) => x.puuid === puuid);
  if (!tlPart) return "";
  const pid = tlPart.participantId;

  const events: Array<{ t: number; s: number }> = [];
  for (const frame of info.frames ?? []) {
    for (const ev of frame.events ?? []) {
      if (ev.type === "SKILL_LEVEL_UP" && ev.participantId === pid && ev.levelUpType === "NORMAL") {
        events.push({ t: ev.timestamp as number, s: ev.skillSlot as number });
      }
    }
  }
  events.sort((a, b) => a.t - b.t);
  return events.map((e) => SKILL_SLOT[e.s] ?? "?").join("");
}

export interface ViewMeta {
  tier: string;
  rank: string;
  lp: number;
  platform: string;
}

/**
 * Monta a "visão" rica de uma partida do ponto de vista de UM participante.
 * O mesmo formato consumido pelo client (BuildTab) e pelo buildAggregator.
 * O campo interno `_puuid` é usado para casar com a timeline e deve ser removido
 * antes de enviar ao client.
 */
export function buildMatchView(
  matchId: string,
  info: Record<string, unknown>,
  part: Record<string, unknown>,
  meta: ViewMeta
): Record<string, unknown> {
  const participants = (info.participants ?? []) as Array<Record<string, unknown>>;
  const perks = (part.perks ?? {}) as {
    styles?: Array<{ style?: number; selections?: Array<{ perk: number }> }>;
    statPerks?: Record<string, number>;
  };

  const primaryStyle = perks.styles?.[0]?.style ?? 0;
  const subStyle = perks.styles?.[1]?.style ?? 0;
  const primaryRuneId = perks.styles?.[0]?.selections?.[0]?.perk ?? 0;
  const runeSelections = (perks.styles?.[0]?.selections ?? []).map((s) => s.perk);
  const subSelections = (perks.styles?.[1]?.selections ?? []).map((s) => s.perk);
  const statShards = Object.values(perks.statPerks ?? {}).filter(
    (v): v is number => typeof v === "number"
  );

  const spell1Id = (part.summoner1Id as number) ?? 0;
  const spell2Id = (part.summoner2Id as number) ?? 0;

  const dur = (info.gameDuration as number) ?? 0;
  const mm = Math.floor(dur / 60);
  const ss = dur % 60;

  const totalMinionsKilled = (part.totalMinionsKilled as number) ?? 0;
  const neutralMinionsKilled = (part.neutralMinionsKilled as number) ?? 0;
  const cs = totalMinionsKilled + neutralMinionsKilled;
  const csPerMin = dur > 0 ? +(cs / (dur / 60)).toFixed(1) : 0;

  const teamId = part.teamId as number;
  const teamKills = participants
    .filter((pp) => pp.teamId === teamId)
    .reduce((sum, pp) => sum + ((pp.kills as number) ?? 0), 0);
  const kills = (part.kills as number) ?? 0;
  const assists = (part.assists as number) ?? 0;
  const deaths = (part.deaths as number) ?? 0;
  const killParticipation = teamKills > 0 ? Math.round(((kills + assists) / teamKills) * 100) : 0;

  const items = [
    String(part.item0 ?? 0), String(part.item1 ?? 0), String(part.item2 ?? 0),
    String(part.item3 ?? 0), String(part.item4 ?? 0), String(part.item5 ?? 0),
  ];

  const teamPosition = (part.teamPosition as string) ?? (part.individualPosition as string) ?? "";

  const details = extractDetailedStats(part);

  return {
    matchId,
    _puuid: (part.puuid as string) ?? "",
    summonerName: (part.riotIdGameName as string) || (part.summonerName as string) || "Invocador",
    tagLine: (part.riotIdTagline as string) ?? "",
    tier: meta.tier || "DIAMOND",
    rank: meta.rank || "IV",
    lp: meta.lp || 0,
    championId: (part.championName as string) ?? "",
    win: part.win as boolean,
    kills, deaths, assists,
    kda: `${kills}/${deaths}/${assists}`,
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
    gameCreation: (info.gameCreation as number) ?? Date.now(),
    queueId: (info.queueId as number) ?? 0,
    region: meta.platform,
    platform: meta.platform,
    lane: teamPosition,
    primaryStyle, subStyle, primaryRuneId, runeSelections, subSelections, statShards,
    item0: part.item0 ?? 0, item1: part.item1 ?? 0, item2: part.item2 ?? 0,
    item3: part.item3 ?? 0, item4: part.item4 ?? 0, item5: part.item5 ?? 0, item6: part.item6 ?? 0,
    totalMinionsKilled, neutralMinionsKilled, cs, csPerMin, teamKills, killParticipation,
    goldEarned: (part.goldEarned as number) ?? 0,
    ...details,
    // Timeline (preenchido depois)
    itemPurchaseOrder: [] as Array<{ itemId: number; timestamp: number }>,
    skillLevelUpOrder: [] as Array<{ skillSlot: number; timestamp: number }>,
  };
}
