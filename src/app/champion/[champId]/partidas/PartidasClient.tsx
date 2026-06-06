"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLATFORMS } from "@/lib/types";

const DD_IMG  = "https://ddragon.leagueoflegends.com/cdn/15.11.1/img";
const DD_RUNE = "https://ddragon.leagueoflegends.com/cdn/img";

const LANES       = ["Todas", "Top", "Jungle", "Mid", "ADC", "Suporte"] as const;
const PAGE_SIZE   = 20;   // quantas partidas mostrar inicialmente
const LOAD_MORE   = 10;   // incremento do "Ver mais"
const FETCH_COUNT = 30;   // quantas partidas buscar na API

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface MatchData {
  matchId:          string;
  summonerName:     string;
  tagLine:          string;
  tier:             string;
  rank:             string;
  lp:               number;
  platform:         string;
  win:              boolean;
  kills:            number;
  deaths:           number;
  assists:          number;
  kda:              string;
  items:            string[];
  runes:            {
    primaryStyle?:  number;
    subStyle?:      number;
    primaryRuneId?: number;
    runeSelections?: number[];
    subSelections?:  number[];
  };
  summonerSpells:   string[];
  skillOrder:       string;
  gameDuration:     string;
  gameCreation:     number;
  cs:               number;
  csPerMin:         number;
  killParticipation: number;
  lane:             string;
}

// ── Helpers visuais ────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  CHALLENGER:  "#0ac8b9",
  GRANDMASTER: "#e84057",
  MASTER:      "#9faafc",
  DIAMOND:     "#a2c3e8",
};

const FLAG: Record<string, string> = {
  br1:   "🇧🇷", kr: "🇰🇷",  euw1: "🇪🇺", eune1: "🇪🇺",
  na1:   "🇺🇸", oc1: "🇦🇺", jp1:  "🇯🇵", la1:   "🇲🇽",
  la2:   "🇦🇷", tr1: "🇹🇷",  ru:   "🇷🇺",
};

function ItemSlot({ id, size = 22 }: { id: string; size?: number }) {
  if (id === "0" || !id) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 3,
        background: "var(--panel)", border: "1px solid var(--border)",
        flexShrink: 0,
      }} />
    );
  }
  return (
    <img
      src={`${DD_IMG}/item/${id}.png`}
      alt=""
      width={size}
      height={size}
      className="item-icon"
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.15"; }}
    />
  );
}

function RuneThumb({ runeId, map }: {
  runeId: number;
  map: Map<number, { name: string; icon: string }>;
}) {
  const info = map.get(runeId);
  if (!info) return <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>—</span>;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <img src={`${DD_RUNE}/${info.icon}`} alt="" width={20} height={20}
        style={{ objectFit: "contain" }}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.15"; }} />
      <span style={{ fontSize: "0.63rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
        {info.name}
      </span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 11 }).map((_, i) => (
        <td key={i}>
          <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

function WinRateColor(wr: number) {
  return wr >= 53 ? "#1a9e6e" : wr < 50 ? "#e84057" : "var(--muted)";
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  champId:       string;
  champName:     string;
  initialRegion: string;
  initialLane:   string;
}

export function PartidasClient({ champId, champName, initialRegion, initialLane }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const region = searchParams.get("region") ?? initialRegion;
  const lane   = searchParams.get("lane")   ?? initialLane;

  const [matches,      setMatches]      = useState<MatchData[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [runeMap,      setRuneMap]      = useState<Map<number, { name: string; icon: string }>>(new Map());

  const apiLane = lane === "" || lane.toLowerCase() === "todas" ? "" : lane.toLowerCase();

  // Busca partidas
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMatches([]);
    setVisibleCount(PAGE_SIZE);

    (async () => {
      try {
        const lp  = apiLane ? `&lane=${encodeURIComponent(apiLane)}` : "";
        const res = await fetch(
          `/api/champion/${champId}/matches?region=${region}${lp}&count=${FETCH_COUNT}`
        );
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        if (!cancelled) setMatches(data.matches ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [champId, region, apiLane]);

  // Mapa de runas DDragon
  useEffect(() => {
    let cancelled = false;
    fetch("https://ddragon.leagueoflegends.com/cdn/15.11.1/data/pt_BR/runesReforged.json")
      .then((r) => r.json())
      .then((trees: Array<{
        key: string;
        slots: Array<{ runes: Array<{ id: number; key: string; name: string }> }>;
      }>) => {
        if (cancelled) return;
        const m = new Map<number, { name: string; icon: string }>();
        for (const tree of trees) {
          for (const slot of tree.slots) {
            for (const rune of slot.runes) {
              m.set(rune.id, {
                name: rune.name,
                icon: `perk-images/Styles/${tree.key}/${rune.key}/${rune.key}.png`,
              });
            }
          }
        }
        setRuneMap(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── Handlers de filtro ──────────────────────────────────────────────────────

  function setRegion(r: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("region", r);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function setLane(l: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (l === "" || l.toLowerCase() === "todas") p.delete("lane");
    else p.set("lane", l.toLowerCase());
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  // ── Stats calculadas ────────────────────────────────────────────────────────

  const wins    = useMemo(() => matches.filter((m) => m.win).length, [matches]);
  const winRate = matches.length > 0 ? (wins / matches.length * 100) : 0;
  const avgKDA  = useMemo(() => {
    if (!matches.length) return "—";
    const k = matches.reduce((s, m) => s + m.kills, 0) / matches.length;
    const d = matches.reduce((s, m) => s + m.deaths, 0) / matches.length;
    const a = matches.reduce((s, m) => s + m.assists, 0) / matches.length;
    return d === 0 ? "Perfeito" : ((k + a) / d).toFixed(2);
  }, [matches]);
  const avgCS = useMemo(() => {
    if (!matches.length) return 0;
    return (matches.reduce((s, m) => s + m.csPerMin, 0) / matches.length).toFixed(1);
  }, [matches]);

  const visible   = matches.slice(0, visibleCount);
  const remaining = matches.length - visibleCount;
  const laneLabel = lane === "" || lane.toLowerCase() === "todas" ? "Todas" : lane;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="partidas-page">

      {/* ── Cabeçalho ── */}
      <div className="partidas-header">
        <div className="partidas-header-left">
          <img
            src={`${DD_IMG}/champion/${champId}.png`}
            alt={champName}
            width={52} height={52}
            className="champ-icon-round"
          />
          <div>
            <h1 className="partidas-title">{champName}</h1>
            <p className="muted-sm" style={{ marginTop: 2 }}>
              Partidas reais · últimos 30 dias · Diamond IV → Desafiante
            </p>
          </div>
        </div>
        <Link href={`/champion/${champId}`} className="partidas-back-btn">
          ← Voltar para {champName}
        </Link>
      </div>

      {/* ── Filtros ── */}
      <div className="partidas-filters">
        {/* Servidor */}
        <div className="partidas-filter-group">
          <span className="lane-filter-label">Servidor:</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="partidas-region-select"
          >
            {Object.entries(PLATFORMS).map(([key, val]) => (
              <option key={key} value={key}>
                {key.toUpperCase().replace(/\d/g, "")} — {val.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rota */}
        <div className="lane-filter">
          <span className="lane-filter-label">Rota:</span>
          <div className="tl-pills">
            {LANES.map((l) => (
              <button
                key={l}
                className={`tl-pill ${laneLabel.toLowerCase() === l.toLowerCase() ? "active" : ""}`}
                onClick={() => setLane(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Barra de resumo ── */}
      {!loading && matches.length > 0 && (
        <div className="partidas-summary">
          <div className="partidas-summary-item">
            <span className="partidas-summary-label">Partidas</span>
            <span className="partidas-summary-value">{matches.length}</span>
          </div>
          <div className="partidas-summary-sep" />
          <div className="partidas-summary-item">
            <span className="partidas-summary-label">Vitórias</span>
            <span className="partidas-summary-value" style={{ color: "#1a9e6e" }}>{wins}V / {matches.length - wins}D</span>
          </div>
          <div className="partidas-summary-sep" />
          <div className="partidas-summary-item">
            <span className="partidas-summary-label">Win Rate</span>
            <span className="partidas-summary-value" style={{ color: WinRateColor(winRate) }}>
              {winRate.toFixed(1)}%
            </span>
          </div>
          <div className="partidas-summary-sep" />
          <div className="partidas-summary-item">
            <span className="partidas-summary-label">KDA médio</span>
            <span className="partidas-summary-value">{avgKDA}</span>
          </div>
          <div className="partidas-summary-sep" />
          <div className="partidas-summary-item">
            <span className="partidas-summary-label">CS/min médio</span>
            <span className="partidas-summary-value">{avgCS}</span>
          </div>
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="matches-table-wrap" style={{ marginTop: "1rem" }}>
        <table className="matches-table">
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Elo</th>
              <th>Reg</th>
              <th>Res</th>
              <th>KDA</th>
              <th>CS / min</th>
              <th>P/Kill%</th>
              <th>Itens</th>
              <th>Keystone</th>
              <th>Habilidades</th>
              <th>Duração</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && visible.map((m, i) => {
              const ksId = m.runes?.primaryRuneId ?? 0;
              const dateStr = m.gameCreation
                ? new Date(m.gameCreation).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                : "—";

              return (
                <tr key={i} className={m.win ? "match-row-win" : "match-row-loss"}>
                  {/* Jogador */}
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="match-player-name">{m.summonerName}</span>
                      <span className="match-player-tag">#{m.tagLine}</span>
                    </div>
                  </td>

                  {/* Elo */}
                  <td>
                    <span className="match-tier" style={{ color: TIER_COLOR[m.tier] ?? "var(--accent)" }}>
                      {m.tier.charAt(0) + m.tier.slice(1).toLowerCase()} {m.rank}
                    </span>
                    <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{m.lp} LP</div>
                  </td>

                  {/* Região */}
                  <td style={{ fontSize: "1.1rem" }}>{FLAG[m.platform] ?? "🌐"}</td>

                  {/* Resultado */}
                  <td>
                    <span className={`match-result ${m.win ? "win" : "loss"}`}>
                      {m.win ? "Vitória" : "Derrota"}
                    </span>
                  </td>

                  {/* KDA */}
                  <td>
                    <span className="match-kda" style={{ fontSize: "0.85rem" }}>{m.kda}</span>
                  </td>

                  {/* CS / min */}
                  <td>
                    <span style={{ fontSize: "0.72rem" }}>{m.cs}</span>
                    <span className="muted-sm" style={{ fontSize: "0.65rem", marginLeft: 3 }}>
                      ({m.csPerMin ?? "—"})
                    </span>
                  </td>

                  {/* Kill participation */}
                  <td>
                    {m.killParticipation > 0
                      ? <span style={{
                          fontSize: "0.72rem", padding: "2px 6px",
                          borderRadius: 4, background: "var(--panel)",
                          border: "1px solid var(--border)",
                        }}>{m.killParticipation}%</span>
                      : <span className="muted-sm">—</span>}
                  </td>

                  {/* Itens: 6 slots fixos */}
                  <td>
                    <div style={{ display: "flex", gap: 2, flexWrap: "nowrap" }}>
                      {m.items.slice(0, 6).map((id, j) => (
                        <ItemSlot key={j} id={id} size={22} />
                      ))}
                    </div>
                  </td>

                  {/* Keystone */}
                  <td style={{ minWidth: 120 }}>
                    <RuneThumb runeId={ksId} map={runeMap} />
                  </td>

                  {/* Ordem de habilidades */}
                  <td>
                    <span style={{
                      fontFamily: "monospace", fontSize: "0.6rem",
                      letterSpacing: "0.04em", color: "var(--muted)",
                      display: "block", maxWidth: 130, wordBreak: "break-all",
                    }}>
                      {m.skillOrder || "—"}
                    </span>
                  </td>

                  {/* Duração */}
                  <td className="muted-sm" style={{ whiteSpace: "nowrap" }}>
                    {m.gameDuration}
                  </td>

                  {/* Data */}
                  <td className="muted-sm" style={{ whiteSpace: "nowrap", fontSize: "0.65rem" }}>
                    {dateStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Ver mais ── */}
      {!loading && remaining > 0 && (
        <div className="partidas-load-more">
          <button
            className="ver-mais-btn"
            onClick={() => setVisibleCount((n) => n + LOAD_MORE)}
          >
            Ver mais <span className="ver-mais-count">+{Math.min(remaining, LOAD_MORE)}</span>
            <span className="ver-mais-total">({remaining} restantes)</span>
          </button>
        </div>
      )}

      {/* ── Fim da lista ── */}
      {!loading && matches.length > 0 && remaining <= 0 && (
        <p className="muted-sm" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          ✅ Todas as {matches.length} partidas exibidas
        </p>
      )}

      {/* ── Vazio ── */}
      {!loading && !error && matches.length === 0 && (
        <div className="partidas-empty">
          <div style={{ fontSize: "2.5rem" }}>🔍</div>
          <p>Nenhuma partida de <strong>{champName}</strong> encontrada nos últimos 30 dias.</p>
          <p className="muted-sm">Tente outra região ou remova o filtro de rota.</p>
          <Link href={`/champion/${champId}`} className="partidas-back-btn" style={{ marginTop: "1rem" }}>
            ← Voltar
          </Link>
        </div>
      )}

      {/* ── Erro ── */}
      {error && (
        <div className="partidas-empty" style={{ color: "#e84057" }}>
          ⚠️ {error}
        </div>
      )}

    </div>
  );
}
