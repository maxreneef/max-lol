"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/types";

export function HomeSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("br1");
  const [championSearch, setChampionSearch] = useState("");
  const router = useRouter();

  function handleSummonerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (trimmed.includes("#")) {
      router.push(`/summoner?riotId=${encodeURIComponent(trimmed)}&region=${region}`);
    }
  }

  function handleChampionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = championSearch.trim();
    if (trimmed.length >= 1) {
      router.push(`/champion/${encodeURIComponent(trimmed)}`);
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
              width: "70px",
              padding: "0.65rem 0.3rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
              fontSize: "0.75rem",
              fontFamily: "inherit",
              cursor: "pointer",
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
      <form onSubmit={handleChampionSubmit} className="hero-search-field">
        <label>⚔️ Campeão</label>
        <input
          type="text"
          placeholder="Nome do campeão — Ex: Jayce, Ahri, Yasuo..."
          value={championSearch}
          onChange={(e) => setChampionSearch(e.target.value)}
          autoComplete="off"
        />
      </form>
    </div>
  );
}
