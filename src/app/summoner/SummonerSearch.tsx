"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PLATFORMS, type SummonerProfile, type MatchHistory } from "@/lib/types";

const STORAGE_KEY = "maxlol:recent_searches";
const MAX_RECENT = 10;

interface RecentSearch {
  riotId: string;
  region: string;
  label: string; // "Nome#TAG · BR1"
}

function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSearch(riotId: string, region: string) {
  const label = `${riotId} · ${region.toUpperCase()}`;
  const recent = loadRecent().filter((s) => s.label !== label);
  recent.unshift({ riotId, region, label });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

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

  // Autocomplete
  const [suggestions, setSuggestions] = useState<RecentSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentAll, setRecentAll] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentAll(loadRecent());
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !suggestionsRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInputChange(value: string) {
    setRiotId(value);
    const q = value.toLowerCase().trim();
    if (q.length === 0) {
      setSuggestions(recentAll);
      setShowSuggestions(recentAll.length > 0);
    } else {
      const filtered = recentAll.filter((s) =>
        s.riotId.toLowerCase().includes(q)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  }

  function handleFocus() {
    const recent = loadRecent();
    setRecentAll(recent);
    if (riotId.trim().length === 0) {
      setSuggestions(recent);
      setShowSuggestions(recent.length > 0);
    }
  }

  function applySuggestion(s: RecentSearch) {
    setRiotId(s.riotId);
    setRegion(s.region);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  async function fetchMatches(profileData: SummonerProfile, reg: string) {
    setLoadingMatches(true);
    try {
      const res = await fetch(
        `/api/matches?puuid=${encodeURIComponent(
          profileData.account.puuid
        )}&region=${reg}&start=0&count=20`
      );
      const data = await res.json();
      if (res.ok) setMatches(data as MatchHistory);
    } catch {
      console.error("Erro ao buscar histórico");
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    setError(null);
    setProfile(null);
    setMatches(null);
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
        saveSearch(riotId, region);
        setRecentAll(loadRecent());
        fetchMatches(profileData, region);
      }
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="search-form" style={{ position: "relative" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Nome#TAG"
            value={riotId}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            required
            aria-label="Riot ID"
            autoComplete="off"
            style={{ width: "100%" }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="suggestions-dropdown">
              <p className="suggestions-label">Buscas recentes</p>
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="suggestion-item"
                  onMouseDown={() => applySuggestion(s)}
                >
                  <span className="suggestion-name">{s.riotId}</span>
                  <span className="suggestion-region">
                    {s.region.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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
                    <span className="match-id">{matchId}</span>
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
