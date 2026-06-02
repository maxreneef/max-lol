"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Entry {
  id: string; name: string; title: string;
  tags: string[]; role: string; icon: string;
  tier: string; winRate: number; pickRate: number;
}

const ROLES  = ["Todos", "Top", "Jungle", "Mid", "ADC", "Support"];
const TAGS   = ["Todos", "Fighter", "Tank", "Mage", "Assassin", "Marksman", "Support"];
const TIERS  = ["Todos", "S", "A", "B", "C", "D"];
const TIER_COLORS: Record<string, string> = {
  S: "#c89b3c", A: "#51cf66", B: "#0ac8b9", C: "#adb5bd", D: "#ff6b6b",
};

export function ChampionsGrid({ entries }: { entries: Entry[] }) {
  const [search, setSearch] = useState("");
  const [role, setRole]     = useState("Todos");
  const [tag, setTag]       = useState("Todos");
  const [tier, setTier]     = useState("Todos");
  const [sort, setSort]     = useState<"name" | "winRate" | "pickRate">("name");

  const filtered = useMemo(() => {
    let r = entries;
    if (role !== "Todos") r = r.filter((e) => e.role === role);
    if (tag  !== "Todos") r = r.filter((e) => e.tags.includes(tag));
    if (tier !== "Todos") r = r.filter((e) => e.tier === tier);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((e) => e.name.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      if (sort === "winRate")  return b.winRate  - a.winRate;
      if (sort === "pickRate") return b.pickRate - a.pickRate;
      return a.name.localeCompare(b.name);
    });
  }, [entries, role, tag, tier, search, sort]);

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Campeões</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {entries.length} campeões — Patch 15.11
      </p>

      <div className="tl-filters">
        <input
          type="text"
          placeholder="Buscar campeão..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tl-search"
        />
        <div className="tl-pills">
          {ROLES.map((r) => (
            <button key={r} className={`tl-pill ${role === r ? "active" : ""}`} onClick={() => setRole(r)}>{r}</button>
          ))}
        </div>
        <div className="tl-pills">
          {TIERS.map((t) => (
            <button
              key={t}
              className={`tl-pill ${tier === t ? "active" : ""}`}
              onClick={() => setTier(t)}
              style={t !== "Todos" ? { color: TIER_COLORS[t], borderColor: TIER_COLORS[t] + "55" } : {}}
            >{t}</button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="tl-sort">
          <option value="name">Nome</option>
          <option value="winRate">Win Rate</option>
          <option value="pickRate">Pick Rate</option>
        </select>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {filtered.length} campeões
      </p>

      <div className="champions-grid">
        {filtered.map((c) => (
          <Link key={c.id} href={`/champion/${c.id}`} className="champion-card">
            <div className="champion-card-img-wrap">
              <img src={c.icon} alt={c.name} width={80} height={80} className="champion-card-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span
                className="champion-card-tier"
                style={{ color: TIER_COLORS[c.tier], background: TIER_COLORS[c.tier] + "22" }}
              >{c.tier}</span>
            </div>
            <div className="champion-card-info">
              <p className="champion-card-name">{c.name}</p>
              <p className="champion-card-title">{c.title}</p>
              <div className="champion-card-tags">
                {c.tags.map((t) => <span key={t} className="champ-tag">{t}</span>)}
              </div>
              <div className="champion-card-stats">
                <span className={c.winRate >= 52 ? "stat-good" : c.winRate < 48 ? "stat-bad" : ""}>{c.winRate}% WR</span>
                <span style={{ color: "var(--muted)" }}>{c.pickRate}% Pick</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--muted)", marginTop: "2rem" }}>Nenhum campeão encontrado.</p>
      )}
    </main>
  );
}
