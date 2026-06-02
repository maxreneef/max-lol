"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  PLATFORMS,
  QUEUE_NAMES,
  type MatchSummary,
  type SummonerProfile,
} from "@/lib/types";
import { calcGrade, GRADE_COLORS } from "@/lib/grade";
import { PerformanceChart } from "./PerformanceChart";
import { LiveGame } from "./LiveGame";
import { ChampStats } from "./ChampStats";
import { MasterySection } from "./MasterySection";
import { RecentForm } from "./RecentForm";
import { ProfileSkeleton } from "./ProfileSkeleton";

/* ── localStorage helpers ── */
const SEARCH_KEY = "maxlol:recent_searches";
const FAV_KEY    = "maxlol:favorites";
const MAX_RECENT = 10;
const MAX_FAV    = 20;

interface SavedEntry { riotId: string; region: string }

function loadList(key: string): SavedEntry[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function saveList(key: string, list: SavedEntry[]) {
  localStorage.setItem(key, JSON.stringify(list));
}
function upsert(list: SavedEntry[], entry: SavedEntry, max: number): SavedEntry[] {
  const next = list.filter((s) => !(s.riotId === entry.riotId && s.region === entry.region));
  next.unshift(entry);
  return next.slice(0, max);
}
function remove(list: SavedEntry[], entry: SavedEntry): SavedEntry[] {
  return list.filter((s) => !(s.riotId === entry.riotId && s.region === entry.region));
}

/* ── misc utils ── */
const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranqueada Solo/Duo",
  RANKED_FLEX_SR: "Ranqueada Flex",
};
function winRate(wins: number, losses: number) {
  const t = wins + losses;
  return t ? `${Math.round((wins / t) * 100)}%` : "0%";
}
function formatDuration(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60_000);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}
function kdaColor(k: number, d: number, a: number) {
  const r = (k + a) / Math.max(d, 1);
  if (r >= 4) return "#51cf66";
  if (r >= 2.5) return "var(--accent-2)";
  if (r >= 1.5) return "var(--text)";
  return "#ff6b6b";
}

/* ── component ── */
interface Props {
  searchParamsPromise: Promise<{ riotId?: string; region?: string }>;
}

export function SummonerSearch({ searchParamsPromise }: Props) {
  const searchParams = use(searchParamsPromise);

  const [riotId, setRiotId] = useState(searchParams.riotId ?? "");
  const [region, setRegion] = useState(searchParams.region ?? "br1");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [profile, setProfile]           = useState<SummonerProfile | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [summaries, setSummaries]       = useState<MatchSummary[] | null>(null);
  const [champFilter, setChampFilter]   = useState("Todos");
  const [page, setPage]                 = useState(0);          // paginação
  const [hasMore, setHasMore]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions]   = useState<SavedEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recents, setRecents]           = useState<SavedEntry[]>([]);
  const inputRef    = useRef<HTMLInputElement>(null);
  const sugRef      = useRef<HTMLDivElement>(null);

  // Favoritos
  const [favorites, setFavorites]       = useState<SavedEntry[]>([]);
  const isFav = profile
    ? favorites.some((f) => f.riotId === riotId && f.region === region)
    : false;

  // Init localStorage
  useEffect(() => {
    setRecents(loadList(SEARCH_KEY));
    setFavorites(loadList(FAV_KEY));
  }, []);

  // Auto-search se vier URL params
  useEffect(() => {
    if (searchParams.riotId?.includes("#")) {
      doSearch(searchParams.riotId, searchParams.region ?? "br1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function h(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) &&
          !sugRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleInputChange(val: string) {
    setRiotId(val);
    const q = val.toLowerCase().trim();
    const all = loadList(SEARCH_KEY);
    const filtered = q ? all.filter((s) => s.riotId.toLowerCase().includes(q)) : all;
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }

  function handleFocus() {
    const all = loadList(SEARCH_KEY);
    setRecents(all);
    setSuggestions(all);
    setShowSuggestions(all.length > 0);
  }

  function applySuggestion(s: SavedEntry) {
    setRiotId(s.riotId);
    setRegion(s.region);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function toggleFav() {
    if (!profile) return;
    const entry = { riotId, region };
    const current = loadList(FAV_KEY);
    const next = isFav ? remove(current, entry) : upsert(current, entry, MAX_FAV);
    saveList(FAV_KEY, next);
    setFavorites(next);
  }

  async function fetchSummaries(puuid: string, reg: string, startPage = 0, append = false) {
    const start = startPage * 20;
    if (!append) { setLoadingMatches(true); setSummaries(null); }
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/matches/summary?puuid=${encodeURIComponent(puuid)}&region=${reg}&count=20&start=${start}`
      );
      const data = await res.json();
      if (res.ok) {
        const newItems = data as MatchSummary[];
        setSummaries((prev) => append && prev ? [...prev, ...newItems] : newItems);
        setHasMore(newItems.length === 20);
        setPage(startPage);
      }
    } catch { console.error("Erro ao buscar histórico"); }
    finally { setLoadingMatches(false); setLoadingMore(false); }
  }

  async function doSearch(id: string, reg: string) {
    setShowSuggestions(false);
    setError(null);
    setProfile(null);
    setSummaries(null);
    setPage(0);
    setHasMore(false);
    setChampFilter("Todos");
    setLoading(true);

    try {
      const res = await fetch(`/api/summoner?riotId=${encodeURIComponent(id)}&region=${reg}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao buscar invocador.");
      } else {
        const p = data as SummonerProfile;
        setProfile(p);
        // salva em recentes
        const newRecents = upsert(loadList(SEARCH_KEY), { riotId: id, region: reg }, MAX_RECENT);
        saveList(SEARCH_KEY, newRecents);
        setRecents(newRecents);
        fetchSummaries(p.account.puuid, reg, 0, false);
      }
    } catch { setError("Falha de rede. Tente novamente."); }
    finally { setLoading(false); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(riotId, region);
  }

  const filteredSummaries = summaries?.filter(
    (s) => champFilter === "Todos" || s.championName === champFilter
  ) ?? [];

  return (
    <div>
      {/* Favoritos */}
      {favorites.length > 0 && !profile && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            ⭐ Favoritos
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {favorites.map((f) => (
              <button
                key={`${f.riotId}-${f.region}`}
                className="tl-pill"
                onClick={() => { setRiotId(f.riotId); setRegion(f.region); doSearch(f.riotId, f.region); }}
              >
                {f.riotId} <span style={{ color: "var(--accent)", marginLeft: "0.3rem" }}>{f.region.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
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
            <div ref={sugRef} className="suggestions-dropdown">
              <p className="suggestions-label">Buscas recentes</p>
              {suggestions.map((s) => (
                <button
                  key={`${s.riotId}-${s.region}`}
                  type="button"
                  className="suggestion-item"
                  onMouseDown={() => applySuggestion(s)}
                >
                  <span className="suggestion-name">{s.riotId}</span>
                  <span className="suggestion-region">{s.region.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Região">
          {Object.entries(PLATFORMS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="search-error" style={{ marginTop: "1rem" }}>{error}</p>}

      {loading && <ProfileSkeleton />}

      {!loading && profile && (
        <div className="profile-card">
          <LiveGame puuid={profile.account.puuid} region={region} />

          {profile.source === "mock" && (
            <p className="mock-badge">
              Dados de demonstração — chave da API não configurada.
            </p>
          )}

          <div className="profile-header">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/profileicon/${profile.summoner.profileIconId}.png`}
              alt="Ícone"
              width={72} height={72}
              className="profile-icon"
            />
            <div style={{ flex: 1 }}>
              <h2>
                {profile.account.gameName}
                <span className="tag">#{profile.account.tagLine}</span>
              </h2>
              <p className="level">Nível {profile.summoner.summonerLevel} · {profile.region.toUpperCase()}</p>
            </div>
            {/* Botão favoritar */}
            <button
              onClick={toggleFav}
              title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}
            >
              {isFav ? "⭐" : "☆"}
            </button>
            {/* Link compartilhar */}
            <button
              title="Copiar link do perfil"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, color: "var(--muted)" }}
              onClick={() => {
                const url = `${location.origin}/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`;
                navigator.clipboard.writeText(url).then(() => alert("Link copiado!"));
              }}
            >
              🔗
            </button>
          </div>

          <h3 className="ranked-title">Filas ranqueadas</h3>
          {profile.ranked.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Sem partidas ranqueadas.</p>
          ) : (
            <div className="ranked-grid">
              {profile.ranked.map((entry) => (
                <div key={entry.leagueId} className="ranked-card">
                  <p className="queue">{QUEUE_LABELS[entry.queueType] ?? entry.queueType}</p>
                  <p className="tier">{entry.tier} {entry.rank} · {entry.leaguePoints} LP</p>
                  <p className="record">
                    {entry.wins}V {entry.losses}D · <strong>{winRate(entry.wins, entry.losses)}</strong> WR
                    {entry.hotStreak && " · 🔥"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {summaries && summaries.length > 0 && <RecentForm summaries={summaries} />}
          <MasterySection puuid={profile.account.puuid} region={region} />

          {summaries && summaries.length >= 3 && (
            <PerformanceChart summaries={summaries} />
          )}

          {summaries && summaries.length > 0 && (
            <ChampStats summaries={summaries} />
          )}

          {/* Últimas partidas */}
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <h3 className="ranked-title" style={{ margin: 0 }}>Últimas partidas</h3>
              {summaries && summaries.length > 0 && (
                <div className="tl-pills" style={{ flexWrap: "wrap" }}>
                  {["Todos", ...Array.from(new Set(summaries.map((s) => s.championName))).sort()].map((c) => (
                    <button
                      key={c}
                      className={`tl-pill ${champFilter === c ? "active" : ""}`}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
                      onClick={() => setChampFilter(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingMatches && (
              <div className="matches-loading">
                <div className="match-skeleton" />
                <div className="match-skeleton" />
                <div className="match-skeleton" />
              </div>
            )}

            {filteredSummaries.length > 0 && (
              <div className="match-list-rich">
                {filteredSummaries.map((s) => (
                  <Link
                    key={s.matchId}
                    href={`/match/${s.matchId}?region=${region}&puuid=${profile.account.puuid}`}
                    className={`match-card ${s.win ? "match-win" : "match-loss"}`}
                  >
                    <div className="match-result-bar" />
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/champion/${s.championName}.png`}
                      alt={s.championName}
                      width={44} height={44}
                      className="match-champ-icon"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="match-card-main">
                      <p className="match-queue">
                        {QUEUE_NAMES[s.queueId] ?? s.gameMode}
                        <span className="match-time"> · {timeAgo(s.gameCreation)}</span>
                      </p>
                      <p className="match-champ-name">{s.championName}</p>
                    </div>
                    <div className="match-card-kda">
                      <p className="match-kda-value" style={{ color: kdaColor(s.kills, s.deaths, s.assists) }}>
                        {s.kills} / {s.deaths} / {s.assists}
                      </p>
                      <p className="match-kda-ratio">
                        {((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(1)} KDA
                      </p>
                    </div>
                    <div className="match-card-stats">
                      <p>{(s.totalDamageDealtToChampions / 1000).toFixed(1)}k dano</p>
                      <p>{(s.cs ?? 0)} CS ({((s.cs ?? 0) / Math.max(s.gameDuration / 60, 1)).toFixed(1)}/min)</p>
                      <p>{formatDuration(s.gameDuration)}</p>
                    </div>
                    <div className="match-grade" style={{ color: GRADE_COLORS[calcGrade(s, summaries ?? [])] }}>
                      {calcGrade(s, summaries ?? [])}
                    </div>
                    <div className={`match-outcome ${s.win ? "win" : "loss"}`}>{s.win ? "V" : "D"}</div>

                  </Link>
                ))}
              </div>
            )}

            {summaries && filteredSummaries.length === 0 && !loadingMatches && (
              <p style={{ color: "var(--muted)" }}>Nenhuma partida com este campeão.</p>
            )}

            {/* Carregar mais */}
            {hasMore && champFilter === "Todos" && (
              <button
                className="btn"
                style={{ marginTop: "1rem", width: "100%" }}
                disabled={loadingMore}
                onClick={() => fetchSummaries(profile.account.puuid, region, page + 1, true)}
              >
                {loadingMore ? "Carregando..." : "Carregar mais 20 partidas"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
