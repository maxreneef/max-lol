"use client";

import type { SummonerProfile, MatchSummary } from "@/lib/types";

const TIER_SCORE: Record<string, number> = {
  IRON: 100, BRONZE: 200, SILVER: 300, GOLD: 400,
  PLATINUM: 500, EMERALD: 600, DIAMOND: 700,
  MASTER: 900, GRANDMASTER: 950, CHALLENGER: 1000,
};
const RANK_BONUS: Record<string, number> = { IV: 0, III: 25, II: 50, I: 75 };

function tierToScore(tier: string, rank: string, lp: number): number {
  return (TIER_SCORE[tier] ?? 0) + (RANK_BONUS[rank] ?? 0) + Math.round(lp / 4);
}

function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 950) return { label: "LENDÁRIO",  color: "#c89b3c" };
  if (score >= 850) return { label: "ÉLITE",     color: "#ff6b6b" };
  if (score >= 700) return { label: "DIAMANTE",  color: "#6fa8dc" };
  if (score >= 550) return { label: "ESMERALDA", color: "#51cf66" };
  if (score >= 400) return { label: "OURO",      color: "#c89b3c" };
  if (score >= 250) return { label: "PRATA",     color: "#adb5bd" };
  return                  { label: "BRONZE",     color: "#cd7f32" };
}

interface Props {
  profile: SummonerProfile;
  summaries: MatchSummary[] | null;
}

export function SummonerScore({ profile, summaries }: Props) {
  const solo = profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  if (!solo) return null;

  const baseScore = tierToScore(solo.tier, solo.rank, solo.leaguePoints);

  // Bônus de performance das últimas partidas
  let perfBonus = 0;
  if (summaries && summaries.length >= 5) {
    const last5 = summaries.slice(0, 5);
    const wr    = last5.filter((s) => s.win).length / 5;
    const avgKda = last5.reduce((a, s) => a + (s.kills + s.assists) / Math.max(s.deaths, 1), 0) / 5;
    perfBonus = Math.round(wr * 20 + avgKda * 5);
  }

  const total = baseScore + perfBonus;
  const { label, color } = scoreToLabel(total);

  const maxScore = 1000 + 45; // max possível
  const pct = Math.min((total / maxScore) * 100, 100);

  return (
    <div className="summoner-score">
      <div className="score-header">
        <p className="score-label">Score Max LoL</p>
        <div className="score-value" style={{ color }}>{total}</div>
        <span className="score-rank" style={{ color, borderColor: color + "55" }}>{label}</span>
      </div>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {perfBonus > 0 && (
        <p className="score-bonus">+{perfBonus} bônus de performance recente</p>
      )}
    </div>
  );
}
