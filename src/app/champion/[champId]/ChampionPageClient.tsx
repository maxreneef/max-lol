"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DDChampion, DDChampionFull } from "@/lib/ddragon";
import { AdBanner } from "@/components/AdUnit";
import { RegionFilter } from "@/components/RegionFilter";
import type {
  ChampionBuildData,
  ItemSet,
  MatchupEntry,
  CounterHeadToHead,
  MatchEntry,
} from "@/lib/mockChampData";
import { SUMMONER_SPELL_IDS, RUNE_STYLE_IDS, BOOTS_IDS } from "@/lib/riotIds";
import { aggregateBuildData, type RealMatch } from "@/lib/buildAggregator";
import { PLATFORMS } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const DD_IMG = `${DD_BASE}/img`;
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

const TABS = ["Build", "Counters", "Pro Builds", "Guia"] as const;
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

function MasteryModeToggle({ mode, onChange }: { mode: "all" | "otp"; onChange: (m: "all" | "otp") => void }) {
  return (
    <div className="lane-filter">
      <span className="lane-filter-label">Modo:</span>
      <div className="tl-pills">
        <button
          className={`tl-pill ${mode === "all" ? "active" : ""}`}
          onClick={() => onChange("all")}
        >
          Todos (High Elo)
        </button>
        <button
          className={`tl-pill ${mode === "otp" ? "active" : ""}`}
          onClick={() => onChange("otp")}
        >
          One-Tricks (500k+)
        </button>
      </div>
    </div>
  );
}

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

function BuildTab({ buildData, detail, ddBase, region, lane, masteryMode, setMasteryMode }: {
  buildData: ChampionBuildData; detail: DDChampionFull | null; ddBase: string;
  region: string; lane: string;
  masteryMode: "all" | "otp"; setMasteryMode: (m: "all" | "otp") => void;
}) {
  const { summonerSpells, skillOrders, startingItems, boots, coreBuilds, fourthItems, fifthItems, sixthItems, matchHistory: mockHistory } = buildData;
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [selectedCore, setSelectedCore] = useState(0);
  const [enemyFilter, setEnemyFilter] = useState("");
  const [realMatches, setRealMatches] = useState<MatchEntry[] | null>(null);
  const [rawApiMatches, setRawApiMatches] = useState<RealMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  // Build stats calculada de TODAS as partidas do banco (nao so as 200 da tabela)
  const [buildStats, setBuildStats] = useState<ReturnType<typeof aggregateBuildData> | null>(null);
  const [runeMap, setRuneMap] = useState<Map<number, { name: string; icon: string }>>(new Map());
  const [runeTrees, setRuneTrees] = useState<Array<{id:number;key:string;icon:string;name:string;slots:Array<{runes:Array<{id:number;key:string;icon:string;name:string}>}>}>>([]);
  const [visibleMatchCount, setVisibleMatchCount] = useState(10);

  // ── Derivado do modo de maestria (recebido do pai) ──
  const minMastery = masteryMode === "otp" ? 500000 : 0;

  // Monta query params para a API (região real + filtro de rota)
  const apiLane = lane.toLowerCase() === "todas" ? "" : lane.toLowerCase();

  // Reseta paginação quando muda região, rota ou modo
  useEffect(() => {
    setVisibleMatchCount(10);
  }, [region, apiLane, masteryMode]);

  // Busca partidas REAIS da Riot API
  useEffect(() => {
    let cancelled = false;
    async function fetchReal() {
      // Limpa dados antigos imediatamente para feedback visual
      setRealMatches(null);
      setRawApiMatches([]);
      setLoadingMatches(true);
      try {
        const laneParam = apiLane ? `&lane=${encodeURIComponent(apiLane)}` : "";
        const masteryParam = minMastery > 0 ? `&minMastery=${minMastery}` : "";
        const res = await fetch(
          `/api/champion/${buildData.champId}/matches?region=${region}${laneParam}${masteryParam}&count=200`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        // Guarda as partidas cruas para agregar a build localmente (sem chamar /build)
        const apiMatches = (data.matches ?? []) as RealMatch[];
        setRawApiMatches(apiMatches);
        if (apiMatches.length > 0) {
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
            allParticipants: (m.allParticipants as Array<{
              summonerName: string; tagLine: string; championId: string;
              teamId: number; win: boolean; puuid: string;
            }>) ?? [],
          } as MatchEntry & { csPerMin?: number; killParticipation?: number; cs?: number; allParticipants?: Array<{summonerName:string;tagLine:string;championId:string;teamId:number;win:boolean;puuid:string}> })));
        }
      } catch { /* fallback para mock */ }
      finally { if (!cancelled) setLoadingMatches(false); }
    }
    fetchReal();
    return () => { cancelled = true; };
  }, [buildData.champId, region, apiLane, minMastery]);

  // Busca dados de runas do Data Dragon (cache no client via state)
  useEffect(() => {
    let cancelled = false;
    fetch(`${DD_BASE}/data/pt_BR/runesReforged.json`)
      .then((r) => r.json())
      .then((trees) => {
        if (cancelled) return;
        setRuneTrees(trees);
        const map = new Map<number, { name: string; icon: string }>();
        for (const tree of trees) {
          for (const slot of tree.slots) {
            for (const rune of slot.runes) {
              map.set(rune.id, {
                name: rune.name,
                icon: rune.icon, // Usa o caminho oficial do DDragon (ex: DEATHFIRE_TOUCH_KEYSTONE.png)
              });
            }
          }
        }
        setRuneMap(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build stats: busca TODAS as partidas do banco para agregacao completa
  useEffect(() => {
    let cancelled = false;
    async function fetchBuildStats() {
      try {
        const laneParam = apiLane ? `&lane=${encodeURIComponent(apiLane)}` : "";
        const masteryParam = minMastery > 0 ? `&minMastery=${minMastery}` : "";
        const res = await fetch(
          `/api/champion/${buildData.champId}/build-stats?region=${region}${laneParam}${masteryParam}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.hasRealData) {
          setBuildStats(data as ReturnType<typeof aggregateBuildData>);
        }
      } catch {}
    }
    fetchBuildStats();
    return () => { cancelled = true; };
  }, [buildData.champId, region, apiLane]);

  // Build agregada LOCALMENTE a partir das mesmas partidas (fallback se buildStats nao carregou)
  const realBuildData = useMemo(
    () => buildStats ?? (rawApiMatches.length > 0 ? aggregateBuildData(rawApiMatches) : null),
    [buildStats, rawApiMatches]
  );

  // Apenas dados REAIS — sem mock/ilusão
  const matchHistory = realMatches ?? [];
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

      {/* ═══ 1. FEITIÇOS (apenas dados reais) ═══ */}
      {realSpells && realSpells.length > 0 && (
        <div className="build-spells-mini">
          <span className="build-label-mini">Feitiços</span>
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            {realSpells.map((s, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
                <img src={`${DD_IMG}/spell/${s.spell1Icon}.png`} alt={s.spell1Name} width={24} height={24} className="item-icon" />
                <img src={`${DD_IMG}/spell/${s.spell2Icon}.png`} alt={s.spell2Name} width={24} height={24} className="item-icon" />
                <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>{s.pickRate}%</span>
                <WRBadge wr={s.winRate} />
              </div>
            ))}
          </div>
        </div>
      )}
      {(!realSpells || realSpells.length === 0) && isBuildReal && (
        <div className="build-spells-mini">
          <span className="build-label-mini">Feitiços</span>
          <span className="muted-sm">Sem dados de feitiços.</span>
        </div>
      )}

      {/* ═══ 2. RUNAS — árvore visual interativa (múltiplas páginas) ═══ */}
      {realBuildData && (
        <section className="build-section">
          <h3 className="build-section-title">Runas</h3>
          <RuneTreePages realBuildData={realBuildData} runeMap={runeMap} runeTrees={runeTrees} rawMatches={rawApiMatches} />
        </section>
      )}
      {!realBuildData && (
        <section className="build-section">
          <h3 className="build-section-title">Runas</h3>
          <p className="muted-sm">Sem dados reais de runas.</p>
        </section>
      )}

      {/* ═══ 3. ORDEM DE SKILLS — 18 níveis ═══ */}
      {skillOrders && skillOrders.length > 0 && (
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
      )}

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
                <span className="muted-sm">Sem dados de itens iniciais.</span>
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
                <span className="muted-sm">Sem dados de botas.</span>
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
          <div className="items-flow" style={{marginTop:"0.75rem"}}>
            <span className="muted-sm">Sem dados de build principal.</span>
          </div>
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
            <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>
              {wins}V/{total-wins}D · WR {(wins/total*100).toFixed(1)}% · {total} partidas
            </span>
          </div>
          <p className="muted-sm" style={{marginBottom:"0.5rem"}}>
            {isRealData ? (
              masteryMode === "otp" ? (
                <>🔷 Dados REAIS de <strong>One-Tricks</strong> (500k+ maestria) — {total} partidas.{" "}
                {isBuildReal && <>Build calculada de {realBuildData!.totalGames} partidas.</>}
                </>
              ) : (
                <>✅ Dados REAIS do <strong>High Elo</strong> (Challenger a Diamante) — {total} partidas.{" "}
                {isBuildReal && <>Build calculada de {realBuildData!.totalGames} partidas.</>}
                </>
              )
            ) : loadingMatches ? (
              <span className="loading-indicator" style={{display:"inline-flex",padding:0}}>
                {masteryMode === "otp" ? "Buscando one-tricks (500k+)..." : "Buscando partidas..."}
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </span>
            ) : (
              "⚠️ Sem dados reais disponíveis para este campeão."
            )}
          </p>

          <div className="matches-table-wrap">
            <table className="matches-table">
              <thead>
                <tr><th>Jogador</th><th>Elo</th><th>Data</th><th>Res</th><th>KDA</th><th>CS/min</th><th>P/Kill%</th><th>Itens</th><th>Runas</th><th>Skills</th><th>Dur</th></tr>
              </thead>
              <tbody>
                {loadingMatches && matchHistory.length === 0 && (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i} style={{opacity: 0.3 + (5-i) * 0.1}}>
                      <td><div className="skeleton" style={{height:14,width:80}} /></td>
                      <td><div className="skeleton" style={{height:14,width:50}} /></td>
                      <td><div className="skeleton" style={{height:14,width:40}} /></td>
                      <td><div className="skeleton" style={{height:14,width:20}} /></td>
                      <td><div className="skeleton" style={{height:14,width:60}} /></td>
                      <td><div className="skeleton" style={{height:14,width:45}} /></td>
                      <td><div className="skeleton" style={{height:14,width:35}} /></td>
                      <td><div className="skeleton" style={{height:20,width:120}} /></td>
                      <td><div className="skeleton" style={{height:14,width:80}} /></td>
                      <td><div className="skeleton" style={{height:14,width:100}} /></td>
                      <td><div className="skeleton" style={{height:14,width:35}} /></td>
                    </tr>
                  ))
                )}
                {(!loadingMatches || matchHistory.length > 0) && filteredMatches.slice(0, visibleMatchCount).map((m, i) => {
                  const FLG: Record<string, string> = { br1:"🇧🇷", kr:"🇰🇷", euw1:"🇪🇺", na1:"🇺🇸", oc1:"🇦🇺" };
                  const mExt = m as MatchEntry & { csPerMin?: number; killParticipation?: number; cs?: number };
                  // Formata data da partida
                  const matchDate = m.gameCreation ? new Date(m.gameCreation) : null;
                  const dateStr = matchDate
                    ? `${String(matchDate.getDate()).padStart(2,"0")}/${String(matchDate.getMonth()+1).padStart(2,"0")}/${matchDate.getFullYear()} ${String(matchDate.getHours()).padStart(2,"0")}:${String(matchDate.getMinutes()).padStart(2,"0")}`
                    : "—";
                  return (
                    <tr key={i} className={m.win?"match-row-win":"match-row-loss"} style={{cursor:"pointer"}} onClick={() => setExpandedMatch(expandedMatch===i?null:i)}>
                      <td><span className="match-player-name">{m.summonerName}</span><span className="match-player-tag" style={{marginLeft:4}}>#{m.tagLine}</span></td>
                      <td><span className="match-tier">{m.tier}</span></td>
                      <td className="muted-sm" style={{fontSize:"0.68rem"}}>{dateStr}</td>
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
                      <td>
                        {m.skillOrder ? (
                          <span style={{fontSize:"0.55rem",fontWeight:700,letterSpacing:1}}>
                            {m.skillOrder.split("").map((l,j) => (
                              <span key={j} style={{color: ABILITY_COLORS[l] || "var(--muted)"}}>{l}</span>
                            ))}
                          </span>
                        ) : <span className="muted-sm">—</span>}
                      </td>
                      <td className="muted-sm">{m.gameDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botão Ver mais — carrega 10 a mais sem mudar de aba */}
          {!loadingMatches && filteredMatches.length > visibleMatchCount && (
            <div style={{textAlign:"center",marginTop:"0.75rem"}}>
              <button
                className="ver-mais-btn"
                onClick={() => setVisibleMatchCount((n) => n + 10)}
              >
                Ver mais · {filteredMatches.length - visibleMatchCount} restantes
              </button>
            </div>
          )}

          {expandedMatch !== null && matchHistory[expandedMatch] && (
            <MatchDetail match={matchHistory[expandedMatch]} champId={buildData.champId} onClose={() => setExpandedMatch(null)} runeMap={runeMap} />
          )}
        </section>
      )}
    </div>
  );
}

// ── Match Detail Panel ──────────────────────────────────────────────────────────

function SpellIconById({ spellId, size = 28 }: { spellId: number | string; size?: number }) {
  const id = typeof spellId === "string" ? parseInt(spellId, 10) : spellId;
  const info = SUMMONER_SPELL_IDS[id] ?? { name: String(id), icon: `Summoner${id}` };
  return (
    <img
      src={`${DD_IMG}/spell/${info.icon}.png`}
      alt={info.name}
      width={size}
      height={size}
      className="item-icon"
      title={info.name}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
    />
  );
}

/** Arvore de runas interativa — permite alternar entre as top 4 paginas mais populares */
/** Uma página de runa completa (keystone + runas primárias + secundária + runas secundárias) */
interface RuneSet {
  keystoneId: number;
  primaryRunes: number[]; // [slot1, slot2, slot3]
  subStyleId: number;
  subRunes: number[];     // [runa1, runa2]
  pickRate: number;
  winRate: number;
  count: number;
}

function RuneTreePages({ realBuildData, runeMap, runeTrees, rawMatches }: {
  realBuildData: NonNullable<ReturnType<typeof aggregateBuildData>>;
  runeMap: Map<number, { name: string; icon: string }>;
  runeTrees: Array<{id:number;key:string;icon:string;name:string;slots:Array<{runes:Array<{id:number;key:string;icon:string;name:string}>}>}>;
  rawMatches: RealMatch[];
}) {
  const NUM_PAGES = Math.min(4, realBuildData.primaryStyles.length);
  const [selected, setSelected] = useState(0);

  const primaryStyle = realBuildData.primaryStyles[selected];
  const pStyle = RUNE_STYLE_IDS[primaryStyle?.styleId ?? 0] ?? { name: "Desconhecido", color: "#888" };

  // ── SETs: páginas de runa completas da árvore primária selecionada ──
  // SET 1 = a mais usada (define o keystone). SET 2-4 = próximas mais usadas
  // mantendo o MESMO keystone do SET 1 (variam as runas menores e a secundária).
  const { sets, runePickRate } = useMemo(() => {
    const styleId = primaryStyle?.styleId ?? 0;
    // % de uso individual de cada runa — base nos agregados (consistente c/ o resto da página)
    const rpr = new Map<number, number>();
    for (const k of realBuildData.keystones) rpr.set(k.runeId, k.pickRate);
    for (const slot of realBuildData.primarySlots) for (const r of slot) rpr.set(r.runeId, Math.max(rpr.get(r.runeId) ?? 0, r.pickRate));
    for (const slot of realBuildData.subSlots) for (const r of slot) rpr.set(r.runeId, Math.max(rpr.get(r.runeId) ?? 0, r.pickRate));

    // Fallback: sem partidas cruas, deriva 1 SET dos agregados de realBuildData
    const buildFallbackSet = (): RuneSet | null => {
      const tree = runeTrees.find((t) => t.id === styleId);
      const kIds = new Set((tree?.slots[0]?.runes ?? []).map((r) => r.id));
      const ks = realBuildData.keystones.find((k) => kIds.has(k.runeId)) ?? realBuildData.keystones[0];
      if (!ks) return null;
      return {
        keystoneId: ks.runeId,
        primaryRunes: realBuildData.primarySlots.map((s) => s[0]?.runeId).filter((x): x is number => !!x),
        subStyleId: realBuildData.subStyles[0]?.styleId ?? 0,
        subRunes: realBuildData.subSlots.map((s) => s[0]?.runeId).filter((x): x is number => !!x),
        pickRate: ks.pickRate, winRate: ks.winRate, count: ks.count,
      };
    };

    if (!styleId) return { sets: [] as RuneSet[], runePickRate: rpr };

    const totalAll = rawMatches.length || realBuildData.totalGames || 1;
    const primaryMatches = rawMatches.filter((m) => m.primaryStyle === styleId);
    if (primaryMatches.length === 0) {
      const fb = buildFallbackSet();
      return { sets: fb ? [fb] : [], runePickRate: rpr };
    }

    // % individual preciso a partir das partidas cruas (sobre o total geral)
    const runeCount = new Map<number, number>();
    for (const m of primaryMatches) {
      const ids = new Set<number>([...(m.runeSelections ?? []), ...(m.subSelections ?? [])].filter((x) => x > 0));
      for (const id of ids) runeCount.set(id, (runeCount.get(id) ?? 0) + 1);
    }
    for (const [id, c] of runeCount) rpr.set(id, +((c / totalAll) * 100).toFixed(1));

    // Agrupa por página de runa completa
    const pageMap = new Map<string, { count: number; wins: number; sample: RealMatch }>();
    for (const m of primaryMatches) {
      const sel = m.runeSelections ?? [];
      const sub = m.subSelections ?? [];
      if (sel.length < 4 || sub.length < 2 || !m.subStyle) continue;
      // Normaliza a ordem (a Riot não garante a ordem das runas) p/ não duplicar páginas iguais
      const primKey = [sel[1], sel[2], sel[3]].slice().sort((a, b) => a - b).join(",");
      const subKey = [sub[0], sub[1]].slice().sort((a, b) => a - b).join(",");
      const key = `${m.primaryRuneId}|${primKey}|${m.subStyle}|${subKey}`;
      const e = pageMap.get(key) ?? { count: 0, wins: 0, sample: m };
      e.count++;
      if (m.win) e.wins++;
      pageMap.set(key, e);
    }
    const pages = [...pageMap.values()].sort((a, b) => b.count - a.count);
    if (pages.length === 0) {
      const fb = buildFallbackSet();
      return { sets: fb ? [fb] : [], runePickRate: rpr };
    }

    // SET 1 define o keystone; SET 2-4 mantêm o mesmo keystone (1ª linha não troca)
    const keystone1 = pages[0].sample.primaryRuneId;
    const chosen = pages.filter((p) => p.sample.primaryRuneId === keystone1).slice(0, 4);
    const sets: RuneSet[] = chosen.map((p) => {
      const m = p.sample;
      return {
        keystoneId: m.primaryRuneId,
        primaryRunes: [m.runeSelections[1], m.runeSelections[2], m.runeSelections[3]],
        subStyleId: m.subStyle,
        subRunes: [m.subSelections[0], m.subSelections[1]],
        pickRate: +((p.count / totalAll) * 100).toFixed(1),
        winRate: +((p.wins / p.count) * 100).toFixed(1),
        count: p.count,
      };
    });
    return { sets, runePickRate: rpr };
  }, [primaryStyle?.styleId, rawMatches, realBuildData, runeTrees]);

  // SET selecionado (reseta ao trocar de árvore primária)
  const [selectedSet, setSelectedSet] = useState(0);
  useEffect(() => { setSelectedSet(0); }, [primaryStyle?.styleId, sets.length]);
  const activeSet = sets[selectedSet] ?? sets[0] ?? null;

  // Derivados do SET ativo (usados na renderização das árvores)
  const subStyleId = activeSet?.subStyleId ?? realBuildData.subStyles[0]?.styleId ?? 0;
  const sStyle = RUNE_STYLE_IDS[subStyleId] ?? { name: "Desconhecido", color: "#888" };
  const primaryTree = runeTrees.find((t) => t.id === (primaryStyle?.styleId ?? 0));
  const subTree = runeTrees.find((t) => t.id === subStyleId);
  const keystoneInfo = activeSet ? runeMap.get(activeSet.keystoneId) : null;
  const highlightedPrimary = new Set<number>(activeSet?.primaryRunes ?? []);
  const highlightedSub = new Set<number>(activeSet?.subRunes ?? []);

  return (
    <div>
      {/* Pills para alternar entre paginas */}
      <div style={{display:"flex",gap:6,marginBottom:"0.75rem",flexWrap:"wrap"}}>
        {Array.from({length: NUM_PAGES}, (_, i) => {
          const p = realBuildData.primaryStyles[i];
          const s = RUNE_STYLE_IDS[p?.styleId ?? 0];
          const ptree = runeTrees.find((t) => t.id === (p?.styleId ?? 0));
          const kIds = new Set((ptree?.slots[0]?.runes ?? []).map((r) => r.id));
          const k = realBuildData.keystones.find((ks) => kIds.has(ks.runeId));
          const ki = k ? runeMap.get(k.runeId) : null;
          return (
            <button key={i} onClick={() => setSelected(i)} className={`tl-pill ${selected === i ? "active" : ""}`}
              style={{borderColor: selected === i ? (s?.color || "#888") : undefined}}>
              {ki && <RuneIcon path={ki.icon} size={18} />}
              <span style={{fontSize:"0.68rem",fontWeight:600,color:s?.color}}>{s?.name ?? `#${p?.styleId}`}</span>
            </button>
          );
        })}
      </div>

      {/* Cabecalho */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.6rem",flexWrap:"wrap"}}>
        {keystoneInfo && <RuneIcon path={keystoneInfo.icon} size={22} />}
        <span style={{color: pStyle.color, fontWeight: 700, fontSize: "0.85rem"}}>{keystoneInfo?.name ?? pStyle.name}</span>
        <span style={{color: "var(--muted)", fontSize: "0.7rem"}}>{pStyle.name} + {sStyle.name}</span>
        <span style={{marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center"}}>
          <span className="pick-rate-badge">{activeSet?.pickRate ?? primaryStyle?.pickRate ?? 0}%</span>
          <WRBadge wr={activeSet?.winRate ?? primaryStyle?.winRate ?? 0} />
        </span>
      </div>

      {/* Arvore visual: lado a lado (primaria + secundaria) */}
      <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
        {/* ── PRIMARIA (4 slots: keystone + 3) ── */}
        <div style={{flex:2,minWidth:220,background:"var(--panel)",borderRadius:10,border:"1px solid var(--border)",padding:"0.75rem"}}>
          <div style={{fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.05em",color: pStyle.color,fontWeight:600,marginBottom:"0.5rem"}}>
            Primaria — {pStyle.name}
          </div>
          {primaryTree ? (
            primaryTree.slots.map((slot, si) => {
              const isKeystoneRow = si === 0;
              // Destaca as runas do SET ativo: keystone na 1ª linha, escolhidas nas demais
              const runeEntries = slot.runes.map((rune) => {
                const isPopular = isKeystoneRow
                  ? rune.id === (activeSet?.keystoneId ?? 0)
                  : highlightedPrimary.has(rune.id);
                const ri = runeMap.get(rune.id);
                return { rune, isPopular, pickRate: runePickRate.get(rune.id) ?? 0, icon: ri?.icon ?? "", name: ri?.name ?? "" };
              });
              return (
                <div key={si} style={{marginBottom: si < 3 ? 0 : 0}}>
                  {runeEntries.map((entry, ri) => (
                    <span key={ri} style={{
                      display:"inline-flex",flexDirection:"column",alignItems:"center",
                      margin: isKeystoneRow ? "0 5px 6px 5px" : "0 4px 4px 4px",
                      opacity: entry.isPopular ? 1 : 0.25,
                      transition:"opacity 0.2s",
                    }} title={entry.name ? `${entry.name}${entry.isPopular ? ` — ${entry.pickRate}%` : ""}` : ""}>
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/img/${entry.rune.icon}`}
                        alt=""
                        width={isKeystoneRow ? 36 : 28}
                        height={isKeystoneRow ? 36 : 28}
                        style={{
                          borderRadius:"50%",
                          border: entry.isPopular ? `2px solid ${pStyle.color}` : "1px solid transparent",
                          background: entry.isPopular ? `${pStyle.color}22` : "transparent",
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }}
                      />
                      {entry.isPopular && (
                        <span style={{fontSize:"0.55rem",color:"var(--muted)",marginTop:1,fontWeight:600}}>
                          {entry.pickRate}%
                        </span>
                      )}
                    </span>
                  ))}
                  {/* Conector visual entre slots (exceto ultimo) */}
                  {si < 3 && (
                    <div style={{height:6,opacity:0.15}}>
                      <div style={{margin:"0 auto",width:1,height:"100%",background:pStyle.color}} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <span className="muted-sm">Árvore não encontrada</span>
          )}
        </div>

        {/* ── SECUNDARIA (2 slots) ── */}
        <div style={{flex:1,minWidth:140,background:"var(--panel)",borderRadius:10,border:"1px solid var(--border)",padding:"0.75rem",opacity: subTree ? 1 : 0.4}}>
          <div style={{fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.05em",color: sStyle.color,fontWeight:600,marginBottom:"0.5rem"}}>
            Secundaria — {sStyle.name}
          </div>
          {subTree ? (
            subTree.slots.slice(1, 4).map((slot, si) => {
              const runeEntries = slot.runes.map((rune) => {
                const isPopular = highlightedSub.has(rune.id);
                const ri = runeMap.get(rune.id);
                return { rune, isPopular, pickRate: runePickRate.get(rune.id) ?? 0, icon: ri?.icon ?? "", name: ri?.name ?? "" };
              });
              return (
                <div key={si} style={{marginBottom:4}}>
                  {runeEntries.map((entry, ri) => (
                    <span key={ri} style={{
                      display:"inline-flex",flexDirection:"column",alignItems:"center",
                      margin:"0 4px 4px 4px",
                      opacity: entry.isPopular ? 1 : 0.25,
                      transition:"opacity 0.2s",
                    }} title={entry.name ? `${entry.name}${entry.isPopular ? ` — ${entry.pickRate}%` : ""}` : ""}>
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/img/${entry.rune.icon}`}
                        alt=""
                        width={24}
                        height={24}
                        style={{
                          borderRadius:"50%",
                          border: entry.isPopular ? `2px solid ${sStyle.color}` : "1px solid transparent",
                          background: entry.isPopular ? `${sStyle.color}22` : "transparent",
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }}
                      />
                      {entry.isPopular && (
                        <span style={{fontSize:"0.5rem",color:"var(--muted)",marginTop:1,fontWeight:600}}>
                          {entry.pickRate}%
                        </span>
                      )}
                    </span>
                  ))}
                  {si < 2 && (
                    <div style={{height:4,opacity:0.1}}>
                      <div style={{margin:"0 auto",width:1,height:"100%",background:sStyle.color}} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <span className="muted-sm">Árvore não encontrada</span>
          )}
        </div>
      </div>

      {/* Páginas de runa (SETs): SET 1 = a mais usada; SET 2-4 mantêm o keystone do SET 1 */}
      {sets.length > 0 && (
        <div style={{marginTop:"0.75rem"}}>
          <span style={{fontSize:"0.62rem",color:"var(--muted)",display:"block",marginBottom:"0.35rem",textTransform:"uppercase",letterSpacing:"0.05em"}}>
            Páginas de Runa
          </span>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {sets.map((set, i) => {
              const isActive = i === selectedSet;
              const subInfo = RUNE_STYLE_IDS[set.subStyleId] ?? { name: `#${set.subStyleId}`, color: "#888" };
              const ksIcon = runeMap.get(set.keystoneId)?.icon;
              return (
                <button key={i} onClick={() => setSelectedSet(i)} style={{
                  display:"flex",flexDirection:"column",gap:5,
                  padding:"0.45rem 0.6rem",borderRadius:8,minWidth:150,
                  border: isActive ? `1.5px solid ${pStyle.color}` : "1px solid var(--border)",
                  background: isActive ? `${pStyle.color}12` : "var(--panel)",
                  opacity: isActive ? 1 : 0.7, cursor:"pointer",
                }}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%"}}>
                    <span style={{fontWeight:700,fontSize:"0.7rem",color: isActive ? pStyle.color : "var(--text)"}}>SET {i + 1}</span>
                    <span style={{display:"flex",gap:6,alignItems:"center",fontSize:"0.62rem"}}>
                      <span className="pick-rate-badge">{set.pickRate}%</span>
                      <WRBadge wr={set.winRate} />
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    {ksIcon && (
                      <img src={`${DD_RUNE}/${ksIcon}`} alt="" width={22} height={22}
                        style={{borderRadius:"50%",border:`1.5px solid ${pStyle.color}`}}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }} />
                    )}
                    {set.primaryRunes.map((id) => {
                      const ic = runeMap.get(id)?.icon;
                      return ic ? (
                        <img key={id} src={`${DD_RUNE}/${ic}`} alt="" width={16} height={16}
                          style={{borderRadius:"50%",opacity:0.95}}
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }} />
                      ) : null;
                    })}
                    <span style={{width:1,height:16,background:"var(--border)",margin:"0 3px"}} />
                    {set.subRunes.map((id) => {
                      const ic = runeMap.get(id)?.icon;
                      return ic ? (
                        <img key={id} src={`${DD_RUNE}/${ic}`} alt="" width={16} height={16}
                          style={{borderRadius:"50%",border:`1px solid ${subInfo.color}`,opacity:0.95}}
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }} />
                      ) : null;
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillOrderVisual({ order }: { order: string }) {
  if (!order) return <span className="muted-sm">—</span>;
  return (
    <div style={{display:"flex",gap:2,flexWrap:"wrap",maxWidth:340}}>
      {order.split("").map((letter, i) => (
        <span key={i} style={{
          display:"inline-flex",alignItems:"center",justifyContent:"center",
          width:18,height:18,borderRadius:3,
          fontSize:"0.62rem",fontWeight:700,
          background: ABILITY_COLORS[letter] || "var(--panel)",
          color: ABILITY_COLORS[letter] ? "#fff" : "var(--muted)",
          border: `1px solid ${ABILITY_COLORS[letter] || "var(--border)"}55`,
        }}>
          {letter}
        </span>
      ))}
    </div>
  );
}

function MatchDetail({ match, champId, onClose, runeMap }: {
  match: MatchEntry; champId: string; onClose: () => void;
  runeMap: Map<number, { name: string; icon: string }>;
}) {
  // Usa participantes REAIS quando disponiveis, senao fallback mock
  const mExt = match as MatchEntry & { allParticipants?: Array<{summonerName:string;tagLine:string;championId:string;teamId:number;win:boolean;puuid:string}> };
  const hasRealPlayers = mExt.allParticipants && mExt.allParticipants.length === 10;

  let allyTeam: Array<{ name: string; tagLine: string; champId: string }> = [];
  let enemyTeam: Array<{ name: string; tagLine: string; champId: string }> = [];

  if (hasRealPlayers) {
    const myTeamId = mExt.allParticipants!.find((p) => p.championId.toLowerCase() === champId.toLowerCase())?.teamId;
    allyTeam = mExt.allParticipants!.filter((p) => p.teamId === myTeamId).map((p) => ({
      name: p.summonerName || "Invocador",
      tagLine: p.tagLine || "",
      champId: p.championId,
    }));
    enemyTeam = mExt.allParticipants!.filter((p) => p.teamId !== myTeamId).map((p) => ({
      name: p.summonerName || "Invocador",
      tagLine: p.tagLine || "",
      champId: p.championId,
    }));
  } else {
    // Fallback mock
    const seed = match.matchId.charCodeAt(match.matchId.length-1);
    const allyPool = ["Lee Sin","Viego","Sejuani","Jarvan IV","Xin Zhao","Ahri","Syndra","Orianna","Jinx","Caitlyn","Nautilus","Thresh","Lulu","Braum"];
    const enemyPool = ["Darius","K'Sante","Renekton","Garen","Zed","Akali","LeBlanc","Fizz","Vayne","Draven","Leona","Blitzcrank","Pyke","Morgana"];
    function pick(arr: string[], idx: number) { return arr[idx % arr.length]; }
    allyTeam = [
      { name: match.summonerName, tagLine: match.tagLine || "", champId },
      { name: "AliadoJG",  tagLine: "", champId: pick(allyPool, seed+1) },
      { name: "AliadoMid", tagLine: "", champId: pick(allyPool, seed+2) },
      { name: "AliadoADC", tagLine: "", champId: pick(allyPool, seed+3) },
      { name: "AliadoSup", tagLine: "", champId: pick(allyPool, seed+4) },
    ];
    enemyTeam = [
      { name: "InimigoTop", tagLine: "", champId: pick(enemyPool, seed+5) },
      { name: "InimigoJG",  tagLine: "", champId: pick(enemyPool, seed+6) },
      { name: "InimigoMid", tagLine: "", champId: pick(enemyPool, seed+7) },
      { name: "InimigoADC", tagLine: "", champId: pick(enemyPool, seed+8) },
      { name: "InimigoSup", tagLine: "", champId: pick(enemyPool, seed+9) },
    ];
  }

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
          {allyTeam.map((p,i)=>(<div key={i} className="match-team-row"><ChampIcon champId={p.champId} size={24}/><span style={{fontSize:"0.72rem"}}>{p.name}{p.tagLine ? <span style={{fontSize:"0.6rem",color:"var(--muted)",marginLeft:3}}>#{p.tagLine}</span> : null}</span><span style={{marginLeft:"auto",fontSize:"0.62rem",color:"var(--muted)"}}>{p.champId}</span></div>))}
        </div>
        <div className="match-team">
          <h5 style={{color:"#e84057",margin:"0 0 0.4rem",fontSize:"0.78rem"}}>🔴 Inimigos</h5>
          {enemyTeam.map((p,i)=>(<div key={i} className="match-team-row"><ChampIcon champId={p.champId} size={24}/><span style={{fontSize:"0.72rem"}}>{p.name}{p.tagLine ? <span style={{fontSize:"0.6rem",color:"var(--muted)",marginLeft:3}}>#{p.tagLine}</span> : null}</span><span style={{marginLeft:"auto",fontSize:"0.62rem",color:"var(--muted)"}}>{p.champId}</span></div>))}
        </div>
      </div>
      <div className="match-detail-build">
        {/* Itens */}
        <div style={{marginBottom:"0.5rem"}}>
          <strong style={{fontSize:"0.72rem",display:"block",marginBottom:"0.25rem"}}>Itens</strong>
          <div className="match-items-row" style={{gap:4}}>
            {match.items.map((id,j) => (
              id === "0" || !id
                ? <div key={j} style={{width:28,height:28,borderRadius:4,background:"var(--panel)",border:"1px solid var(--border)"}} />
                : <ItemIcon key={j} id={id} size={28} />
            ))}
          </div>
        </div>

        {/* Feitiços */}
        <div style={{marginBottom:"0.5rem"}}>
          <strong style={{fontSize:"0.72rem",display:"block",marginBottom:"0.25rem"}}>Feitiços</strong>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {match.summonerSpells.map((sid, j) => (
              <SpellIconById key={j} spellId={sid} size={28} />
            ))}
          </div>
        </div>

        {/* Runas */}
        <div style={{marginBottom:"0.5rem"}}>
          <strong style={{fontSize:"0.72rem",display:"block",marginBottom:"0.25rem"}}>Runas</strong>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* Keystone */}
            {(() => {
              const r = match.runes as Record<string, unknown>;
              const ksId = (r.primaryRuneId as number) || Number(r.keystone) || 0;
              const ks = runeMap.get(ksId);
              const pStyle = RUNE_STYLE_IDS[(r.primaryStyle as number) || Number(r.primary) || 0];
              const sStyle = RUNE_STYLE_IDS[(r.subStyle as number) || Number(r.secondary) || 0];
              return (
                <>
                  {ks && <RuneIcon path={ks.icon} size={28} />}
                  <span style={{fontSize:"0.68rem"}}>
                    {ks?.name ?? `Runa #${ksId}`}
                    <span style={{color:"var(--muted)",marginLeft:4}}>
                      {pStyle?.name ?? "·"} / {sStyle?.name ?? "·"}
                    </span>
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Ordem de Skills */}
        <div>
          <strong style={{fontSize:"0.72rem",display:"block",marginBottom:"0.25rem"}}>Ordem de Habilidades</strong>
          <SkillOrderVisual order={match.skillOrder} />
        </div>
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
                src={`${DD_BASE}/img/profileicon/${entry.profileIconId}.png`}
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

  // Modo de maestria: "all" = todos high elo, "otp" = 500k+
  const [masteryMode, setMasteryMode] = useState<"all" | "otp">("all");

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
        <RegionFilter showLabel />
        <LaneFilter lane={lane} onChange={handleLaneChange} />
        <MasteryModeToggle mode={masteryMode} onChange={setMasteryMode} />

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
        <div className="champ-tab-content" key={`${normalizedTab}-${masteryMode}`}>
          {normalizedTab === "Build" && <BuildTab buildData={buildData} detail={detail} ddBase={ddBase} region={primaryRegion} lane={lane} masteryMode={masteryMode} setMasteryMode={setMasteryMode} />}
          {normalizedTab === "Counters" && <CountersTab buildData={buildData} champName={champ.name} />}
          {normalizedTab === "Pro Builds" && <ProBuildsTab champName={champ.name} />}
          {normalizedTab === "Guia" && <GuiaTab champName={champ.name} />}
        </div>
      </div>
    </div>
  );
}
