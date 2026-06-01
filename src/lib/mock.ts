import type { SummonerProfile, Platform } from "./types";

// Dados de demonstração usados quando RIOT_API_KEY não está configurada.
export function mockProfile(
  gameName: string,
  tagLine: string,
  region: Platform
): SummonerProfile {
  return {
    source: "mock",
    region,
    account: {
      puuid: "mock-puuid-0000000000000000000000000000000000000000",
      gameName,
      tagLine,
    },
    summoner: {
      puuid: "mock-puuid-0000000000000000000000000000000000000000",
      profileIconId: 4568,
      revisionDate: Date.now(),
      summonerLevel: 287,
    },
    ranked: [
      {
        leagueId: "mock-league-solo",
        queueType: "RANKED_SOLO_5x5",
        tier: "DIAMOND",
        rank: "II",
        leaguePoints: 47,
        wins: 138,
        losses: 121,
        hotStreak: true,
        veteran: false,
        freshBlood: false,
        inactive: false,
      },
      {
        leagueId: "mock-league-flex",
        queueType: "RANKED_FLEX_SR",
        tier: "PLATINUM",
        rank: "I",
        leaguePoints: 22,
        wins: 64,
        losses: 58,
        hotStreak: false,
        veteran: false,
        freshBlood: true,
        inactive: false,
      },
    ],
  };
}
