"use client";

import { useState } from "react";
import Link from "next/link";
import { PLATFORMS, type SummonerProfile, type MatchHistory } from "@/lib/types";

const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranqueada Solo/Duo",
  RANKED_FLEX_SR: "Ranqueada Flex",
};

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

export function SummonerSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("br1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matches, setMatches] = useState<MatchHistory | null>(null);

  async function fetchMatches(profileData: SummonerProfile) {
    setLoadingMatches(true);
    try {
      const res = await fetch(
        `/api/matches?puuid=${encodeURIComponent(
          profileData.account.puuid
        )}&region=${region}&start=0&count=20`
      );
      const data = await res.json();
      if (res.ok) {
        setMatches(data as MatchHistory);
      }
    } catch {
      console.error("Erro ao buscar histórico");
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProfile(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao buscar invocador.");
      } else {
        const profileData = data as SummonerProfile;
        setProfile(profileData);
        // Busca histórico de partidas automaticamente
        fetchMatches(profileData);
      }
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          placeholder="Nome#TAG"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          required
          aria-label="Riot ID"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Região"
        >
          {Object.entries(PLATFORMS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="search-error">{error}</p>}

      {profile && (
        <div className="profile-card">
          {profile.source === "mock" && (
            <p className="mock-badge">
              Dados de demonstração — a chave da API da Riot ainda não está
              configurada neste ambiente.
            </p>
          )}
          <div className="profile-header">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/profileicon/${profile.summoner.profileIconId}.png`}
              alt="Ícone de perfil"
              width={72}
              height={72}
              className="profile-icon"
            />
            <div>
              <h2>
                {profile.account.gameName}
                <span className="tag">#{profile.account.tagLine}</span>
              </h2>
              <p className="level">
                Nível {profile.summoner.summonerLevel} ·{" "}
                {profile.region.toUpperCase()}
              </p>
            </div>
          </div>

          <h3 className="ranked-title">Filas ranqueadas</h3>
          {profile.ranked.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Sem partidas ranqueadas.</p>
          ) : (
            <div className="ranked-grid">
              {profile.ranked.map((entry) => (
                <div key={entry.leagueId} className="ranked-card">
                  <p className="queue">
                    {QUEUE_LABELS[entry.queueType] ?? entry.queueType}
                  </p>
                  <p className="tier">
                    {entry.tier} {entry.rank} · {entry.leaguePoints} LP
                  </p>
                  <p className="record">
                    {entry.wins}V {entry.losses}D ·{" "}
                    <strong>{winRate(entry.wins, entry.losses)}</strong> WR
                    {entry.hotStreak && " · 🔥"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {loadingMatches && (
            <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>
              Carregando histórico de partidas...
            </p>
          )}

          {matches && matches.matchIds.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <h3 className="ranked-title">Últimas partidas</h3>
              <div className="match-list">
                {matches.matchIds.map((matchId) => (
                  <Link
                    key={matchId}
                    href={`/match/${matchId}?region=${region}&puuid=${profile.account.puuid}`}
                    className="match-item"
                  >
                    <span className="match-id">{matchId.split("-")[1] ?? matchId}</span>
                    <span className="arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
