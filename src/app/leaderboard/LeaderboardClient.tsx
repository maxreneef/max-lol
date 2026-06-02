"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PLATFORMS } from "@/lib/types";
import type { LeagueList, LeagueEntry } from "@/lib/types";

type Tier = "challenger" | "grandmaster" | "master";
type Queue = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";

function winRate(w: number, l: number) {
  return ((w / Math.max(w + l, 1)) * 100).toFixed(0);
}

export function LeaderboardClient() {
  const [region, setRegion] = useState("br1");
  const [tier, setTier] = useState<Tier>("challenger");
  const [queue, setQueue] = useState<Queue>("RANKED_SOLO_5x5");
  const [data, setData] = useState<LeagueList | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/leaderboard?region=${region}&tier=${tier}&queue=${queue}`)
      .then((r) => r.json())
      .then((d) => setData(d as LeagueList))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [region, tier, queue]);

  const entries = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.entries].sort((a, b) => b.leaguePoints - a.leaguePoints);
    if (!search.trim()) return sorted;
    return sorted.filter((e) =>
      e.summonerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const TIER_COLORS: Record<Tier, string> = {
    challenger: "#c89b3c",
    grandmaster: "#ff6b6b",
    master: "#9b59b6",
  };

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Leaderboard</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Os melhores invocadores por região e fila ranqueada.
      </p>

      <div className="lb-filters">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="tl-sort">
          {Object.entries(PLATFORMS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <div className="tl-pills">
          {(["challenger", "grandmaster", "master"] as Tier[]).map((t) => (
            <button
              key={t}
              className={`tl-pill ${tier === t ? "active" : ""}`}
              onClick={() => setTier(t)}
              style={tier === t ? {} : { color: TIER_COLORS[t] }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="tl-pills">
          <button
            className={`tl-pill ${queue === "RANKED_SOLO_5x5" ? "active" : ""}`}
            onClick={() => setQueue("RANKED_SOLO_5x5")}
          >Solo/Duo</button>
          <button
            className={`tl-pill ${queue === "RANKED_FLEX_SR" ? "active" : ""}`}
            onClick={() => setQueue("RANKED_FLEX_SR")}
          >Flex</button>
        </div>

        <input
          type="text"
          placeholder="Buscar jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tl-search"
          style={{ marginLeft: "auto" }}
        />
      </div>

      {loading && (
        <div className="matches-loading">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="match-skeleton" style={{ height: 48 }} />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>{" "}
            · {entries.length} jogadores
          </p>
          <div className="lb-table-wrap">
            <table className="tl-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Invocador</th>
                  <th>LP</th>
                  <th>Win Rate</th>
                  <th>Partidas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.summonerId}>
                    <td>
                      <span className={`lb-rank ${i < 3 ? `lb-top${i + 1}` : ""}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <span className="lb-name">
                        {e.summonerName}
                        {e.hotStreak && " 🔥"}
                        {e.veteran && <span className="lb-badge lb-vet">Veterano</span>}
                        {e.freshBlood && <span className="lb-badge lb-new">Novo</span>}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: TIER_COLORS[tier] }}>{e.leaguePoints}</strong>
                    </td>
                    <td>
                      <span className={parseInt(winRate(e.wins, e.losses)) >= 55 ? "stat-good" : ""}>
                        {winRate(e.wins, e.losses)}%
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {e.wins + e.losses}
                    </td>
                    <td>
                      <Link
                        href={`/summoner?riotId=${encodeURIComponent(e.summonerName)}&region=${region}`}
                        className="lb-search-btn"
                      >
                        Ver perfil →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
