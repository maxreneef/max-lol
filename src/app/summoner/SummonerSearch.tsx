"use client";

import { useState } from "react";
import { PLATFORMS, type SummonerProfile } from "@/lib/types";

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
        setProfile(data as SummonerProfile);
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
        </div>
      )}
    </div>
  );
}
