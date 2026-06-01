"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PLATFORMS,
  QUEUE_NAMES,
  type MatchSummary,
  type SummonerProfile,
} from "@/lib/types";

const STORAGE_KEY = "maxlol:recent_searches";
const MAX_RECENT = 10;

interface RecentSearch {
  riotId: string;
  region: string;
}

function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSearch(riotId: string, region: string) {
  const recent = loadRecent().filter(
    (s) => !(s.riotId === riotId && s.region === region)
  );
  recent.unshift({ riotId, region });
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function kdaColor(deaths: number, kills: number, assists: number): string {
  const kda = (kills + assists) / Math.max(deaths, 1);
  if (kda >= 4) return "#51cf66";
  if (kda >= 2.5) return "var(--accent-2)";
  if (kda >= 1.5) return "var(--text)";
  return "#ff6b6b";
}

export function SummonerSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("br1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [summaries, setSummaries] = useState<MatchSummary[] | null>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<RecentSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentAll, setRecentAll] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentAll(loadRecent());
  }, []);

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
    const filtered = recentAll.filter((s) =>
      s.riotId.toLowerCase().includes(q)
    );
    setSuggestions(q.length === 0 ? recentAll : filtered);
    setShowSuggestions((q.length === 0 ? recentAll : filtered).length > 0);
  }

  function handleFocus() {
    const recent = loadRecent();
    setRecentAll(recent);
    setSuggestions(riotId.trim() ? recent.filter((s) => s.riotId.toLowerCase().includes(riotId.toLowerCase())) : recent);
    setShowSuggestions(recent.length > 0);
  }

  function applySuggestion(s: RecentSearch) {
    setRiotId(s.riotId);
    setRegion(s.region);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function fetchSummaries(puuid: string, reg: string) {
    setLoadingMatches(true);
    setSummaries(null);
    try {
      const res = await fetch(
        `/api/matches/summary?puuid=${encodeURIComponent(puuid)}&region=${reg}&count=20`
      );
      const data = await res.json();
      if (res.ok) setSummaries(data as MatchSummary[]);
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
    setSummaries(null);
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
        fetchSummaries(profileData.account.puuid, region);
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
                  key={`${s.riotId}-${s.region}`}
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
              Dados de demonstração — chave da API da Riot não configurada.
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

          <div style={{ marginTop: "2rem" }}>
            <h3 className="ranked-title">Últimas partidas</h3>

            {loadingMatches && (
              <div className="matches-loading">
                <div className="match-skeleton" />
                <div className="match-skeleton" />
                <div className="match-skeleton" />
              </div>
            )}

            {summaries && summaries.length > 0 && (
              <div className="match-list-rich">
                {summaries.map((s) => (
                  <Link
                    key={s.matchId}
                    href={`/match/${s.matchId}?region=${region}&puuid=${profile.account.puuid}`}
                    className={`match-card ${s.win ? "match-win" : "match-loss"}`}
                  >
                    <div className="match-result-bar" />
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/champion/${s.championName}.png`}
                      alt={s.championName}
                      width={44}
                      height={44}
                      className="match-champ-icon"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="match-card-main">
                      <p className="match-queue">
                        {QUEUE_NAMES[s.queueId] ?? s.gameMode}
                        <span className="match-time">
                          {" · "}
                          {timeAgo(s.gameCreation)}
                        </span>
                      </p>
                      <p className="match-champ-name">{s.championName}</p>
                    </div>
                    <div className="match-card-kda">
                      <p
                        className="match-kda-value"
                        style={{
                          color: kdaColor(s.deaths, s.kills, s.assists),
                        }}
                      >
                        {s.kills} / {s.deaths} / {s.assists}
                      </p>
                      <p className="match-kda-ratio">
                        {((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(1)}{" "}
                        KDA
                      </p>
                    </div>
                    <div className="match-card-stats">
                      <p>{(s.totalDamageDealtToChampions / 1000).toFixed(1)}k dano</p>
                      <p>{(s.goldEarned / 1000).toFixed(1)}k ouro</p>
                      <p>{formatDuration(s.gameDuration)}</p>
                    </div>
                    <div className={`match-outcome ${s.win ? "win" : "loss"}`}>
                      {s.win ? "V" : "D"}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {summaries && summaries.length === 0 && (
              <p style={{ color: "var(--muted)" }}>Sem partidas recentes.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
