"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/types";
import type { LeagueList, LeagueEntry } from "@/lib/types";

type Tier = "challenger" | "grandmaster" | "master";
type Queue = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";

const TIER_COLORS: Record<Tier, string> = {
  challenger: "#c89b3c", grandmaster: "#ff6b6b", master: "#9b59b6",
};

function winRate(w: number, l: number) {
  return ((w / Math.max(w + l, 1)) * 100).toFixed(0);
}

// Cache de resoluções summonerId → riotId
const resolveCache = new Map<string, string | null>();

function PlayerCell({ entry, region, rank }: { entry: LeagueEntry; region: string; rank: number }) {
  const router = useRouter();
  const [riotId, setRiotId]   = useState<string | null>(
    entry.summonerName?.includes("#") ? entry.summonerName : null
  );
  const [loading, setLoading] = useState(false);

  async function resolve() {
    if (riotId) {
      router.push(`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`);
      return;
    }
    if (resolveCache.has(entry.summonerId)) {
      const cached = resolveCache.get(entry.summonerId)!;
      if (cached) router.push(`/summoner?riotId=${encodeURIComponent(cached)}&region=${region}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/resolve?summonerId=${encodeURIComponent(entry.summonerId)}&region=${region}`
      );
      const data = await res.json();
      const id = data.riotId ?? null;
      resolveCache.set(entry.summonerId, id);
      setRiotId(id);
      if (id) router.push(`/summoner?riotId=${encodeURIComponent(id)}&region=${region}`);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  const displayName = riotId || entry.summonerName || `Jogador #${rank}`;

  return (
    <td>
      <button
        className="lb-name lb-name-btn"
        onClick={resolve}
        disabled={loading}
        title="Ver perfil do invocador"
      >
        {loading ? "Carregando…" : displayName}
        {entry.hotStreak && " 🔥"}
        {entry.veteran && <span className="lb-badge lb-vet">Vet</span>}
        {entry.freshBlood && <span className="lb-badge lb-new">Novo</span>}
      </button>
    </td>
  );
}

export function LeaderboardClient() {
  const [region, setRegion] = useState("br1");
  const [tier, setTier]     = useState<Tier>("challenger");
  const [queue, setQueue]   = useState<Queue>("RANKED_SOLO_5x5");
  const [data, setData]     = useState<LeagueList | null>(null);
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
    const q = search.toLowerCase();
    return sorted.filter((e) =>
      (e.summonerName ?? "").toLowerCase().includes(q) ||
      e.summonerId.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Leaderboard</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Os melhores invocadores por região e fila ranqueada. Clique no nome para ver o perfil.
      </p>

      <div className="lb-filters">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="tl-sort">
          {Object.entries(PLATFORMS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <div className="tl-pills">
          {(["challenger", "grandmaster", "master"] as Tier[]).map((t) => (
            <button key={t} className={`tl-pill ${tier === t ? "active" : ""}`}
              onClick={() => setTier(t)}
              style={tier === t ? {} : { color: TIER_COLORS[t] }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="tl-pills">
          <button className={`tl-pill ${queue === "RANKED_SOLO_5x5" ? "active" : ""}`} onClick={() => setQueue("RANKED_SOLO_5x5")}>Solo/Duo</button>
          <button className={`tl-pill ${queue === "RANKED_FLEX_SR"  ? "active" : ""}`} onClick={() => setQueue("RANKED_FLEX_SR")}>Flex</button>
        </div>
        <input type="text" placeholder="Buscar jogador..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="tl-search" style={{ marginLeft: "auto" }} />
      </div>

      {loading && (
        <div className="matches-loading">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="match-skeleton" style={{ height: 48 }} />)}
        </div>
      )}

      {!loading && data && (
        <>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>{" "}
            · {entries.length} jogadores
            <span style={{ marginLeft: "0.75rem", fontSize: "0.78rem" }}>
              (clique no nome para ver o perfil)
            </span>
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
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.summonerId}>
                    <td>
                      <span className={`lb-rank ${i < 3 ? `lb-top${i + 1}` : ""}`}>{i + 1}</span>
                    </td>
                    <PlayerCell entry={e} region={region} rank={i + 1} />
                    <td><strong style={{ color: TIER_COLORS[tier] }}>{e.leaguePoints}</strong></td>
                    <td>
                      <span className={parseInt(winRate(e.wins, e.losses)) >= 55 ? "stat-good" : ""}>
                        {winRate(e.wins, e.losses)}%
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{e.wins + e.losses}</td>
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
