"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChampionMastery } from "@/lib/types";

let champKeyMap: Record<number, string> = {};
async function loadChampKeyMap() {
  if (Object.keys(champKeyMap).length) return;
  try {
    const res = await fetch(`${DD_BASE}/data/pt_BR/champion.json`);
    const json = await res.json();
    champKeyMap = Object.fromEntries(
      Object.values(json.data as Record<string, { key: string; id: string }>).map((c) => [parseInt(c.key), c.id])
    );
  } catch {}
}

function masteryColor(level: number) {
  if (level >= 7) return "#c89b3c";
  if (level >= 5) return "#0ac8b9";
  return "var(--muted)";
}

function fmtPoints(pts: number) {
  return pts >= 1_000_000 ? `${(pts / 1_000_000).toFixed(1)}M` : pts >= 1000 ? `${(pts / 1000).toFixed(0)}k` : String(pts);
}

export function MasterySection({ puuid, region }: { puuid: string; region: string }) {
  const [masteries, setMasteries] = useState<ChampionMastery[] | null>(null);
  const [champNames, setChampNames] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/mastery?puuid=${encodeURIComponent(puuid)}&region=${region}&count=10`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMasteries(data); })
      .catch(() => {});

    loadChampKeyMap().then(() => setChampNames({ ...champKeyMap }));
  }, [puuid, region]);

  if (!masteries || masteries.length === 0) return null;

  return (
    <div className="mastery-section">
      <h3 className="ranked-title">Maestria de campeões</h3>
      <div className="mastery-list">
        {masteries.map((m) => {
          const champId = champNames[m.championId];
          if (!champId) return null;
          return (
            <Link key={m.championId} href={`/champion/${champId}`} className="mastery-row">
              <img
                src={`${DD_BASE}/img/champion/${champId}.png`}
                alt={champId}
                width={40} height={40}
                className="mastery-icon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="mastery-info">
                <p className="mastery-name">{champId}</p>
                <div className="mastery-bar-bg">
                  <div
                    className="mastery-bar-fill"
                    style={{
                      width: `${Math.min((m.championPoints / 200_000) * 100, 100)}%`,
                      background: masteryColor(m.championLevel),
                    }}
                  />
                </div>
              </div>
              <div className="mastery-stats">
                <span className="mastery-level" style={{ color: masteryColor(m.championLevel) }}>
                  M{m.championLevel}
                </span>
                <span className="mastery-pts">{fmtPoints(m.championPoints)}</span>
                {m.chestGranted && <span title="Baú obtido este season">🎁</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
