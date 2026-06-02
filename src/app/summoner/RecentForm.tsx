"use client";

import type { MatchSummary } from "@/lib/types";

interface Props { summaries: MatchSummary[] }

function computeStreak(summaries: MatchSummary[]): { streak: number; type: "W" | "L" | null } {
  if (!summaries.length) return { streak: 0, type: null };
  const first = summaries[0];
  let streak = 0;
  for (const s of summaries) {
    if (s.win === first.win) streak++;
    else break;
  }
  return { streak, type: first.win ? "W" : "L" };
}

function computeTrend(summaries: MatchSummary[]): "↑ Melhorando" | "↓ Piorando" | "→ Estável" {
  if (summaries.length < 6) return "→ Estável";
  const recent  = summaries.slice(0, 5);
  const older   = summaries.slice(5, 10);
  const recentWR  = recent.filter((s) => s.win).length / recent.length;
  const olderWR   = older.filter((s) => s.win).length  / Math.max(older.length, 1);
  if (recentWR - olderWR > 0.15) return "↑ Melhorando";
  if (olderWR  - recentWR > 0.15) return "↓ Piorando";
  return "→ Estável";
}

export function RecentForm({ summaries }: Props) {
  if (summaries.length < 3) return null;

  const { streak, type } = computeStreak(summaries);
  const trend = computeTrend(summaries);
  const last10 = summaries.slice(0, 10);
  const wins   = last10.filter((s) => s.win).length;
  const losses = last10.length - wins;

  return (
    <div className="recent-form">
      {/* Mini dots */}
      <div className="form-dots">
        {last10.map((s, i) => (
          <div
            key={i}
            className={`form-dot ${s.win ? "form-dot-win" : "form-dot-loss"}`}
            title={s.win ? "Vitória" : "Derrota"}
          />
        ))}
      </div>

      <div className="form-stats">
        {/* Streak */}
        {streak >= 2 && type && (
          <div className={`form-streak ${type === "W" ? "form-streak-win" : "form-streak-loss"}`}>
            {streak}x {type === "W" ? "🔥 Sequência de vitórias" : "💀 Sequência de derrotas"}
          </div>
        )}

        {/* Trend */}
        <div className={`form-trend ${
          trend.startsWith("↑") ? "form-trend-up" :
          trend.startsWith("↓") ? "form-trend-down" : "form-trend-stable"
        }`}>
          {trend}
        </div>

        {/* W/L */}
        <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
          Últimas {last10.length}: <span style={{ color: "#51cf66" }}>{wins}V</span>{" "}
          <span style={{ color: "#ff6b6b" }}>{losses}D</span>
        </div>
      </div>
    </div>
  );
}
