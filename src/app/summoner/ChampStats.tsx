"use client";

import Link from "next/link";
import type { MatchSummary } from "@/lib/types";
import { championIcon } from "@/lib/ddragon";

interface ChampStat {
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
}

function computeChampStats(summaries: MatchSummary[]): ChampStat[] {
  const map = new Map<string, ChampStat>();
  for (const s of summaries) {
    const existing = map.get(s.championName) ?? {
      championName: s.championName,
      games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, damage: 0,
    };
    map.set(s.championName, {
      ...existing,
      games: existing.games + 1,
      wins: existing.wins + (s.win ? 1 : 0),
      kills: existing.kills + s.kills,
      deaths: existing.deaths + s.deaths,
      assists: existing.assists + s.assists,
      damage: existing.damage + s.totalDamageDealtToChampions,
    });
  }
  return [...map.values()].sort((a, b) => b.games - a.games);
}

export function ChampStats({ summaries }: { summaries: MatchSummary[] }) {
  if (summaries.length === 0) return null;
  const stats = computeChampStats(summaries);

  return (
    <div className="champ-stats-section">
      <h3 className="ranked-title">Campeões mais jogados</h3>
      <div className="champ-stats-list">
        {stats.slice(0, 8).map((c) => {
          const wr = Math.round((c.wins / c.games) * 100);
          const kda = ((c.kills + c.assists) / Math.max(c.deaths, 1)).toFixed(1);
          const avgDmg = (c.damage / c.games / 1000).toFixed(1);
          return (
            <Link key={c.championName} href={`/champion/${c.championName}`} className="champ-stat-row">
              <img
                src={championIcon(c.championName)}
                alt={c.championName}
                width={36}
                height={36}
                className="champ-stat-icon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="champ-stat-name">{c.championName}</div>
              <div className="champ-stat-games">{c.games}P</div>
              <div className={`champ-stat-wr ${wr >= 55 ? "stat-good" : wr < 45 ? "stat-bad" : ""}`}>
                {wr}% WR
              </div>
              <div className="champ-stat-kda">{kda} KDA</div>
              <div className="champ-stat-dmg">{avgDmg}k dano</div>
              <div className="champ-stat-bar-bg">
                <div
                  className="champ-stat-bar-fill"
                  style={{
                    width: `${wr}%`,
                    background: wr >= 55 ? "#51cf66" : wr < 45 ? "#ff6b6b" : "var(--accent-2)",
                  }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
