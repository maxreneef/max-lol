import "server-only";
import { cached } from "./cache";
import { mockProfile } from "./mock";
import {
  PLATFORMS,
  type LeagueEntryDTO,
  type MatchDTO,
  type MatchHistory,
  type MatchSummary,
  type Platform,
  type RiotAccount,
  type SummonerDTO,
  type SummonerProfile,
} from "./types";

const API_KEY = process.env.RIOT_API_KEY;

export class RiotError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "RiotError";
  }
}

// Rate limiting simples: serializa chamadas com um intervalo mínimo entre elas.
// A dev key permite 20 req/s e 100 req/2min. Espaçar ~60ms é conservador.
let chain: Promise<unknown> = Promise.resolve();
const MIN_INTERVAL_MS = 60;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
    return result;
  });
  // Mantém a cadeia viva mesmo se uma chamada falhar.
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function riotFetch<T>(url: string): Promise<T> {
  const res = await schedule(() =>
    fetch(url, {
      headers: { "X-Riot-Token": API_KEY ?? "" },
      cache: "no-store",
    })
  );

  if (res.status === 404) {
    throw new RiotError(404, "Invocador não encontrado.");
  }
  if (res.status === 429) {
    throw new RiotError(429, "Limite de requisições atingido. Tente em instantes.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new RiotError(403, "Chave da API inválida ou expirada.");
  }
  if (!res.ok) {
    throw new RiotError(res.status, `Erro da API da Riot (${res.status}).`);
  }
  return (await res.json()) as T;
}

function platformHost(platform: Platform): string {
  return `https://${platform}.api.riotgames.com`;
}

function regionalHost(platform: Platform): string {
  return `https://${PLATFORMS[platform].regional}.api.riotgames.com`;
}

export async function getProfile(
  gameName: string,
  tagLine: string,
  platform: Platform
): Promise<SummonerProfile> {
  // Sem chave configurada → retorna dados de demonstração para a UI funcionar.
  if (!API_KEY) {
    return mockProfile(gameName, tagLine, platform);
  }

  const key = `profile:${platform}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  return cached(key, 60_000, async () => {
    const account = await riotFetch<RiotAccount>(
      `${regionalHost(platform)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
        gameName
      )}/${encodeURIComponent(tagLine)}`
    );

    const summoner = await riotFetch<SummonerDTO>(
      `${platformHost(platform)}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
    );

    const ranked = await riotFetch<LeagueEntryDTO[]>(
      `${platformHost(platform)}/lol/league/v4/entries/by-puuid/${account.puuid}`
    );

    return {
      source: "live" as const,
      region: platform,
      account,
      summoner,
      ranked,
    };
  });
}

export function hasApiKey(): boolean {
  return Boolean(API_KEY);
}

export async function getMatchHistory(
  puuid: string,
  platform: Platform,
  start: number = 0,
  count: number = 20
): Promise<MatchHistory> {
  if (!API_KEY) {
    // Mock: retorna IDs fictícios que a busca vai ignorar se não houver chave.
    return {
      matchIds: Array.from({ length: count }, (_, i) => `BR1-mock-match-${i}`),
      count,
    };
  }

  const key = `matches:${platform}:${puuid}:${start}-${count}`;
  return cached(key, 300_000, async () => {
    const ids = await riotFetch<string[]>(
      `${regionalHost(platform)}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`
    );
    return { matchIds: ids, count: ids.length };
  });
}

export async function getMatchSummaries(
  puuid: string,
  platform: Platform,
  count: number = 20
): Promise<MatchSummary[]> {
  if (!API_KEY) {
    // Mock com dados variados para demonstração
    const mockChamps = ["Jayce", "Jinx", "Thresh", "Zed", "Lux", "Yasuo"];
    return Array.from({ length: count }, (_, i) => ({
      matchId: `BR1_mock_${i}`,
      win: i % 3 !== 0,
      championName: mockChamps[i % mockChamps.length],
      kills: Math.floor(Math.random() * 12),
      deaths: Math.floor(Math.random() * 8) + 1,
      assists: Math.floor(Math.random() * 15),
      totalDamageDealtToChampions: Math.floor(Math.random() * 40000) + 8000,
      goldEarned: Math.floor(Math.random() * 8000) + 6000,
      visionScore: Math.floor(Math.random() * 60) + 5,
      queueId: 420,
      gameDuration: Math.floor(Math.random() * 1800) + 1200,
      gameCreation: Date.now() - i * 3_600_000,
      gameMode: "CLASSIC",
    }));
  }

  const key = `summaries:${platform}:${puuid}:${count}`;
  return cached(key, 120_000, async () => {
    const ids = await riotFetch<string[]>(
      `${regionalHost(platform)}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`
    );

    const summaries: MatchSummary[] = [];
    for (const matchId of ids) {
      try {
        const match = await getMatch(matchId, platform);
        const p = match.info.participants.find((x) => x.puuid === puuid);
        if (!p) continue;
        summaries.push({
          matchId,
          win: p.win,
          championName: p.championName,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          totalDamageDealtToChampions: p.totalDamageDealtToChampions,
          goldEarned: p.goldEarned,
          visionScore: p.visionScore,
          queueId: match.info.queueId,
          gameDuration: match.info.gameDuration,
          gameCreation: match.info.gameCreation,
          gameMode: match.info.gameMode,
        });
      } catch {
        // Ignora partidas com erro e continua
      }
    }
    return summaries;
  });
}

export async function getMatch(
  matchId: string,
  platform: Platform
): Promise<MatchDTO> {
  if (!API_KEY) {
    // Sem chave, retorna erro simulado.
    throw new RiotError(403, "Chave da API não configurada.");
  }

  const key = `match:${platform}:${matchId}`;
  return cached(key, 3_600_000, async () => {
    return riotFetch<MatchDTO>(
      `${regionalHost(platform)}/lol/match/v5/matches/${matchId}`
    );
  });
}
