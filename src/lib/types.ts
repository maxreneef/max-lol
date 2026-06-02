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

export interface MatchParticipant {
  summonerId: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  win: boolean;
  lane: string;
  role: string;
}

export interface MatchDTO {
  metadata: {
    matchId: string;
    dataVersion: string;
    participants: string[];
  };
  info: {
    gameId: number;
    platformId: string;
    gameMode: string;
    gameType: string;
    gameDuration: number;
    gameCreation: number;
    gameEndTimestamp?: number;
    queueId: number;
    mapId: number;
    seasonId: number;
    teams: Array<{
      teamId: string;
      win: boolean;
      bans: Array<{ championId: number; pickTurn: number }>;
      objectives: {
        baron: { first: boolean; kills: number };
        champion: { first: boolean; kills: number };
        dragon: { first: boolean; kills: number };
        inhibitor: { first: boolean; kills: number };
        riftHerald: { first: boolean; kills: number };
        tower: { first: boolean; kills: number };
      };
    }>;
    participants: Array<{
      puuid: string;
      summonerId: string;
      summonerName: string;
      riotIdGameName: string;
      riotIdTagline: string;
      championId: number;
      championName: string;
      championTransform: number;
      deaths: number;
      assists: number;
      kills: number;
      lane: string;
      role: string;
      teamId: string;
      win: boolean;
      goldEarned: number;
      totalDamageDealtToChampions: number;
      visionScore: number;
      totalMinionsKilled?: number;
      neutralMinionsKilled?: number;
      item0?: number;
      item1?: number;
      item2?: number;
      item3?: number;
      item4?: number;
      item5?: number;
      item6?: number;
      itemIds?: number[];
      primaryRuneId?: number;
      subRuneId?: number;
    }>;
  };
}

export interface MatchHistory {
  matchIds: string[];
  count: number;
}

export interface MatchSummary {
  matchId: string;
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  visionScore: number;
  queueId: number;
  gameDuration: number;   // segundos
  gameCreation: number;   // timestamp ms
  gameMode: string;
}

export interface LiveParticipant {
  puuid: string;
  summonerId: string;
  riotId: string;
  championId: number;
  championName?: string;
  teamId: number;
  spell1Id: number;
  spell2Id: number;
  perks?: { perkIds: number[] };
}

export interface LiveGame {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  gameMode: string;
  gameQueueConfigId: number;
  participants: LiveParticipant[];
  bannedChampions: Array<{ championId: number; teamId: number; pickTurn: number }>;
}

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted: boolean;
  tokensEarned: number;
}

export interface FreeRotation {
  freeChampionIds: number[];
  freeChampionIdsForNewPlayers: number[];
  maxNewPlayerLevel: number;
}

export interface LeagueEntry {
  summonerId: string;
  summonerName: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface LeagueList {
  leagueId: string;
  entries: LeagueEntry[];
  tier: string;
  name: string;
  queue: string;
}

export const QUEUE_NAMES: Record<number, string> = {
  420: "Solo/Duo",
  440: "Flex",
  450: "ARAM",
  400: "Normal",
  430: "Normal",
  700: "Clash",
  900: "URF",
  1900: "URF",
  0: "Custom",
};
