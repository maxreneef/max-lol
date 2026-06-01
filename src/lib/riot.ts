import "server-only";
import { cached } from "./cache";
import { mockProfile } from "./mock";
import {
  PLATFORMS,
  type LeagueEntryDTO,
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
