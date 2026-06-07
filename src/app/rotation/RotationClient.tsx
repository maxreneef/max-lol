"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PLATFORMS } from "@/lib/types";
import { mockTierStats, DD_BASE } from "@/lib/ddragon";

interface FreeRotation {
  freeChampionIds: number[];
  freeChampionIdsForNewPlayers: number[];
  maxNewPlayerLevel?: number;
}

let champKeyMap: Record<number, { id: string; name: string }> = {};
async function loadMap() {
  if (Object.keys(champKeyMap).length) return;
  try {
    const res = await fetch(`${DD_BASE}/data/pt_BR/champion.json`);
    const json = await res.json();
    champKeyMap = Object.fromEntries(
      Object.values(json.data as Record<string, { key: string; id: string; name: string }>).map((c) => [
        parseInt(c.key), { id: c.id, name: c.name },
      ])
    );
  } catch {}
}

export function RotationClient() {
  const [region, setRegion] = useState("br1");
  const [rotation, setRotation] = useState<FreeRotation | null>(null);
  const [champMap, setChampMap] = useState<Record<number, { id: string; name: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMap().then(() => setChampMap({ ...champKeyMap }));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/freerotation?region=${region}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRotation(d as FreeRotation);
      })
      .catch(() => setError("Falha de rede."))
      .finally(() => setLoading(false));
  }, [region]);

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="tl-sort">
          {Object.entries(PLATFORMS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="matches-loading">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="match-skeleton" style={{ height: 80 }} />)}
        </div>
      )}

      {error && <p className="search-error">{error}</p>}

      {rotation && !loading && (
        <>
          <h2 className="home-section-title" style={{ fontSize: "1.15rem" }}>
            Todos os jogadores — {rotation.freeChampionIds.length} campeões
          </h2>
          <div className="rotation-grid">
            {rotation.freeChampionIds.map((id) => {
              const champ = champMap[id];
              if (!champ) return null;
              const stats = mockTierStats(champ.id);
              return (
                <Link key={id} href={`/champion/${champ.id}`} className="rotation-card">
                  <img
                    src={`${DD_BASE}/img/champion/${champ.id}.png`}
                    alt={champ.name}
                    width={64} height={64}
                    className="rotation-icon"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="rotation-name">{champ.name}</p>
                  <p className="rotation-tier" style={{
                    color: stats.tier === "S" ? "#c89b3c" : stats.tier === "A" ? "#51cf66" : "var(--muted)"
                  }}>
                    Tier {stats.tier} · {stats.winRate}%
                  </p>
                </Link>
              );
            })}
          </div>

          {rotation.freeChampionIdsForNewPlayers.length > 0 && (
            <>
              <h2 className="home-section-title" style={{ fontSize: "1.15rem", marginTop: "2rem" }}>
                Novos jogadores (até nível {rotation.maxNewPlayerLevel ?? 10})
              </h2>
              <div className="rotation-grid">
                {rotation.freeChampionIdsForNewPlayers.map((id) => {
                  const champ = champMap[id];
                  if (!champ) return null;
                  return (
                    <Link key={id} href={`/champion/${champ.id}`} className="rotation-card">
                      <img
                        src={`${DD_BASE}/img/champion/${champ.id}.png`}
                        alt={champ.name}
                        width={64} height={64}
                        className="rotation-icon"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <p className="rotation-name">{champ.name}</p>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
