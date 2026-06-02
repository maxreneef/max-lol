import type { MatchSummary } from "./types";

/**
 * Calcula um grade S+/S/A/B/C/D para uma partida com base em:
 * KDA, CS/min (estimado), participação no dano e resultado.
 */
export function calcGrade(s: MatchSummary, allSummaries: MatchSummary[]): string {
  const kda = (s.kills + s.assists) / Math.max(s.deaths, 1);
  const dmgRank = allSummaries.filter((x) => x.totalDamageDealtToChampions > s.totalDamageDealtToChampions).length;
  const dmgPct  = 1 - dmgRank / Math.max(allSummaries.length, 1); // 0..1, maior = melhor

  // Score normalizado 0..100
  const kdaScore  = Math.min(kda / 6, 1) * 40;     // KDA contribui até 40
  const dmgScore  = dmgPct * 30;                    // Dano contribui até 30
  const winScore  = s.win ? 20 : 0;                 // Vitória contribui até 20
  const goldScore = Math.min(s.goldEarned / 16_000, 1) * 10; // Ouro contribui até 10

  const total = kdaScore + dmgScore + winScore + goldScore;

  if (total >= 90) return "S+";
  if (total >= 78) return "S";
  if (total >= 65) return "A";
  if (total >= 50) return "B";
  if (total >= 35) return "C";
  return "D";
}

export const GRADE_COLORS: Record<string, string> = {
  "S+": "#c89b3c",
  "S":  "#c8aa6e",
  "A":  "#51cf66",
  "B":  "#0ac8b9",
  "C":  "#adb5bd",
  "D":  "#ff6b6b",
};
