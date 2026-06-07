"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/types";

const DD_IMG = `${DD_BASE}/img`;
let cachedChampions: Array<{ id: string; name: string; image: string }> | null = null;

async function loadChampions() {
  if (cachedChampions) return cachedChampions;
  const res = await fetch(`${DD_BASE}/data/pt_BR/champion.json`);
  const data = await res.json();
  cachedChampions = Object.values(data.data as Record<string, { id: string; name: string; image: { full: string } }>).map((c) => ({
    id: c.id,
    name: c.name,
    image: `${DD_IMG}/champion/${c.image.full}`,
  }));
  return cachedChampions;
}

export function HomeSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("br1");
  const [championSearch, setChampionSearch] = useState("");
  const [champs, setChamps] = useState<Array<{ id: string; name: string; image: string }>>([]);
  const [champOpen, setChampOpen] = useState(false);
  const [champHighlight, setChampHighlight] = useState(-1);
  const router = useRouter();

  useEffect(() => { loadChampions().then(setChamps); }, []);

  const champSuggestions = useMemo(() => {
    if (!championSearch.trim()) return [];
    const q = championSearch.toLowerCase();
    return champs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [championSearch, champs]);

  function handleSummonerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (trimmed.includes("#")) {
      router.push(`/summoner?riotId=${encodeURIComponent(trimmed)}&region=${region}`);
    }
  }

  function handleChampionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (champHighlight >= 0 && champSuggestions[champHighlight]) {
      router.push(`/champion/${champSuggestions[champHighlight].id}`);
      setChampionSearch("");
      setChampOpen(false);
      return;
    }
    const trimmed = championSearch.trim();
    if (trimmed.length >= 1) {
      router.push(`/champion/${encodeURIComponent(trimmed)}`);
      setChampionSearch("");
      setChampOpen(false);
    }
  }

  function selectChamp(id: string) {
    router.push(`/champion/${id}`);
    setChampionSearch("");
    setChampOpen(false);
  }

  function handleChampKeyDown(e: React.KeyboardEvent) {
    if (!champOpen || champSuggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setChampHighlight((h) => Math.min(h + 1, champSuggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setChampHighlight((h) => Math.max(h - 1, -1)); }
    else if (e.key === "Enter" && champHighlight >= 0 && champSuggestions[champHighlight]) {
      e.preventDefault();
      selectChamp(champSuggestions[champHighlight].id);
    }
  }

  return (
    <div className="hero-search">
      {/* Busca de Jogador */}
      <form onSubmit={handleSummonerSubmit} className="hero-search-field">
        <label>🔍 Jogador</label>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <input
            type="text"
            placeholder="Nome#TAG — Ex: KierDock#13116"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              width: "70px", padding: "0.65rem 0.3rem", borderRadius: "6px",
              border: "1px solid var(--border)", background: "var(--panel)",
              color: "var(--text)", fontSize: "0.75rem", fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {Object.entries(PLATFORMS).map(([v, { label, flag }]) => (
              <option key={v} value={v}>
                {flag === "br" ? "🇧🇷" : flag === "us" ? "🇺🇸" : flag === "kr" ? "🇰🇷" : ""} {v.toUpperCase().replace(/[0-9]/g, "")}
              </option>
            ))}
          </select>
        </div>
      </form>

      {/* Busca de Campeão */}
      <form onSubmit={handleChampionSubmit} className="hero-search-field" style={{ position: "relative" }}>
        <label>⚔️ Campeão</label>
        <input
          type="text"
          placeholder="Nome do campeão — Ex: Jayce, Ahri, Yasuo..."
          value={championSearch}
          onChange={(e) => { setChampionSearch(e.target.value); setChampHighlight(-1); if (!champOpen) setChampOpen(true); }}
          onFocus={() => setChampOpen(true)}
          onBlur={() => setTimeout(() => setChampOpen(false), 150)}
          onKeyDown={handleChampKeyDown}
          autoComplete="off"
        />
        {champOpen && champSuggestions.length > 0 && (
          <div className="search-suggestions" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20 }}>
            {champSuggestions.map((c, i) => (
              <button
                key={c.id}
                className={`search-suggestion ${i === champHighlight ? "highlight" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); selectChamp(c.id); }}
                onMouseEnter={() => setChampHighlight(i)}
              >
                <img src={c.image} alt={c.name} width={28} height={28} style={{ borderRadius: "50%" }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
