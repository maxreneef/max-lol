"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type TierEntry = {
  id: string;
  name: string;
  tags: string[];
  role: string;
  icon: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
};

const TIER_COLORS: Record<string, string> = {
  S: "#c89b3c",
  A: "#51cf66",
  B: "#0ac8b9",
  C: "#adb5bd",
  D: "#ff6b6b",
};

const ROLES = ["Todos", "Top", "Jungle", "Mid", "ADC", "Support"];
const TIERS = ["Todos", "S", "A", "B", "C", "D"];

export function TierListClient({ entries }: { entries: TierEntry[] }) {
  const [role, setRole] = useState("Todos");
  const [tierFilter, setTierFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"tier" | "winRate" | "pickRate" | "banRate">("tier");

  const filtered = useMemo(() => {
    let result = entries;
    if (role !== "Todos") result = result.filter((e) => e.role === role);
    if (tierFilter !== "Todos") result = result.filter((e) => e.tier === tierFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (sort !== "tier") {
      result = [...result].sort((a, b) => b[sort] - a[sort]);
    }
    return result;
  }, [entries, role, tierFilter, search, sort]);

  const grouped = useMemo(() => {
    if (sort !== "tier") return null;
    const g: Record<string, TierEntry[]> = { S: [], A: [], B: [], C: [], D: [] };
    filtered.forEach((e) => {
      if (g[e.tier]) g[e.tier].push(e);
    });
    return g;
  }, [filtered, sort]);

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Tier List</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Ranking de campeões por win rate — Patch 15.11 · BR1 (dados representativos)
      </p>

      {/* Filtros */}
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
            <button
              key={r}
              className={`tl-pill ${role === r ? "active" : ""}`}
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="tl-pills">
          {TIERS.map((t) => (
            <button
              key={t}
              className={`tl-pill ${tierFilter === t ? "active" : ""}`}
              onClick={() => setTierFilter(t)}
              style={
                t !== "Todos"
                  ? { color: TIER_COLORS[t], borderColor: TIER_COLORS[t] + "55" }
                  : {}
              }
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="tl-sort"
        >
          <option value="tier">Tier</option>
          <option value="winRate">Win Rate</option>
          <option value="pickRate">Pick Rate</option>
          <option value="banRate">Ban Rate</option>
        </select>
      </div>

      {/* Vista agrupada por tier */}
      {grouped ? (
        <div className="tl-groups">
          {(["S", "A", "B", "C", "D"] as const).map((t) => {
            const champs = grouped[t];
            if (!champs?.length) return null;
            return (
              <div key={t} className="tl-group">
                <div
                  className="tl-tier-label"
                  style={{ color: TIER_COLORS[t] }}
                >
                  {t}
                </div>
                <div className="tl-row">
                  {champs.map((c) => (
                    <ChampCard key={c.id} c={c} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista em tabela (quando ordenado por stat) */
        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Campeão</th>
                <th>Tier</th>
                <th>Win Rate</th>
                <th>Pick Rate</th>
                <th>Ban Rate</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td>
                    <Link href={`/champion/${c.id}`} className="tl-champ-link">
                      <img
                        src={c.icon}
                        alt={c.name}
                        width={32}
                        height={32}
                        className="tl-champ-sm"
                      />
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    <span
                      className="tl-tier-badge"
                      style={{
                        color: TIER_COLORS[c.tier],
                        background: TIER_COLORS[c.tier] + "22",
                      }}
                    >
                      {c.tier}
                    </span>
                  </td>
                  <td className={c.winRate >= 52 ? "stat-good" : c.winRate < 48 ? "stat-bad" : ""}>
                    {c.winRate}%
                  </td>
                  <td>{c.pickRate}%</td>
                  <td>{c.banRate}%</td>
                  <td style={{ color: "var(--muted)" }}>{c.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <p style={{ color: "var(--muted)", marginTop: "2rem" }}>
          Nenhum campeão encontrado.
        </p>
      )}

      <p className="disclaimer" style={{ marginTop: "2rem" }}>
        Dados representativos gerados para demonstração do produto. Win rate,
        pick rate e ban rate reais serão calculados a partir de partidas
        coletadas após aprovação da Production API Key.
      </p>
    </main>
  );
}

function ChampCard({ c }: { c: TierEntry }) {
  return (
    <Link href={`/champion/${c.id}`} className="tl-card" title={c.name}>
      <img src={c.icon} alt={c.name} width={52} height={52} className="tl-card-icon" />
      <p className="tl-card-name">{c.name}</p>
      <p className="tl-card-wr">{c.winRate}%</p>
    </Link>
  );
}
