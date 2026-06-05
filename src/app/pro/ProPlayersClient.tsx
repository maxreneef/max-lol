"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RegionFilter } from "@/components/RegionFilter";
import { useRegionFilter } from "@/lib/regionFilter";
import {
  getProPlayers,
  getProPlayersByRole,
  searchProPlayers,
  ROLES,
} from "@/lib/mockProData";

export function ProPlayersClient() {
  const { selected: regions } = useRegionFilter();
  const [role, setRole] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"winRate" | "kda" | "games">("winRate");

  const players = useMemo(() => {
    let list = getProPlayers();
    // Filtrar por regiões selecionadas (se não for "todas")
    const isAll = regions.length >= 16;
    if (!isAll) {
      list = list.filter((p) => regions.includes(p.platform));
    }
    list = getProPlayersByRole(list, role);
    list = searchProPlayers(list, search);
    list = [...list].sort((a, b) => b[sortKey] - a[sortKey]);
    return list;
  }, [regions, role, search, sortKey]);

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>
        👑 Pro Players
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
        Jogadores profissionais de todos os servidores — CBLOL, LCK, LPL, LEC, LCS e mais.
      </p>

      {/* Filtros */}
      <RegionFilter showLabel />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.75rem 0" }}>
        <input
          type="text"
          placeholder="Buscar por nome, time ou campeão..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.45rem 0.75rem", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--panel)", color: "var(--text)", fontSize: "0.82rem",
            fontFamily: "inherit", flex: "1 1 200px", minWidth: 200, outline: "none",
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: "0.45rem 0.6rem", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--panel)", color: "var(--text)", fontSize: "0.82rem",
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Jogador</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Região</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Campeões Favoritos</th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => setSortKey("winRate")}>
                WR {sortKey === "winRate" ? "▼" : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => setSortKey("kda")}>
                KDA {sortKey === "kda" ? "▼" : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => setSortKey("games")}>
                Partidas {sortKey === "games" ? "▼" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const WR_COLOR = p.winRate >= 60 ? "#1a9e6e" : p.winRate >= 53 ? "#c8aa6e" : "#e06c3b";
              const REGION_FLAG: Record<string, string> = {
                "br1": "🇧🇷", "kr": "🇰🇷", "euw1": "🇪🇺", "na1": "🇺🇸", "vn2": "🇻🇳",
              };
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <Link
                      href={`/summoner/${encodeURIComponent(p.name + "#BR1")}`}
                      style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{p.teamShort}</td>
                  <td style={tdStyle}>
                    {REGION_FLAG[p.platform] ?? "🌐"} {p.region}
                  </td>
                  <td style={tdStyle}>{p.role}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.mostPlayed.slice(0, 3).map((c) => (
                        <Link
                          key={c.champId}
                          href={`/champion/${c.champId}`}
                          style={{
                            fontSize: "0.7rem", background: "var(--panel)", padding: "1px 6px",
                            borderRadius: 4, color: "var(--muted)", textDecoration: "none",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {c.champId}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: WR_COLOR, fontWeight: 700 }}>
                    {p.winRate}%
                  </td>
                  <td style={tdStyle}>{p.kda.toFixed(1)}</td>
                  <td style={tdStyle}>{p.games}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.7rem", marginTop: "0.75rem", textAlign: "center" }}>
        {players.length} jogadores encontrados · Dados de demonstração
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.5rem",
  fontWeight: 700,
  fontSize: "0.72rem",
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.55rem 0.5rem",
  verticalAlign: "middle",
};
