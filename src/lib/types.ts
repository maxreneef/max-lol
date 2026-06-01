export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDTO {
  id?: string;
  accountId?: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntryDTO {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface SummonerProfile {
  account: RiotAccount;
  summoner: SummonerDTO;
  ranked: LeagueEntryDTO[];
  region: string;
  source: "live" | "mock";
}

export const PLATFORMS = {
  br1: { label: "Brasil (BR1)", regional: "americas" },
  na1: { label: "Norte América (NA1)", regional: "americas" },
  euw1: { label: "Europa Oeste (EUW1)", regional: "europe" },
  kr: { label: "Coreia (KR)", regional: "asia" },
  las: { label: "LAS", regional: "americas" },
  lan: { label: "LAN", regional: "americas" },
} as const;

export type Platform = keyof typeof PLATFORMS;

export function isPlatform(value: string): value is Platform {
  return value in PLATFORMS;
}
