"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DDChampion, DDChampionFull } from "@/lib/ddragon";
import { AdBanner } from "@/components/AdUnit";
import { DataSourceToggle } from "@/components/DataSourceToggle";
import { RegionFilter } from "@/components/RegionFilter";
import type {
  ChampionBuildData,
  ItemSet,
  MatchupEntry,
  CounterHeadToHead,
  MatchEntry,
} from "@/lib/mockChampData";
import { SUMMONER_SPELL_IDS, RUNE_STYLE_IDS, BOOTS_IDS } from "@/lib/riotIds";
import type { AggregatedBuildData } from "@/lib/buildAggregator";
import { PLATFORMS } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const DD_IMG = "https://ddragon.leagueoflegends.com/cdn/15.11.1/img";
const DD_RUNE = "https://ddragon.leagueoflegends.com/cdn/img";

const SPELL_ID: Record<string, string> = {
  Flash: "SummonerFlash", Ignite: "SummonerDot", Teleporte: "SummonerTeleport",
  Barreira: "SummonerBarrier", Exaustar: "SummonerExhaust", Fantasma: "SummonerHaste",
  Curar: "SummonerHeal", Clarividência: "SummonerReveal",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  "Fácil": "#1a9e6e", "Médio": "#c8aa6e", "Difícil": "#e06c3b", "Muito Difícil": "#e84057",
};

const TIER_COLOR: Record<string, string> = {
  "S+": "#0ac8b9", S: "#0ac8b9", A: "#1a9e6e", B: "#c8aa6e", C: "#e06c3b", D: "#e84057",
};

const TABS = ["Build", "Counters", "One Tricks", "Pro Builds", "Guia"] as const;
const LANES = ["Todas", "Top", "Jungle", "Mid", "ADC", "Suporte"] as const;
type Tab = typeof TABS[number];

const ABILITY_COLORS: Record<string, string> = { Q: "#0ac8b9", W: "#c8aa6e", E: "#9faafc", R: "#e84057" };

// ── Helper components ──────────────────────────────────────────────────────────

function wrColor(wr: number): string {
  return wr >= 53 ? "#1a9e6e" : wr < 50 ? "#e84057" : "var(--muted)";
}

function ItemIcon({ id, size = 36 }: { id: string; size?: number }) {
  return (
    <img
      src={`${DD_IMG}/item/${id}.png`}
      alt={id}
      width={size}
      height={size}
      className="item-icon"
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
    />
  );
}

function ChampIcon({ champId, size = 32 }: { champId: string; size?: number }) {
  return (
    <img
      src={`${DD_IMG}/champion/${champId}.png`}
      alt={champId}
      width={size}
      height={size}
      className="champ-icon-round"
      onError={(e) => { (e.target as HTMLImageElement).src = `${DD_IMG}/champion/Aatrox.png`; }}
    />
  );
}

function SpellIcon({ spell, size = 36 }: { spell: string; size?: number }) {
  const id = SPELL_ID[spell] ?? `Summoner${spell}`;
  return (
    <img
      src={`${DD_IMG}/spell/${id}.png`}
      alt={spell}
      width={size}
      height={size}
      className="item-icon"
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
    />
  );
}

function RuneIcon({ path, size = 32 }: { path: string; size?: number }) {
  return (
    <img
      src={`${DD_RUNE}/${path}`}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
    />
  );
}

function WRBadge({ wr }: { wr: number }) {
  return <span style={{ color: wrColor(wr), fontWeight: 700 }}>{wr.toFixed(1)}%</span>;
}

function Skeleton({ h = 24, w = "100%" }: { h?: number; w?: string | number }) {
  return <div className="skeleton" style={{ height: h, width: w }} />;
}

// ── Champion Header ────────────────────────────────────────────────────────────

function ChampionHeader({
  champ, detail, buildData, ddBase, splashUrl,
}: {
  champ: DDChampion; detail: DDChampionFull | null; buildData: ChampionBuildData;
  ddBase: string; splashUrl: string;
}) {
  const { tier, winRate, pickRate, banRate, winRateDelta, pickRateDelta, difficulty, patch } = buildData;
  return (
    <div className="champ-hero" style={{ backgroundImage: `url(${splashUrl})` }}>
      <div className="champ-hero-overlay" />
      <div className="champ-hero-content">
        <div className="champ-hero-left">
          <img src={`${ddBase}/img/champion/${champ.id}.png`} alt={champ.name} className="champ-hero-icon" />
          <div className="champ-hero-info">
            <div className="champ-hero-top">
              <span className="tier-badge" style={{ background: TIER_COLOR[tier], color: "#000" }}>{tier}</span>
              <span className="champ-difficulty-badge" style={{ background: DIFFICULTY_COLOR[difficulty] + "22", color: DIFFICULTY_COLOR[difficulty], border: `1px solid ${DIFFICULTY_COLOR[difficulty]}44` }}>{difficulty}</span>
              <span className="champ-patch-badge">Patch {patch}</span>
            </div>
            <h1 className="champ-hero-name">{champ.name}</h1>
            <p className="champ-hero-title">{champ.title}</p>
            <div className="champ-hero-tags">{champ.tags.map((t) => <span key={t} className="tag-badge">{t}</span>)}</div>
          </div>
        </div>
        <div className="champ-hero-stats">
          <div className="champ-stat-block">
            <div className="champ-stat-label">Win Rate</div>
            <div className="champ-stat-value" style={{ color: wrColor(winRate) }}>{winRate.toFixed(1)}%</div>
            <div className={`champ-stat-delta ${winRateDelta >= 0 ? "up" : "down"}`}>
              {winRateDelta >= 0 ? "↑" : "↓"} {Math.abs(winRateDelta)}% vs {buildData.prevPatch}
            </div>
          </div>
          <div className="champ-stat-block">
            <div className="champ-stat-label">Pick Rate</div>
            <div className="champ-stat-value">{pickRate.toFixed(1)}%</div>
            <div className={`champ-stat-delta ${pickRateDelta >= 0 ? "up" : "down"}`}>{pickRateDelta >= 0 ? "↑" : "↓"} {Math.abs(pickRateDelta)}%</div>
          </div>
          <div className="champ-stat-block">
            <div className="champ-stat-label">Ban Rate</div>
            <div className="champ-stat-value" style={{ color: banRate > 15 ? "#e84057" : "inherit" }}>{banRate.toFixed(1)}%</div>
            <div className="champ-stat-delta neutral">{buildData.totalGames.toLocaleString()} partidas</div>
          </div>
          <div className="champ-stat-block">
            <div className="champ-stat-label">Rota</div>
            <div className="champ-stat-value" style={{ fontSize: "1rem" }}>{buildData.primaryRole}</div>
            <div className="champ-stat-delta neutral">{buildData.primaryRoleShare}% das partidas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Item helpers ────────────────────────────────────────────────────────────────

function ItemSetList({ sets, showArrows, compact }: { sets: ItemSet[]; showArrows?: boolean; compact?: boolean }) {
  const topWR = Math.max(...sets.map((s) => s.winRate));
  return (
    <div className="item-set-list">
      {sets.map((set, i) => (
        <div key={i} className={`item-set-row ${set.winRate === topWR && set.winRate >= 53 ? "highlight-wr" : ""}`}>
          <div className="item-set-icons">
            {set.items.map((id, j) => (
              <span key={j}>
                {showArrows && j > 0 && <span className="item-arrow">›</span>}
                <ItemIcon id={id} size={compact ? 30 : 36} />
              </span>
            ))}
          </div>
          <div className="item-set-meta">
            <span className="pick-rate-badge">{set.pickRate}%</span>
            <WRBadge wr={set.winRate} />
            <span className="muted-sm">{set.sampleSize.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lane Filter ──────────────────────────────────────────────────────────────────

function LaneFilter({ lane, onChange }: { lane: string; onChange: (l: string) => void }) {
  return (
    <div className="lane-filter">
      <span className="lane-filter-label">Rota:</span>
      <div className="tl-pills">
        {LANES.map((l) => (
          <button key={l} className={`tl-pill ${lane === l ? "active" : ""}`} onClick={() => onChange(l)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD TAB — Hierarquia: Runas (árvore) > Skills (18 níveis) > Itens (fluxo)
// ═══════════════════════════════════════════════════════════════════════════════

/** Resolve runas: dados reais (IDs numéricos) ou mock (strings) → exibição */
function formatRunes(
  runes: Record<string, unknown>,
  runeMap: Map<number, { name: string; icon: string }>,
  isRealData: boolean,
): React.ReactNode {
  const r = runes as Record<string, unknown>;
  const hasNum = typeof r.primaryStyle === "number" || typeof r.subStyle === "number";
  if (hasNum && isRealData) {
    const pId = (r.primaryStyle as number) || Number(r.primary) || 0;
    const sId = (r.subStyle as number) || Number(r.secondary) || 0;
    const ksId = (r.primaryRuneId as number) || Number(r.keystone) || 0;
    const ks = runeMap.get(ksId);
    const pName = RUNE_STYLE_IDS[pId]?.name ?? "—";
    const sName = RUNE_STYLE_IDS[sId]?.name ?? "—";
    return <><span className="match-keystone">{ks?.name ?? `Runa #${ksId}`}</span><span className="match-trees">{pName}/{sName}</span></>;
  }
  return <><span className="match-keystone">{String(r.keystone ?? "")}</span><span className="match-trees">{String(r.primary ?? "")}/{String(r.secondary ?? "")}</span></>;
}

function BuildTab({ buildData, detail, ddBase, region, lane }: {
  buildData: ChampionBuildData; detail: DDChampionFull | null; ddBase: string;
  region: string; lane: string;
}) {
  const { summonerSpells, skillOrders, startingItems, boots, coreBuilds, fourthItems, fifthItems, sixthItems, matchHistory: mockHistory } = buildData;
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [selectedCore, setSelectedCore] = useState(0);
  const [enemyFilter, setEnemyFilter] = useState("");
  const [realMatches, setRealMatches] = useState<MatchEntry[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [realBuildData, setRealBuildData] = useState<AggregatedBuildData | null>(null);
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [runeMap, setRuneMap] = useState<Map<number, { name: string; icon: string }>>(new Map());

  // Monta query params para a API (região real + filtro de rota)
  const apiLane = lane.toLowerCase() === "todas" ? "" : lane.toLowerCase();

  // Busca partidas REAIS da Riot API
  useEffect(() => {
    let cancelled = false;
    async function fetchReal() {
      setLoadingMatches(true);
      try {
        const laneParam = apiLane ? `&lane=${encodeURIComponent(apiLane)}` : "";
        const res = await fetch(
          `/api/champion/${buildData.champId}/matches?region=${region}${laneParam}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.matches?.length > 0) {
          setRealMatches(data.matches.map((m: Record<string, unknown>) => ({
            matchId: m.matchId as string,
            summonerName: m.summonerName as string,
            tagLine: (m.tagLine as string) || "",
            region: (m.region as string) || "BR",
            platform: (m.platform as string) || "br1",
            tier: (m.tier as string) || "",
            rank: (m.rank as string) || "",
            championId: m.championId as string,
            win: m.win as boolean,
            kills: m.kills as number,
            deaths: m.deaths as number,
            assists: m.assists as number,
            kda: m.kda as string,
            items: (m.items as string[]) || [],
            runes: m.runes as { primary: string; secondary: string; keystone: string },
            summonerSpells: (m.summonerSpells as [string, string]) || ["",""],
            skillOrder: (m.skillOrder as string) || "",
            gameDuration: m.gameDuration as string,
            gameCreation: m.gameCreation as number,
            queueId: m.queueId as number,
            csPerMin: (m.csPerMin as number) ?? 0,
            killParticipation: (m.killParticipation as number) ?? 0,
            cs: (m.cs as number) ?? 0,
          } as MatchEntry & { csPerMin?: number; killParticipation?: number; cs?: number })));
        }
      } catch { /* fallback para mock */ }
      finally { if (!cancelled) setLoadingMatches(false); }
    }
    fetchReal();
    return () => { cancelled = true; };
  }, [buildData.champId, region, apiLane]);

  // Busca dados AGREGADOS de build (runas, itens, feitiços com WR real)
  useEffect(() => {
    let cancelled = false;
    async function fetchBuild() {
      setLoadingBuild(true);
      try {
        const laneParam = apiLane ? `&lane=${encodeURIComponent(apiLane)}` : "";
        const res = await fetch(
          `/api/champion/${buildData.champId}/build?region=${region}${laneParam}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.hasRealData) {
          setRealBuildData(data as AggregatedBuildData);
        }
      } catch { /* fallback para mock */ }
      finally { if (!cancelled) setLoadingBuild(false); }
    }
    fetchBuild();
    return () => { cancelled = true; };
  }, [buildData.champId, region, apiLane]);

  // Busca dados de runas do Data Dragon (cache no client via state)
  useEffect(() => {
    let cancelled = false;
    fetch("https://ddragon.leagueoflegends.com/cdn/15.11.1/data/pt_BR/runesReforged.json")
      .then((r) => r.json())
      .then((trees) => {
        if (cancelled) return;
        const map = new Map<number, { name: string; icon: string }>();
        for (const tree of trees) {
          for (const slot of tree.slots) {
            for (const rune of slot.runes) {
              map.set(rune.id, {
                name: rune.name,
                icon: `perk-images/Styles/${tree.key}/${rune.key}/${rune.key}.png`,
              });
            }
          }
        }
        setRuneMap(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Usa partidas reais se disponíveis, senão mock
  const matchHistory = realMatches ?? mockHistory ?? [];
  const isRealData = realMatches !== null && realMatches.length > 0;
  const isBuildReal = realBuildData !== null && realBuildData.hasRealData;

  const wins = matchHistory.filter((m) => m.win).length;
  const total = matchHistory.length;

  // ── Converte dados reais de build para formato compatível com UI ──

  // Feitiços convertidos (ID → nome/ícone DDragon)
  const realSpells = useMemo(() => {
    if (!realBuildData) return null;
    return realBuildData.summonerSpells.map((s) => {
      const s1 = SUMMONER_SPELL_IDS[s.spell1Id] ?? { name: String(s.spell1Id), icon: `Summoner${s.spell1Id}` };
      const s2 = SUMMONER_SPELL_IDS[s.spell2Id] ?? { name: String(s.spell2Id), icon: `Summoner${s.spell2Id}` };
      return { ...s, spell1Name: s1.name, spell1Icon: s1.icon, spell2Name: s2.name, spell2Icon: s2.icon };
    });
  }, [realBuildData]);

  // Itens core convertidos (number[] → string[])
  const realCoreItems = useMemo(() => {
    if (!realBuildData) return null;
    return realBuildData.coreItems.map((ci) => ({
      ...ci,
      strItems: ci.items.map(String),
    }));
  }, [realBuildData]);

  // Itens iniciais convertidos
  const realStartingItems = useMemo(() => {
    if (!realBuildData) return null;
    return realBuildData.startingItems.map((si) => ({
      ...si,
      strItems: si.items.map(String),
    }));
  }, [realBuildData]);

  // Botas convertidas
  const realBoots = useMemo(() => {
    if (!realBuildData) return null;
    return realBuildData.boots.map((b) => ({
      ...b,
      strId: String(b.itemId),
    }));
  }, [realBuildData]);

  // Filtra partidas
  const filteredMatches = useMemo(() => {
    return matchHistory.filter((m) => {
      if (enemyFilter && !m.kda.includes(enemyFilter)) return false;
      return true;
    });
  }, [matchHistory, enemyFilter]);

  return (
    <div className="tab-content">

      {/* ═══ 1. FEITIÇOS (pequeno, minimalista) ═══ */}
      <div className="build-spells-mini">
        <span className="build-label-mini">Feitiços</span>
        <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
          {realSpells ? (
            realSpells.map((s, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
                <img src={`${DD_IMG}/spell/${s.spell1Icon}.png`} alt={s.spell1Name} width={24} height={24} className="item-icon" />
                <img src={`${DD_IMG}/spell/${s.spell2Icon}.png`} alt={s.spell2Name} width={24} height={24} className="item-icon" />
                <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>{s.pickRate}%</span>
                <WRBadge wr={s.winRate} />
              </div>
            ))
          ) : (
            summonerSpells.slice(0, 2).map((set, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
                {set.spells.map((sp) => <SpellIcon key={sp} spell={sp} size={24} />)}
                <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>{set.pickRate}%</span>
                <WRBadge wr={set.winRate} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ 2. RUNAS — árvore visual completa ═══ */}
      <section className="build-section">
        <h3 className="build-section-title">Runas</h3>
        {realBuildData ? (
          /* ── Runas REAIS (agregadas de partidas) ── */
          realBuildData.primaryStyles.slice(0, 2).map((primary, idx) => {
            const pStyle = RUNE_STYLE_IDS[primary.styleId] ?? { name: `Estilo ${primary.styleId}`, color: "#888" };
            const subStyleId = realBuildData.subStyles[idx]?.styleId ?? 0;
            const subStyle = RUNE_STYLE_IDS[subStyleId] ?? { name: `Estilo ${subStyleId}`, color: "#888" };
            const keystone = realBuildData.keystones.find((k) => {
              // Associa keystone à árvore primária (simplificado: pega o mais popular)
              return true;
            });
            const topKeystones = realBuildData.keystones
              .filter((k) => runeMap.has(k.runeId))
              .slice(0, 1);
            const keystoneRune = topKeystones[0];
            const keystoneInfo = keystoneRune ? runeMap.get(keystoneRune.runeId) : null;

            return (
              <div key={idx} className="rune-tree-full">
                <div className="rune-tree-full-header">
                  <span style={{color: pStyle.color, fontWeight: 700}}>{pStyle.name}</span>
                  <span style={{color: "var(--muted)", fontSize: "0.65rem"}}>+ {subStyle.name}</span>
                  <span style={{marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center"}}>
                    <span className="pick-rate-badge">{primary.pickRate}%</span>
                    <WRBadge wr={primary.winRate} />
                  </span>
                </div>
                <div className="rune-tree-visual">
                  <div className="rune-tree-col">
                    <div className="rune-tree-col-label" style={{color: pStyle.color}}>Primária</div>
                    {keystoneInfo && keystoneRune && (
                      <div className="rune-keystone-big">
                        <RuneIcon path={keystoneInfo.icon} size={48} />
                        <div className="rune-keystone-info">
                          <span className="rune-keystone-name">{keystoneInfo.name}</span>
                          <span style={{fontSize: "0.62rem", color: "var(--muted)"}}>{keystoneRune.pickRate}%</span>
                        </div>
                      </div>
                    )}
                    {!keystoneInfo && (
                      <div className="rune-keystone-big" style={{opacity: 0.5, padding: "0.5rem", fontSize: "0.72rem", color: "var(--muted)"}}>
                        Keystone ID: {realBuildData.keystones[0]?.runeId ?? "—"}
                      </div>
                    )}
                    {/* Slots 1-3 da árvore primária (dados reais agregados) */}
                    <div className="rune-slots-row" style={{marginTop: "0.3rem"}}>
                      {(realBuildData.primarySlots ?? []).map((slotOpts, si) => {
                        const topRune = slotOpts[0];
                        if (!topRune) return null;
                        const ri = runeMap.get(topRune.runeId);
                        return ri ? (
                          <div key={si} className="rune-slot-mini">
                            <RuneIcon path={ri.icon} size={28} />
                            <span className="rune-slot-mini-name">{ri.name}</span>
                            <span style={{fontSize: "0.6rem", color: "var(--muted)"}}>{topRune.pickRate}%</span>
                          </div>
                        ) : (
                          <div key={si} className="rune-slot-mini" style={{opacity:0.4}}>
                            <span style={{fontSize:"0.6rem"}}>#{topRune.runeId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rune-tree-col rune-tree-col-sec">
                    <div className="rune-tree-col-label">Secundária</div>
                    <div className="rune-slots-sec">
                      {(realBuildData.subSlots ?? []).map((slotOpts, si) => {
                        const topRune = slotOpts[0];
                        if (!topRune) return null;
                        const ri = runeMap.get(topRune.runeId);
                        return ri ? (
                          <div key={si} className="rune-slot-mini">
                            <RuneIcon path={ri.icon} size={28} />
                            <span className="rune-slot-mini-name">{ri.name}</span>
                            <span style={{fontSize: "0.6rem", color: "var(--muted)"}}>{topRune.pickRate}%</span>
                          </div>
                        ) : (
                          <div key={si} className="rune-slot-mini" style={{opacity:0.4}}>
                            <span style={{fontSize:"0.6rem"}}>#{topRune.runeId}</span>
                          </div>
                        );
                      })}
                      {(realBuildData.subSlots ?? []).every(s => s.length === 0) && (
                        <span style={{fontSize: "0.68rem", color: "var(--muted)", padding: "0.3rem"}}>
                          {subStyle.name}
                          {subStyleId !== 0 && ` · ${realBuildData.subStyles.find(s => s.styleId === subStyleId)?.pickRate ?? "—"}%`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* ── Runas MOCK (fallback) ── */
          buildData.runeSetups.slice(0, 2).map((setup, i) => (
            <div key={i} className="rune-tree-full">
              <div className="rune-tree-full-header">
                <span style={{color:setup.primaryTreeColor,fontWeight:700}}>{setup.primaryTree}</span>
                <span style={{color:"var(--muted)",fontSize:"0.65rem"}}>+ {setup.secondaryTree}</span>
                <span style={{marginLeft:"auto",display:"flex",gap:"0.5rem",alignItems:"center"}}>
                  <span className="pick-rate-badge">{setup.pickRate}%</span>
                  <WRBadge wr={setup.winRate} />
                </span>
              </div>
              <div className="rune-tree-visual">
                <div className="rune-tree-col">
                  <div className="rune-tree-col-label" style={{color:setup.primaryTreeColor}}>Primária</div>
                  <div className="rune-keystone-big">
                    <RuneIcon path={setup.keystone.icon} size={48} />
                    <div className="rune-keystone-info">
                      <span className="rune-keystone-name">{setup.keystone.name}</span>
                      <span style={{fontSize:"0.62rem",color:"var(--muted)"}}>{setup.keystone.pickRate}%</span>
                    </div>
                  </div>
                  <div className="rune-slots-row">
                    {[setup.slot1, setup.slot2, setup.slot3].map((rune, si) => (
                      <div key={si} className="rune-slot-mini">
                        <RuneIcon path={rune.icon} size={32} />
                        <span className="rune-slot-mini-name">{rune.name}</span>
                        <span style={{fontSize:"0.6rem",color:"var(--muted)"}}>{rune.pickRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rune-tree-col rune-tree-col-sec">
                  <div className="rune-tree-col-label">Secundária</div>
                  <div className="rune-slots-sec">
                    {[setup.secondary1, setup.secondary2].map((rune, si) => (
                      <div key={si} className="rune-slot-mini">
                        <RuneIcon path={rune.icon} size={32} />
                        <span className="rune-slot-mini-name">{rune.name}</span>
                        <span style={{fontSize:"0.6rem",color:"var(--muted)"}}>{rune.pickRate}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="rune-shards-row">
                    <span className="rune-shard-badge">{setup.shard1}</span>
                    <span className="rune-shard-badge">{setup.shard2}</span>
                    <span className="rune-shard-badge">{setup.shard3}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ═══ 3. ORDEM DE SKILLS — 18 níveis ═══ */}
      <section className="build-section">
        <h3 className="build-section-title">Ordem de Habilidades</h3>
        {skillOrders.slice(0, 2).map((so, idx) => (
          <div key={idx} className="skill-order-full">
            <div className="skill-order-full-header">
              <span className="skill-ab-big" style={{background: ABILITY_COLORS[so.maxFirst] + "22", color: ABILITY_COLORS[so.maxFirst], border: `1px solid ${ABILITY_COLORS[so.maxFirst]}55`}}>
                Max {so.maxFirst}
              </span>
              <span className="pick-rate-badge">{so.pickRate}%</span>
              <WRBadge wr={so.winRate} />
            </div>
            <div className="skill-level-grid">
              <div className="skill-level-header">
                {Array.from({length:18},(_,i)=><span key={i} className="skill-level-num">{i+1}</span>)}
              </div>
              {(["Q","W","E","R"] as const).map((ab) => (
                <div key={ab} className="skill-level-row">
                  <span className="skill-level-ab" style={{color: ABILITY_COLORS[ab], fontWeight:700}}>{ab}</span>
                  {so.order.map((o,i) => (
                    <span
                      key={i}
                      className={`skill-level-cell ${o===ab?"active":""}`}
                      style={o===ab?{background:ABILITY_COLORS[ab]}:{}}
                    >
                      {o===ab?"●":""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ═══ 4. ITENS — fluxo contínuo ═══ */}
      <section className="build-section">
        <h3 className="build-section-title">Itens</h3>

        {/* Itens Iniciais */}
        <div className="items-flow">
          <div className="items-flow-block">
            <span className="items-flow-label">Iniciais</span>
            <div className="items-flow-options">
              {realStartingItems ? (
                realStartingItems.slice(0, 3).map((set, i) => (
                  <div key={i} className="items-flow-option">
                    <div className="items-flow-icons">
                      {set.strItems.map((id) => <ItemIcon key={id} id={id} size={32} />)}
                    </div>
                    <div className="items-flow-stats">
                      <span className="pick-rate-badge">{set.pickRate}%</span>
                      <WRBadge wr={set.winRate} />
                    </div>
                  </div>
                ))
              ) : (
                startingItems.slice(0, 3).map((set, i) => (
                  <div key={i} className="items-flow-option">
                    <div className="items-flow-icons">
                      {set.items.map((id) => <ItemIcon key={id} id={id} size={32} />)}
                    </div>
                    <div className="items-flow-stats">
                      <span className="pick-rate-badge">{set.pickRate}%</span>
                      <WRBadge wr={set.winRate} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <span className="items-flow-arrow">→</span>

          {/* Boots */}
          <div className="items-flow-block">
            <span className="items-flow-label">Botas</span>
            <div className="items-flow-options">
              {realBoots ? (
                realBoots.slice(0, 3).map((b, i) => (
                  <div key={i} className="items-flow-option">
                    <div className="items-flow-icons">
                      <ItemIcon id={b.strId} size={32} />
                    </div>
                    <div className="items-flow-stats">
                      <span className="pick-rate-badge">{b.pickRate}%</span>
                      <WRBadge wr={b.winRate} />
                    </div>
                  </div>
                ))
              ) : (
                boots.slice(0, 3).map((set, i) => (
                  <div key={i} className="items-flow-option">
                    <div className="items-flow-icons">
                      {set.items.map((id) => <ItemIcon key={id} id={id} size={32} />)}
                    </div>
                    <div className="items-flow-stats">
                      <span className="pick-rate-badge">{set.pickRate}%</span>
                      <WRBadge wr={set.winRate} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Build Principal (2 itens core) + expansão para 3°/4°/5° */}
        {realCoreItems ? (
          /* ── Core builds REAIS ── */
          <div className="items-flow" style={{marginTop:"0.75rem"}}>
            <div className="items-flow-block items-flow-block-wide">
              <span className="items-flow-label">Build Principal (core de 2 itens)</span>
              <div className="items-flow-options">
                {realCoreItems.slice(0, 3).map((set, i) => (
                  <div key={i} className="items-flow-option">
                    <div className="items-flow-icons">
                      {set.strItems.map((id) => <ItemIcon key={id} id={id} size={36} />)}
                    </div>
                    <div className="items-flow-stats">
                      <span className="pick-rate-badge">{set.pickRate}%</span>
                      <WRBadge wr={set.winRate} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="items-flow" style={{marginTop:"0.75rem"}}>
              <div className="items-flow-block items-flow-block-wide">
                <span className="items-flow-label">Build Principal (clique para expandir)</span>
                <div className="items-flow-options">
                  {coreBuilds.slice(0, 3).map((set, i) => (
                    <button
                      key={i}
                      className={`items-flow-option items-flow-clickable ${selectedCore===i?"selected":""}`}
                      onClick={() => setSelectedCore(i)}
                    >
                      <div className="items-flow-icons">
                        {set.items.slice(0, 2).map((id) => <ItemIcon key={id} id={id} size={36} />)}
                      </div>
                      <div className="items-flow-stats">
                        <span className="pick-rate-badge">{set.pickRate}%</span>
                        <WRBadge wr={set.winRate} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Itens seguintes baseados na core selecionada */}
              {selectedCore !== null && (
                <>
                  <span className="items-flow-arrow">→</span>
                  <div className="items-flow-block">
                    <span className="items-flow-label">3° Item</span>
                    <div className="items-flow-options">
                      {fourthItems.slice(0, 3).map((set, i) => (
                        <div key={i} className="items-flow-option">
                          <div className="items-flow-icons">
                            {set.items.slice(0, 1).map((id) => <ItemIcon key={id} id={id} size={32} />)}
                          </div>
                          <div className="items-flow-stats">
                            <span className="pick-rate-badge">{set.pickRate}%</span>
                            <WRBadge wr={set.winRate} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="items-flow-arrow">→</span>
                  <div className="items-flow-block">
                    <span className="items-flow-label">4°–5°</span>
                    <div className="items-flow-options">
                      {fifthItems.slice(0, 3).map((set, i) => (
                        <div key={i} className="items-flow-option">
                          <div className="items-flow-icons">
                            {set.items.slice(0, 1).map((id) => <ItemIcon key={id} id={id} size={32} />)}
                          </div>
                          <div className="items-flow-stats">
                            <span className="pick-rate-badge">{set.pickRate}%</span>
                            <WRBadge wr={set.winRate} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* ═══ 5. FILTRO COUNTER-PICK ═══ */}
      <section className="build-section">
        <h3 className="build-section-title">Filtrar por Campeão Inimigo</h3>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}>
          <select
            value={enemyFilter}
            onChange={(e) => setEnemyFilter(e.target.value)}
            style={{
              padding:"0.4rem 0.6rem", borderRadius:6, border:"1px solid var(--border)",
              background:"var(--panel)", color:"var(--text)", fontSize:"0.8rem", fontFamily:"inherit"
            }}
          >
            <option value="">Todos os inimigos</option>
            {buildData.hardCounters.map((c) => (
              <option key={c.champId} value={c.champId}>{c.champName} (difícil — {c.winRate}% WR)</option>
            ))}
            {buildData.easyMatchups.map((c) => (
              <option key={c.champId} value={c.champId}>{c.champName} (favorável — {c.winRate}% WR)</option>
            ))}
          </select>
          {enemyFilter && (
            <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>
              Mostrando partidas contra {buildData.hardCounters.find(c=>c.champId===enemyFilter)?.champName ?? buildData.easyMatchups.find(c=>c.champId===enemyFilter)?.champName}
            </span>
          )}
        </div>
      </section>

      {/* ═══ 6. PARTIDAS RECENTES ═══ */}
      {matchHistory && matchHistory.length > 0 && (
        <section className="build-section">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.5rem"}}>
            <h3 className="build-section-title" style={{margin:0}}>Partidas Recentes — Monochampions</h3>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
              <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>
                {wins}V/{total-wins}D · WR {(wins/total*100).toFixed(1)}% · {total} partidas
              </span>
              <Link
                href={`/champion/${buildData.champId}/partidas?region=${region}${apiLane ? `&lane=${apiLane}` : ""}`}
                className="ver-todas-link"
              >
                Ver todas ↗
              </Link>
            </div>
          </div>
          <p className="muted-sm" style={{marginBottom:"0.5rem"}}>
            {isRealData ? (
              <>✅ Dados REAIS da Riot API — {total} partidas de jogadores do topo do leaderboard.{" "}
              {isBuildReal && <>✅ Build calculada de {realBuildData!.totalGames} partidas reais.</>}
              </>
            ) : loadingMatches ? (
              "⏳ Buscando partidas reais da Riot API..."
            ) : (
              "⚠️ Dados de demonstração. Configure a Riot API Key para ver partidas reais."
            )}
          </p>

          <div className="matches-table-wrap">
            <table className="matches-table">
              <thead>
                <tr><th>Jogador</th><th>Elo</th><th>Reg</th><th>Res</th><th>KDA</th><th>CS/min</th><th>P/Kill%</th><th>Itens</th><th>Runas</th><th>Skills</th><th>Dur</th></tr>
              </thead>
              <tbody>
                {filteredMatches.slice(0, 20).map((m, i) => {
                  const FLG: Record<string, string> = { br1:"🇧🇷", kr:"🇰🇷", euw1:"🇪🇺", na1:"🇺🇸", oc1:"🇦🇺" };
                  const mExt = m as MatchEntry & { csPerMin?: number; killParticipation?: number; cs?: number };
                  return (
                    <tr key={i} className={m.win?"match-row-win":"match-row-loss"} style={{cursor:"pointer"}} onClick={() => setExpandedMatch(expandedMatch===i?null:i)}>
                      <td><span className="match-player-name">{m.summonerName}</span><span className="match-player-tag" style={{marginLeft:4}}>#{m.tagLine}</span></td>
                      <td><span className="match-tier">{m.tier}</span></td>
                      <td>{FLG[m.platform]??"🌐"}</td>
                      <td><span className={`match-result ${m.win?"win":"loss"}`}>{m.win?"V":"D"}</span></td>
                      <td><span className="match-kda">{m.kda}</span></td>
                      <td className="muted-sm" style={{fontSize:"0.68rem"}}>
                        {mExt.cs != null ? <>{mExt.cs} <span style={{color:"var(--muted)",opacity:0.7}}>({mExt.csPerMin ?? "—"})</span></> : "—"}
                      </td>
                      <td>
                        {mExt.killParticipation != null && mExt.killParticipation > 0
                          ? <span style={{fontSize:"0.7rem",padding:"0.1rem 0.35rem",borderRadius:4,background:"var(--panel)",border:"1px solid var(--border)"}}>{mExt.killParticipation}%</span>
                          : <span className="muted-sm">—</span>}
                      </td>
                      <td>
                        <div className="match-items-row">
                          {m.items.slice(0, 6).map((id, j) =>
                            id === "0" || !id
                              ? <div key={j} className="item-slot-empty" style={{width:20,height:20,borderRadius:3,background:"var(--panel)",border:"1px solid var(--border)"}} />
                              : <ItemIcon key={j} id={id} size={20} />
                          )}
                        </div>
                      </td>
                      <td><div className="match-runes-info">{formatRunes(m.runes, runeMap, isRealData)}</div></td>
                      <td><span className="match-skill-order">{m.skillOrder}</span></td>
                      <td className="muted-sm">{m.gameDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {expandedMatch !== null && matchHistory[expandedMatch] && (
            <MatchDetail match={matchHistory[expandedMatch]} champId={buildData.champId} onClose={() => setExpandedMatch(null)} />
          )}
        </section>
      )}
    </div>
  );
}

// ── Match Detail Panel ──────────────────────────────────────────────────────────

function MatchDetail({ match, champId, onClose }: { match: MatchEntry; champId: string; onClose: () => void }) {
  // Mock determinístico pra cada partida baseado no matchId
  const seed = match.matchId.charCodeAt(match.matchId.length-1);
  const allyPool = ["Lee Sin","Viego","Sejuani","Jarvan IV","Xin Zhao","Ahri","Syndra","Orianna","Jinx","Caitlyn","Nautilus","Thresh","Lulu","Braum"];
  const enemyPool = ["Darius","K'Sante","Renekton","Garen","Zed","Akali","LeBlanc","Fizz","Vayne","Draven","Leona","Blitzcrank","Pyke","Morgana"];
  function pick(arr: string[], idx: number) { return arr[idx % arr.length]; }

  const allyTeam = [
    { name: match.summonerName, champId },
    { name: "AliadoJG",  champId: pick(allyPool, seed+1) },
    { name: "AliadoMid", champId: pick(allyPool, seed+2) },
    { name: "AliadoADC", champId: pick(allyPool, seed+3) },
    { name: "AliadoSup", champId: pick(allyPool, seed+4) },
  ];
  const enemyTeam = [
    { name: "InimigoTop", champId: pick(enemyPool, seed+5) },
    { name: "InimigoJG",  champId: pick(enemyPool, seed+6) },
    { name: "InimigoMid", champId: pick(enemyPool, seed+7) },
    { name: "InimigoADC", champId: pick(enemyPool, seed+8) },
    { name: "InimigoSup", champId: pick(enemyPool, seed+9) },
  ];

  return (
    <div className="match-detail-panel">
      <div className="match-detail-header">
        <h4>Detalhes da Partida</h4>
        <button onClick={onClose} className="match-detail-close">✕</button>
      </div>
      <div className="match-detail-meta">
        <span style={{fontWeight:600}}>{match.summonerName}#{match.tagLine}</span>
        <span className="muted-sm">{match.tier} {match.rank}</span>
        <span className={match.win?"match-result win":"match-result loss"}>{match.win?"Vitória":"Derrota"}</span>
        <span className="muted-sm">{match.gameDuration} · {match.kda}</span>
      </div>
      <div className="match-teams-grid">
        <div className="match-team">
          <h5 style={{color:"#1a9e6e",margin:"0 0 0.4rem",fontSize:"0.78rem"}}>🟢 Aliados</h5>
          {allyTeam.map((p,i)=>(<div key={i} className="match-team-row"><ChampIcon champId={p.champId} size={24}/><span style={{fontSize:"0.72rem"}}>{p.name}</span><span style={{marginLeft:"auto",fontSize:"0.62rem",color:"var(--muted)"}}>{p.champId}</span></div>))}
        </div>
        <div className="match-team">
          <h5 style={{color:"#e84057",margin:"0 0 0.4rem",fontSize:"0.78rem"}}>🔴 Inimigos</h5>
          {enemyTeam.map((p,i)=>(<div key={i} className="match-team-row"><ChampIcon champId={p.champId} size={24}/><span style={{fontSize:"0.72rem"}}>{p.name}</span><span style={{marginLeft:"auto",fontSize:"0.62rem",color:"var(--muted)"}}>{p.champId}</span></div>))}
        </div>
      </div>
      <div className="match-detail-build">
        <div><strong>Itens:</strong> <div className="match-items-row">{match.items.map((id,j)=><ItemIcon key={j} id={id} size={28}/>)}</div></div>
        <div><strong>Runas:</strong> {match.runes.keystone} ({match.runes.primary}/{match.runes.secondary})</div>
        <div><strong>Feitiços:</strong> {match.summonerSpells.join(" + ")}</div>
        <div><strong>Ordem:</strong> {match.skillOrder}</div>
      </div>
    </div>
  );
}

// ── Counters Tab ──────────────────────────────────────────────────────────────

function CountersTab({ buildData, champName }: { buildData: ChampionBuildData; champName: string }) {
  const [selectedH2H, setSelectedH2H] = useState<CounterHeadToHead | null>(null);
  const h2hMap = useMemo(() => {
    const m: Record<string, CounterHeadToHead> = {};
    buildData.countersH2H.forEach((c) => { m[c.enemyChampId] = c; });
    return m;
  }, [buildData.countersH2H]);

  function selectCounter(m: MatchupEntry) { setSelectedH2H(h2hMap[m.champId] ?? null); }

  return (
    <div className="tab-content">
      {selectedH2H && (
        <section className="build-section h2h-panel">
          <div className="h2h-header">
            <div className="h2h-champ"><ChampIcon champId={buildData.champId} size={48} /><span>{champName}</span></div>
            <span className="h2h-vs">VS</span>
            <div className="h2h-champ"><ChampIcon champId={selectedH2H.enemyChampId} size={48} /><span>{selectedH2H.enemyChampName}</span></div>
          </div>
          <div className="h2h-stats">
            {[
              ["Taxa de Kill na Lane", `${selectedH2H.ourLaneKillRate.toFixed(2)}%`, `${selectedH2H.enemyLaneKillRate.toFixed(2)}%`],
              ["KDA", selectedH2H.ourKDA, selectedH2H.enemyKDA],
              ["Participação em Kills", `${selectedH2H.ourKP}%`, `${selectedH2H.enemyKP}%`],
              ["Dano Causado", selectedH2H.ourDmg.toLocaleString(), selectedH2H.enemyDmg.toLocaleString()],
              ["Primeira Torre", selectedH2H.ourFirstTower, selectedH2H.enemyFirstTower],
              ["Win Rate", `${selectedH2H.ourWR}%`, `${selectedH2H.enemyWR}%`],
              ["Lane Win Rate", `${selectedH2H.ourLaneWR}%`, `${selectedH2H.enemyLaneWR}%`],
            ].map(([label, our, enemy]) => (
              <div key={label} className="h2h-row">
                <div className="h2h-our">{our}</div><div className="h2h-label">{label}</div><div className="h2h-enemy">{enemy}</div>
              </div>
            ))}
          </div>
          <div className="h2h-games">{selectedH2H.games.toLocaleString()} partidas analisadas</div>
          <button className="h2h-close" onClick={() => setSelectedH2H(null)}>Fechar</button>
        </section>
      )}

      <div className="counters-grid">
        <section className="build-section">
          <h3 className="build-section-title" style={{ color: "#e84057" }}>Difíceis (Counters)</h3>
          <MatchupList matchups={buildData.hardCounters} champName={champName} onSelect={selectCounter} activeId={selectedH2H?.enemyChampId} />
        </section>
        <section className="build-section">
          <h3 className="build-section-title" style={{ color: "#1a9e6e" }}>Favoráveis</h3>
          <MatchupList matchups={buildData.easyMatchups} champName={champName} onSelect={selectCounter} activeId={selectedH2H?.enemyChampId} />
        </section>
      </div>

      <section className="build-section">
        <h3 className="build-section-title">Matchups Equilibrados (48–52%)</h3>
        <div className="counters-table-wrap">
          <table className="counters-table">
            <thead><tr><th>Campeão</th><th>Win Rate</th><th>Partidas</th></tr></thead>
            <tbody>
              {buildData.evenMatchups.map((m) => (
                <tr key={m.champId}>
                  <td><button className="matchup-btn" onClick={() => selectCounter(m)}><ChampIcon champId={m.champId} size={24} /><span>{m.champName}</span></button></td>
                  <td><WRBadge wr={m.winRate} /></td>
                  <td className="muted-sm">{m.games.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sinergias dentro de Counters */}
      <section className="build-section">
        <h3 className="build-section-title">Melhores Sinergias com {champName}</h3>
        <p className="muted-sm" style={{ marginBottom: "1rem" }}>Win rate quando ambos os campeões estão no mesmo time.</p>
        <div className="counters-table-wrap">
          <table className="counters-table">
            <thead><tr><th>Campeão</th><th>Rota</th><th>Win Rate Juntos</th><th>Partidas</th></tr></thead>
            <tbody>
              {buildData.synergies.slice(0, 10).map((s) => (
                <tr key={s.champId}>
                  <td><Link href={`/champion/${s.champId}`} className="matchup-btn" style={{ display: "flex", gap: 8, alignItems: "center", textDecoration: "none" }}><ChampIcon champId={s.champId} size={28} /><span>{s.champName}</span></Link></td>
                  <td className="muted-sm">{s.role}</td>
                  <td><WRBadge wr={s.winRate} /></td>
                  <td className="muted-sm">{s.games.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MatchupList({ matchups, champName, onSelect, activeId }: { matchups: MatchupEntry[]; champName: string; onSelect: (m: MatchupEntry) => void; activeId?: string }) {
  return (
    <div className="matchup-list">
      {matchups.map((m) => (
        <button key={m.champId} className={`matchup-row ${activeId === m.champId ? "active" : ""}`} onClick={() => onSelect(m)}>
          <ChampIcon champId={m.champId} size={30} />
          <span className="matchup-name">{m.champName}</span>
          <WRBadge wr={m.winRate} />
          <span className="muted-sm">{m.games.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

// ── One Tricks Tab ─────────────────────────────────────────────────────────────

function OneTricksTab({ buildData }: { buildData: ChampionBuildData }) {
  const TIER_BADGE_COLOR: Record<string, string> = {
    Challenger: "#0ac8b9", "Grão-Mestre": "#e84057", Mestre: "#9faafc",
    Diamante: "#9faafc", Esmeralda: "#1a9e6e", Platina: "#c8aa6e",
  };
  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Top One-Tricks — Ranking Global</h3>
        <p className="muted-sm" style={{ marginBottom: "1rem" }}>
          Jogadores com 50+ partidas neste campeão. Use o filtro de servidores acima para filtrar por região.
        </p>
        <div className="mastery-list">
          {buildData.masteryRanking.map((entry, i) => (
            <div key={i} className="mastery-row">
              <div className="mastery-rank-num">#{i + 1}</div>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/profileicon/${entry.profileIconId}.png`}
                alt={entry.summonerName} width={36} height={36} className="champ-icon-round"
              />
              <div className="mastery-info">
                <Link href={`/summoner/${encodeURIComponent(entry.summonerName + "#" + entry.tagLine)}`} className="mastery-name">
                  {entry.summonerName} #{entry.tagLine}
                </Link>
                <div className="mastery-tier-badge" style={{ color: TIER_BADGE_COLOR[entry.tier] ?? "var(--muted)" }}>
                  {entry.tier} {entry.rank}
                </div>
              </div>
              <div className="mastery-stats">
                <span className="mastery-games">{entry.games} partidas</span>
                <WRBadge wr={entry.winRate} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Pro Builds Tab ─────────────────────────────────────────────────────────────

function ProBuildsTab({ champName }: { champName: string }) {
  return (
    <div className="tab-content">
      <section className="build-section" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏆</div>
        <h3 className="build-section-title">Pro Builds — {champName}</h3>
        <p className="muted-sm" style={{ maxWidth: 400, margin: "0.5rem auto" }}>
          Em breve você poderá ver as builds dos jogadores profissionais de todos os servidores,
          incluindo CBLOL, LCK, LPL, LEC e LCS.
        </p>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <span className="tag-badge">CBLOL</span>
          <span className="tag-badge">LCK</span>
          <span className="tag-badge">LPL</span>
          <span className="tag-badge">LEC</span>
          <span className="tag-badge">LCS</span>
          <span className="tag-badge">Worlds</span>
        </div>
      </section>
    </div>
  );
}

// ── Guia Tab ────────────────────────────────────────────────────────────────────

function GuiaTab({ champName }: { champName: string }) {
  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Dicas da Comunidade para {champName}</h3>
        <div className="tips-list">
          {[
            `Use o combo Flash + habilidade de ${champName} para surpreender inimigos fora de posição.`,
            "Guarde a habilidade de dash para escapar de CC, não apenas para engajar.",
            `${champName} é forte em split-push — aproveite janelas de 1v1 quando o inimigo não tem TP.`,
            "No teamfight, espere a frontline engajar antes de ir na backline.",
            "Compre Zhonya's contra composições com muito burst.",
          ].map((tip, i) => (
            <div key={i} className="tip-card"><span className="tip-icon">💡</span><p>{tip}</p></div>
          ))}
        </div>
      </section>

      <section className="build-section">
        <h3 className="build-section-title">Guias Escritas</h3>
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
          <p>Nenhum guia enviado ainda. Seja o primeiro a contribuir!</p>
          <p className="muted-sm" style={{ marginTop: "0.5rem" }}>
            Em breve você poderá escrever e publicar guias completas com builds, matchups, combos e estratégias.
          </p>
        </div>
      </section>
    </div>
  );
}

// ── AI Analysis ───────────────────────────────────────────────────────────────

function AIAnalysis({ champId }: { champId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (text || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/champion/${champId}/ai-analysis`);
      const data = await res.json();
      setText(data.text);
    } catch { setText("Não foi possível carregar a análise."); } finally { setLoading(false); }
  }

  function toggle() { if (!open) load(); setOpen(!open); }

  const sections = useMemo(() => {
    if (!text) return [];
    return text.split("###").filter(Boolean).map((s) => {
      const [title, ...rest] = s.trim().split("\n");
      return { title: title.trim(), body: rest.join("\n").trim() };
    });
  }, [text]);

  return (
    <div className="ai-analysis-wrap">
      <button className="ai-analysis-toggle" onClick={toggle}>
        <span className="ai-badge">IA</span>
        <span>Análise Max LoL com Inteligência Artificial</span>
        <span className="ai-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="ai-analysis-body">
          {loading && <div className="ai-skeleton-wrap">{[120, 80, 100].map((h, i) => <Skeleton key={i} h={h} />)}</div>}
          {!loading && sections.map((sec) => (
            <div key={sec.title} className="ai-section">
              <h4 className="ai-section-title">{sec.title}</h4>
              <div className="ai-section-body">
                {sec.body.split("\n").map((line, i) => {
                  const isBullet = line.trimStart().startsWith("-");
                  return isBullet ? <li key={i} className="ai-bullet">{line.replace(/^[\s-]+/, "")}</li>
                    : line.trim() ? <p key={i}>{line}</p> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  champ: DDChampion;
  detail: DDChampionFull | null;
  buildData: ChampionBuildData;
  allChampions: DDChampion[];
  ddBase: string;
  splashUrl: string;
}

export function ChampionPageClient({ champ, detail, buildData, allChampions, ddBase, splashUrl }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab via URL search param
  const urlTab = searchParams.get("tab") ?? "build";
  const activeTab = (TABS.find((t) => t.toLowerCase() === urlTab.toLowerCase()) ? urlTab.toLowerCase() : "build") as string;
  const normalizedTab = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) as Tab;

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "Build") { params.delete("tab"); }
    else { params.set("tab", tab.toLowerCase()); }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Lane filter state (lido da URL ou default "Todas")
  const urlLane = searchParams.get("lane") ?? "Todas";
  const [lane, setLane] = useState(urlLane);

  // Região primária para chamadas à Riot API (primeiro servidor selecionado no filtro)
  const primaryRegion = useMemo(() => {
    const raw = searchParams.get("regions") ?? "all";
    if (raw === "all" || raw === "none") return "br1";
    const regions = raw.split(",").filter((r) => r in PLATFORMS);
    return regions[0] ?? "br1";
  }, [searchParams]);

  function handleLaneChange(l: string) {
    setLane(l);
    const params = new URLSearchParams(searchParams.toString());
    if (l === "Todas") { params.delete("lane"); }
    else { params.set("lane", l); }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Filtra buildData baseado na lane (mock: só afeta visualmente)
  const laneLabel = lane === "Todas" ? buildData.primaryRole : lane;

  return (
    <div className="champ-page">
      <ChampionHeader champ={champ} detail={detail} buildData={buildData} ddBase={ddBase} splashUrl={splashUrl} />

      <div className="champ-page-inner">
        <DataSourceToggle label="Fonte dos dados" />
        <RegionFilter showLabel />
        <LaneFilter lane={lane} onChange={handleLaneChange} />

        <AIAnalysis champId={champ.id} />

        {/* Tab navigation */}
        <div className="champ-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`champ-tab-btn ${normalizedTab === tab ? "active" : ""}`}
              onClick={() => setTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <AdBanner />

        {/* Tab content */}
        <div className="champ-tab-content">
          {normalizedTab === "Build" && <BuildTab buildData={buildData} detail={detail} ddBase={ddBase} region={primaryRegion} lane={lane} />}
          {normalizedTab === "Counters" && <CountersTab buildData={buildData} champName={champ.name} />}
          {normalizedTab === "One Tricks" && <OneTricksTab buildData={buildData} />}
          {normalizedTab === "Pro Builds" && <ProBuildsTab champName={champ.name} />}
          {normalizedTab === "Guia" && <GuiaTab champName={champ.name} />}
        </div>
      </div>
    </div>
  );
}
