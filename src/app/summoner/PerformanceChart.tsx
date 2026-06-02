"use client";

import type { MatchSummary } from "@/lib/types";

interface Props {
  summaries: MatchSummary[];
}

function sparkline(
  values: number[],
  width: number,
  height: number,
  padding = 6
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return "M " + pts.join(" L ");
}

export function PerformanceChart({ summaries }: Props) {
  if (summaries.length < 3) return null;

  const recent = [...summaries].reverse(); // cronológico: mais antigas → recentes

  const kdaValues = recent.map(
    (s) => (s.kills + s.assists) / Math.max(s.deaths, 1)
  );
  const dmgValues = recent.map((s) => s.totalDamageDealtToChampions / 1000);

  const avgKda = kdaValues.reduce((a, b) => a + b, 0) / kdaValues.length;
  const avgDmg = dmgValues.reduce((a, b) => a + b, 0) / dmgValues.length;
  const wins = summaries.filter((s) => s.win).length;
  const winRatePct = Math.round((wins / summaries.length) * 100);

  const W = 320;
  const H = 60;

  return (
    <div className="perf-chart-section">
      <h3 className="ranked-title">Performance — últimas {summaries.length} partidas</h3>
      <div className="perf-summary">
        <div className="perf-stat">
          <span className="perf-val">{winRatePct}%</span>
          <span className="perf-label">Win Rate</span>
        </div>
        <div className="perf-stat">
          <span className="perf-val">{avgKda.toFixed(2)}</span>
          <span className="perf-label">KDA Médio</span>
        </div>
        <div className="perf-stat">
          <span className="perf-val">{avgDmg.toFixed(1)}k</span>
          <span className="perf-label">Dano Médio</span>
        </div>
      </div>

      <div className="charts-row">
        {/* KDA sparkline */}
        <div className="chart-wrap">
          <p className="chart-label">KDA</p>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {/* Área de fundo */}
            <path
              d={sparkline(kdaValues, W, H) + ` L ${W - 6},${H} L 6,${H} Z`}
              fill="rgba(10,200,185,0.08)"
            />
            {/* Linha */}
            <path
              d={sparkline(kdaValues, W, H)}
              fill="none"
              stroke="var(--accent-2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pontos por partida coloridos por W/D */}
            {recent.map((s, i) => {
              const x = 6 + (i / (recent.length - 1)) * (W - 12);
              const min = Math.min(...kdaValues);
              const max = Math.max(...kdaValues);
              const range = max - min || 1;
              const y = 6 + (1 - (kdaValues[i] - min) / range) * (H - 12);
              return (
                <circle
                  key={s.matchId}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill={s.win ? "#51cf66" : "#ff6b6b"}
                  stroke="var(--panel)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>

        {/* Dano sparkline */}
        <div className="chart-wrap">
          <p className="chart-label">Dano (k)</p>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path
              d={sparkline(dmgValues, W, H) + ` L ${W - 6},${H} L 6,${H} Z`}
              fill="rgba(200,155,60,0.08)"
            />
            <path
              d={sparkline(dmgValues, W, H)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {recent.map((s, i) => {
              const x = 6 + (i / (recent.length - 1)) * (W - 12);
              const min = Math.min(...dmgValues);
              const max = Math.max(...dmgValues);
              const range = max - min || 1;
              const y = 6 + (1 - (dmgValues[i] - min) / range) * (H - 12);
              return (
                <circle
                  key={s.matchId}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill={s.win ? "#51cf66" : "#ff6b6b"}
                  stroke="var(--panel)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
