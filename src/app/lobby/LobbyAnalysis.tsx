"use client";

import { useState } from "react";
import Link from "next/link";
import type { SummonerProfile } from "@/lib/types";
import { championIcon, DD_BASE } from "@/lib/ddragon";

const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

const TIER_ORDER = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"];

function tierColor(tier: string) {
  const colors: Record<string, string> = {
    IRON: "#7d6e5e", BRONZE: "#cd7f32", SILVER: "#adb5bd",
    GOLD: "#c89b3c", PLATINUM: "#4db8a8", EMERALD: "#51cf66",
    DIAMOND: "#6fa8dc", MASTER: "#9b59b6", GRANDMASTER: "#ff6b6b", CHALLENGER: "#c89b3c",
  };
  return colors[tier] ?? "var(--muted)";
}

function winRate(wins: number, losses: number) {
  const t = wins + losses;
  if (!t) return "—";
  return `${Math.round((wins / t) * 100)}%`;
}

function tierScore(tier: string, rank: string, lp: number) {
  const tIdx = TIER_ORDER.indexOf(tier);
  const rankVal = { I: 4, II: 3, III: 2, IV: 1 }[rank] ?? 0;
  return tIdx * 1000 + rankVal * 100 + lp;
}

interface PlayerResult {
  riotId: string;
  profile: SummonerProfile | null;
  error?: string;
}

export function LobbyAnalysis() {
  const [input, setInput] = useState("");
  const [region, setRegion] = useState("br1");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const ids = input
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.includes("#"))
      .slice(0, 10);

    if (!ids.length) return;
    setLoading(true);
    setResults([]);

    const fetches = ids.map(async (riotId): Promise<PlayerResult> => {
      try {
        const res = await fetch(
          `/api/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`
        );
        const data = await res.json();
        if (!res.ok) return { riotId, profile: null, error: data.error };
        return { riotId, profile: data as SummonerProfile };
      } catch {
        return { riotId, profile: null, error: "Falha de rede." };
      }
    });

    const all = await Promise.all(fetches);
    // Ordena por elo (mais alto primeiro)
    all.sort((a, b) => {
      const sa = a.profile?.ranked?.find((r) => r.queueType === "RANKED_SOLO_5x5");
      const sb = b.profile?.ranked?.find((r) => r.queueType === "RANKED_SOLO_5x5");
      const va = sa ? tierScore(sa.tier, sa.rank, sa.leaguePoints) : -1;
      const vb = sb ? tierScore(sb.tier, sb.rank, sb.leaguePoints) : -1;
      return vb - va;
    });

    setResults(all);
    setLoading(false);
  }

  const found = results.filter((r) => r.profile);
  const avgScore =
    found.length > 0
      ? found.reduce((acc, r) => {
          const s = r.profile!.ranked.find((x) => x.queueType === "RANKED_SOLO_5x5");
          return acc + (s ? tierScore(s.tier, s.rank, s.leaguePoints) : 0);
        }, 0) / found.length
      : 0;
  const avgTier =
    avgScore > 7000 ? "DIAMOND+" : avgScore > 5000 ? "PLATINUM" : avgScore > 3000 ? "GOLD" : avgScore > 1000 ? "SILVER" : "IRON/BRONZE";

  return (
    <div>
      <form onSubmit={handleAnalyze} className="lobby-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"KierDock#13116\nFaker#KR1\nNome#TAG"}
          rows={6}
          className="lobby-textarea"
        />
        <div className="lobby-actions">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="tl-sort"
          >
            {[["br1","BR1"],["na1","NA1"],["euw1","EUW1"],["kr","KR"],["las","LAS"],["lan","LAN"]].map(
              ([v, l]) => <option key={v} value={v}>{l}</option>
            )}
          </select>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Analisando..." : "Analisar lobby"}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="lobby-results">
          {found.length > 1 && (
            <div className="lobby-summary">
              <span>🏆 Elo médio estimado: <strong>{avgTier}</strong></span>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                {found.length} de {results.length} jogadores encontrados
              </span>
            </div>
          )}

          <div className="lobby-grid">
            {results.map(({ riotId, profile, error }) => {
              if (!profile) {
                return (
                  <div key={riotId} className="lobby-card lobby-error">
                    <p className="lobby-name">{riotId}</p>
                    <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error ?? "Não encontrado"}</p>
                  </div>
                );
              }

              const solo = profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
              const flex = profile.ranked.find((r) => r.queueType === "RANKED_FLEX_SR");

              return (
                <div key={riotId} className="lobby-card">
                  <div className="lobby-card-header">
                    <img
                      src={`${DD_BASE}/img/profileicon/${profile.summoner.profileIconId}.png`}
                      alt="icon"
                      width={44}
                      height={44}
                      className="profile-icon"
                      style={{ width: 44, height: 44 }}
                    />
                    <div>
                      <Link
                        href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`}
                        className="lobby-name"
                      >
                        {profile.account.gameName}
                        <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                          #{profile.account.tagLine}
                        </span>
                      </Link>
                      <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        Nível {profile.summoner.summonerLevel}
                      </p>
                    </div>
                  </div>

                  <div className="lobby-ranks">
                    {solo ? (
                      <div className="lobby-rank-row">
                        <span className="lobby-queue">Solo</span>
                        <span style={{ color: tierColor(solo.tier), fontWeight: 700 }}>
                          {solo.tier} {solo.rank}
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                          {solo.leaguePoints} LP · {winRate(solo.wins, solo.losses)} WR
                          {solo.hotStreak && " 🔥"}
                        </span>
                      </div>
                    ) : (
                      <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Sem ranked Solo</p>
                    )}
                    {flex && (
                      <div className="lobby-rank-row">
                        <span className="lobby-queue">Flex</span>
                        <span style={{ color: tierColor(flex.tier), fontWeight: 700 }}>
                          {flex.tier} {flex.rank}
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                          {flex.leaguePoints} LP · {winRate(flex.wins, flex.losses)} WR
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
