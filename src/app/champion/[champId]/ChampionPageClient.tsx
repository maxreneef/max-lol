"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { DDChampion, DDChampionFull } from "@/lib/ddragon";
import { AdBanner } from "@/components/AdUnit";
import type {
  ChampionBuildData,
  ItemSet,
  MatchupEntry,
  CounterHeadToHead,
  RuneSetup,
} from "@/lib/mockChampData";

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

const TABS = ["Build", "Counters", "Runas", "Habilidades", "Sinergias", "Maestria", "Dicas"] as const;
type Tab = typeof TABS[number];

const ROLES = ["Todas", "Top", "Jungle", "Mid", "ADC", "Suporte"];
const REGIONS = ["Global", "BR", "NA", "EUW", "KR"];
const ELOS = ["Todos", "Ferro-Ouro", "Platina-Esmeralda", "Diamante+", "Mestre+", "Challenger"];
const MODES = ["Ranqueado Solo/Duo", "Ranqueado Flex", "ARAM", "Arena"];
const PATCHES = ["15.11", "15.10", "15.9"];

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

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
}: {
  filters: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const selects = [
    { key: "role", label: "Rota", options: ROLES },
    { key: "region", label: "Região", options: REGIONS },
    { key: "elo", label: "Elo", options: ELOS },
    { key: "mode", label: "Modo", options: MODES },
    { key: "patch", label: "Patch", options: PATCHES },
  ];
  return (
    <div className="champ-filter-bar">
      {selects.map((s) => (
        <select
          key={s.key}
          className="champ-filter-select"
          value={filters[s.key]}
          onChange={(e) => onChange(s.key, e.target.value)}
        >
          {s.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

// ── Champion Header ────────────────────────────────────────────────────────────

function ChampionHeader({
  champ,
  detail,
  buildData,
  ddBase,
  splashUrl,
}: {
  champ: DDChampion;
  detail: DDChampionFull | null;
  buildData: ChampionBuildData;
  ddBase: string;
  splashUrl: string;
}) {
  const { tier, winRate, pickRate, banRate, winRateDelta, pickRateDelta, difficulty, patch } = buildData;

  return (
    <div className="champ-hero" style={{ backgroundImage: `url(${splashUrl})` }}>
      <div className="champ-hero-overlay" />
      <div className="champ-hero-content">
        <div className="champ-hero-left">
          <img
            src={`${ddBase}/img/champion/${champ.id}.png`}
            alt={champ.name}
            className="champ-hero-icon"
          />
          <div className="champ-hero-info">
            <div className="champ-hero-top">
              <span className="tier-badge" style={{ background: TIER_COLOR[tier], color: "#000" }}>
                {tier}
              </span>
              <span
                className="champ-difficulty-badge"
                style={{ background: DIFFICULTY_COLOR[difficulty] + "22", color: DIFFICULTY_COLOR[difficulty], border: `1px solid ${DIFFICULTY_COLOR[difficulty]}44` }}
              >
                {difficulty}
              </span>
              <span className="champ-patch-badge">Patch {patch}</span>
            </div>
            <h1 className="champ-hero-name">{champ.name}</h1>
            <p className="champ-hero-title">{champ.title}</p>
            <div className="champ-hero-tags">
              {champ.tags.map((t) => <span key={t} className="tag-badge">{t}</span>)}
            </div>
          </div>
        </div>

        <div className="champ-hero-stats">
          <div className="champ-stat-block">
            <div className="champ-stat-label">Win Rate</div>
            <div className="champ-stat-value" style={{ color: wrColor(winRate) }}>
              {winRate.toFixed(1)}%
            </div>
            <div className={`champ-stat-delta ${winRateDelta >= 0 ? "up" : "down"}`}>
              {winRateDelta >= 0 ? "↑" : "↓"} {Math.abs(winRateDelta)}% vs {buildData.prevPatch}
            </div>
          </div>
          <div className="champ-stat-block">
            <div className="champ-stat-label">Pick Rate</div>
            <div className="champ-stat-value">{pickRate.toFixed(1)}%</div>
            <div className={`champ-stat-delta ${pickRateDelta >= 0 ? "up" : "down"}`}>
              {pickRateDelta >= 0 ? "↑" : "↓"} {Math.abs(pickRateDelta)}%
            </div>
          </div>
          <div className="champ-stat-block">
            <div className="champ-stat-label">Ban Rate</div>
            <div className="champ-stat-value" style={{ color: banRate > 15 ? "#e84057" : "inherit" }}>
              {banRate.toFixed(1)}%
            </div>
            <div className="champ-stat-delta neutral">
              {buildData.totalGames.toLocaleString()} partidas
            </div>
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

// ── Build Tab ─────────────────────────────────────────────────────────────────

function BuildTab({ buildData }: { buildData: ChampionBuildData }) {
  const { summonerSpells, skillOrders, startingItems, boots, coreBuilds, fourthItems, fifthItems, sixthItems } = buildData;

  const ABILITY_COLORS: Record<string, string> = { Q: "#0ac8b9", W: "#c8aa6e", E: "#9faafc", R: "#e84057" };

  return (
    <div className="tab-content">
      {/* Summoner Spells */}
      <section className="build-section">
        <h3 className="build-section-title">Feitiços de Invocador</h3>
        <div className="spell-rows">
          {summonerSpells.map((set, i) => (
            <div key={i} className="spell-row">
              <div className="spell-icons">
                {set.spells.map((sp) => <SpellIcon key={sp} spell={sp} size={40} />)}
              </div>
              <div className="spell-names">
                {set.spells.join(" + ")}
              </div>
              <div className="spell-meta">
                <span className="pick-rate-badge">{set.pickRate}%</span>
                <WRBadge wr={set.winRate} />
                <span className="muted-sm">{set.sampleSize.toLocaleString()} partidas</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Order */}
      <section className="build-section">
        <h3 className="build-section-title">Ordem de Habilidades</h3>
        {skillOrders.map((so, idx) => (
          <div key={idx} className="skill-order-block">
            <div className="skill-order-summary">
              <div className="skill-max-order">
                {(["Q", "E", "W"] as const)
                  .filter((_x) => true)
                  .sort((a, b) => {
                    if (a === so.maxFirst) return -1;
                    if (b === so.maxFirst) return 1;
                    return 0;
                  })
                  .map((ab, i) => (
                    <span key={ab} className="skill-ab" style={{ background: ABILITY_COLORS[ab] + "22", color: ABILITY_COLORS[ab], border: `1px solid ${ABILITY_COLORS[ab]}55` }}>
                      {i > 0 && <span style={{ color: "var(--muted)", margin: "0 4px" }}>›</span>}
                      {ab}
                    </span>
                  ))}
              </div>
              <div className="skill-order-meta">
                <span className="pick-rate-badge">{so.pickRate}%</span>
                <WRBadge wr={so.winRate} />
                <span className="muted-sm">{so.sampleSize.toLocaleString()} partidas</span>
              </div>
            </div>
            <div className="skill-sequence">
              <div className="skill-seq-header">
                <div className="skill-seq-label">Nível</div>
                {Array.from({ length: 18 }, (_, i) => (
                  <div key={i} className="skill-seq-num">{i + 1}</div>
                ))}
              </div>
              {(["Q", "W", "E", "R"] as const).map((ab) => (
                <div key={ab} className="skill-seq-row">
                  <div className="skill-seq-label" style={{ color: ABILITY_COLORS[ab], fontWeight: 700 }}>{ab}</div>
                  {so.order.map((o, i) => (
                    <div
                      key={i}
                      className={`skill-seq-cell ${o === ab ? "active" : ""}`}
                      style={o === ab ? { background: ABILITY_COLORS[ab], color: "#000" } : {}}
                    >
                      {o === ab ? ab : ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Starting Items */}
      <section className="build-section">
        <h3 className="build-section-title">Itens Iniciais</h3>
        <ItemSetList sets={startingItems} />
      </section>

      {/* Boots */}
      <section className="build-section">
        <h3 className="build-section-title">Botas</h3>
        <ItemSetList sets={boots} />
      </section>

      {/* Core Builds */}
      <section className="build-section">
        <h3 className="build-section-title">Build Principal</h3>
        <ItemSetList sets={coreBuilds} showArrows />
      </section>

      {/* Situational Items */}
      <div className="situational-grid">
        <section className="build-section">
          <h3 className="build-section-title">4° Item</h3>
          <ItemSetList sets={fourthItems} compact />
        </section>
        <section className="build-section">
          <h3 className="build-section-title">5° Item</h3>
          <ItemSetList sets={fifthItems} compact />
        </section>
        <section className="build-section">
          <h3 className="build-section-title">6° Item</h3>
          <ItemSetList sets={sixthItems} compact />
        </section>
      </div>
    </div>
  );
}

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

// ── Counters Tab ──────────────────────────────────────────────────────────────

function CountersTab({ buildData, champName }: { buildData: ChampionBuildData; champName: string }) {
  const [selectedH2H, setSelectedH2H] = useState<CounterHeadToHead | null>(null);

  const h2hMap = useMemo(() => {
    const m: Record<string, CounterHeadToHead> = {};
    buildData.countersH2H.forEach((c) => { m[c.enemyChampId] = c; });
    return m;
  }, [buildData.countersH2H]);

  function selectCounter(m: MatchupEntry) {
    setSelectedH2H(h2hMap[m.champId] ?? null);
  }

  return (
    <div className="tab-content">
      {/* Head-to-head panel */}
      {selectedH2H && (
        <section className="build-section h2h-panel">
          <div className="h2h-header">
            <div className="h2h-champ">
              <ChampIcon champId={buildData.champId} size={48} />
              <span>{champName}</span>
            </div>
            <span className="h2h-vs">VS</span>
            <div className="h2h-champ">
              <ChampIcon champId={selectedH2H.enemyChampId} size={48} />
              <span>{selectedH2H.enemyChampName}</span>
            </div>
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
              ["Pick Rate", `${selectedH2H.ourPR}%`, `${selectedH2H.enemyPR}%`],
              ["Ban Rate", `${selectedH2H.ourBR}%`, `${selectedH2H.enemyBR}%`],
            ].map(([label, our, enemy]) => (
              <div key={label} className="h2h-row">
                <div className="h2h-our">{our}</div>
                <div className="h2h-label">{label}</div>
                <div className="h2h-enemy">{enemy}</div>
              </div>
            ))}
          </div>
          <div className="h2h-games">
            {selectedH2H.games.toLocaleString()} partidas analisadas
          </div>
          <button className="h2h-close" onClick={() => setSelectedH2H(null)}>Fechar</button>
        </section>
      )}

      <div className="counters-grid">
        {/* Hard Counters */}
        <section className="build-section">
          <h3 className="build-section-title" style={{ color: "#e84057" }}>Difíceis (Counters)</h3>
          <MatchupList
            matchups={buildData.hardCounters}
            champName={champName}
            onSelect={selectCounter}
            activeId={selectedH2H?.enemyChampId}
          />
        </section>

        {/* Easy matchups */}
        <section className="build-section">
          <h3 className="build-section-title" style={{ color: "#1a9e6e" }}>Favoráveis</h3>
          <MatchupList
            matchups={buildData.easyMatchups}
            champName={champName}
            onSelect={selectCounter}
            activeId={selectedH2H?.enemyChampId}
          />
        </section>
      </div>

      {/* Even matchups */}
      <section className="build-section">
        <h3 className="build-section-title">Matchups Equilibrados (48–52%)</h3>
        <div className="counters-table-wrap">
          <table className="counters-table">
            <thead>
              <tr><th>Campeão</th><th>Win Rate</th><th>Partidas</th></tr>
            </thead>
            <tbody>
              {buildData.evenMatchups.map((m) => (
                <tr key={m.champId}>
                  <td>
                    <button className="matchup-btn" onClick={() => selectCounter(m)}>
                      <ChampIcon champId={m.champId} size={24} />
                      <span>{m.champName}</span>
                    </button>
                  </td>
                  <td><WRBadge wr={m.winRate} /></td>
                  <td className="muted-sm">{m.games.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Community tips */}
      <section className="build-section">
        <h3 className="build-section-title">Dicas da Comunidade</h3>
        <p className="muted-sm" style={{ padding: "1rem" }}>
          Seja o primeiro a adicionar uma dica para este matchup. Em breve você poderá submeter suas próprias dicas!
        </p>
      </section>
    </div>
  );
}

function MatchupList({
  matchups,
  champName,
  onSelect,
  activeId,
}: {
  matchups: MatchupEntry[];
  champName: string;
  onSelect: (m: MatchupEntry) => void;
  activeId?: string;
}) {
  return (
    <div className="matchup-list">
      {matchups.map((m) => (
        <button
          key={m.champId}
          className={`matchup-row ${activeId === m.champId ? "active" : ""}`}
          onClick={() => onSelect(m)}
        >
          <ChampIcon champId={m.champId} size={30} />
          <span className="matchup-name">{m.champName}</span>
          <WRBadge wr={m.winRate} />
          <span className="muted-sm">{m.games.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

// ── Runas Tab ─────────────────────────────────────────────────────────────────

function RunasTab({ buildData }: { buildData: ChampionBuildData }) {
  return (
    <div className="tab-content">
      {buildData.runeSetups.map((setup, i) => (
        <RuneSetupCard key={i} setup={setup} index={i} totalGames={buildData.totalGames} />
      ))}

      {/* Shard guide */}
      <section className="build-section">
        <h3 className="build-section-title">Fragmentos de Runa Recomendados</h3>
        <div className="shards-grid">
          {[
            { label: "Ofensivo", value: "Força Adaptativa", note: "Para dano consistente" },
            { label: "Flexível", value: "Força Adaptativa", note: "Escalona com nível" },
            { label: "Defensivo", value: "Vida (escalonável)", note: "Para sobrevivência no late" },
          ].map((sh) => (
            <div key={sh.label} className="shard-card">
              <div className="shard-label">{sh.label}</div>
              <div className="shard-value">{sh.value}</div>
              <div className="muted-sm">{sh.note}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RuneSetupCard({ setup, index, totalGames }: { setup: RuneSetup; index: number; totalGames: number }) {
  const allSlots = [setup.keystone, setup.slot1, setup.slot2, setup.slot3];
  const secSlots = [setup.secondary1, setup.secondary2];

  return (
    <section className="build-section rune-setup-card">
      <div className="rune-setup-header">
        <h3 className="build-section-title" style={{ color: setup.primaryTreeColor }}>
          {index === 0 ? "Principal" : "Alternativa"}: {setup.primaryTree}
        </h3>
        <div className="rune-setup-meta">
          <span className="pick-rate-badge">{setup.pickRate}% pick rate</span>
          <WRBadge wr={setup.winRate} />
          <span className="muted-sm">{setup.sampleSize.toLocaleString()} partidas</span>
        </div>
      </div>

      <div className="rune-trees">
        <div className="rune-tree">
          <div className="rune-tree-title" style={{ color: setup.primaryTreeColor }}>
            Árvore Primária — {setup.primaryTree}
          </div>
          {allSlots.map((rune, si) => (
            <div key={si} className={`rune-slot-row ${si === 0 ? "keystone-row" : ""}`}>
              <RuneIcon path={rune.icon} size={si === 0 ? 44 : 32} />
              <div className="rune-slot-info">
                <div className="rune-name">{rune.name}</div>
                <div className="rune-stats">
                  <span className="pick-rate-badge">{rune.pickRate}%</span>
                  <WRBadge wr={rune.winRate} />
                </div>
              </div>
              {si === 0 && <div className="rune-best-badge">Mais Popular</div>}
            </div>
          ))}
        </div>

        <div className="rune-tree">
          <div className="rune-tree-title">Árvore Secundária — {setup.secondaryTree}</div>
          {secSlots.map((rune, si) => (
            <div key={si} className="rune-slot-row">
              <RuneIcon path={rune.icon} size={32} />
              <div className="rune-slot-info">
                <div className="rune-name">{rune.name}</div>
                <div className="rune-stats">
                  <span className="pick-rate-badge">{rune.pickRate}%</span>
                  <WRBadge wr={rune.winRate} />
                </div>
              </div>
            </div>
          ))}
          <div className="shards-mini">
            <span className="shard-pill">{setup.shard1}</span>
            <span className="shard-pill">{setup.shard2}</span>
            <span className="shard-pill">{setup.shard3}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Habilidades Tab ───────────────────────────────────────────────────────────

function HabilidadesTab({ detail, ddBase }: { detail: DDChampionFull | null; ddBase: string }) {
  if (!detail) {
    return (
      <div className="tab-content">
        <p className="muted-sm" style={{ padding: "2rem" }}>Dados de habilidades não disponíveis.</p>
      </div>
    );
  }

  const abilities = [
    { key: "P", name: detail.passive.name, desc: detail.passive.description, img: `${ddBase}/img/passive/${detail.passive.image.full}` },
    ...detail.spells.map((sp, i) => ({
      key: ["Q", "W", "E", "R"][i],
      name: sp.name,
      desc: sp.description.replace(/<[^>]+>/g, ""),
      img: `${ddBase}/img/spell/${sp.image.full}`,
    })),
  ];

  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Habilidades</h3>
        <div className="abilities-list">
          {abilities.map((ab) => (
            <div key={ab.key} className="ability-card">
              <div className="ability-header">
                <img src={ab.img} alt={ab.name} width={48} height={48} className="ability-icon" />
                <div>
                  <div className="ability-key">{ab.key}</div>
                  <div className="ability-name">{ab.name}</div>
                </div>
              </div>
              <p className="ability-desc">{ab.desc.slice(0, 300)}{ab.desc.length > 300 ? "…" : ""}</p>
            </div>
          ))}
        </div>
      </section>

      {detail.lore && (
        <section className="build-section">
          <h3 className="build-section-title">Lore</h3>
          <p className="lore-text">{detail.lore}</p>
        </section>
      )}
    </div>
  );
}

// ── Sinergias Tab ─────────────────────────────────────────────────────────────

function SinergiasTab({ buildData, champName }: { buildData: ChampionBuildData; champName: string }) {
  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Melhores Sinergias com {champName}</h3>
        <p className="muted-sm" style={{ marginBottom: "1rem" }}>
          Win rate quando ambos os campeões estão no mesmo time.
        </p>
        <div className="counters-table-wrap">
          <table className="counters-table">
            <thead>
              <tr>
                <th>Campeão</th>
                <th>Rota</th>
                <th>Pick Rate com {champName}</th>
                <th>Win Rate Juntos</th>
                <th>Partidas</th>
              </tr>
            </thead>
            <tbody>
              {buildData.synergies.map((s, i) => (
                <tr key={s.champId}>
                  <td>
                    <Link href={`/champion/${s.champId}`} className="matchup-btn" style={{ display: "flex", gap: 8, alignItems: "center", textDecoration: "none" }}>
                      <ChampIcon champId={s.champId} size={28} />
                      <span>{s.champName}</span>
                    </Link>
                  </td>
                  <td className="muted-sm">{s.role}</td>
                  <td className="muted-sm">{s.pickRate}%</td>
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

// ── Maestria Tab ──────────────────────────────────────────────────────────────

function MaestriaTab({ buildData }: { buildData: ChampionBuildData }) {
  const TIER_BADGE_COLOR: Record<string, string> = {
    Challenger: "#0ac8b9", "Grão-Mestre": "#e84057", Mestre: "#9faafc",
    Diamante: "#9faafc", Esmeralda: "#1a9e6e", Platina: "#c8aa6e",
  };

  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Top 10 Jogadores por Partidas — BR</h3>
        <p className="muted-sm" style={{ marginBottom: "1rem" }}>Patch atual · Atualização diária</p>
        <div className="mastery-list">
          {buildData.masteryRanking.map((entry, i) => (
            <div key={i} className="mastery-row">
              <div className="mastery-rank-num">#{i + 1}</div>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/profileicon/${entry.profileIconId}.png`}
                alt={entry.summonerName}
                width={36}
                height={36}
                className="champ-icon-round"
              />
              <div className="mastery-info">
                <Link
                  href={`/summoner/${encodeURIComponent(entry.summonerName + "#" + entry.tagLine)}`}
                  className="mastery-name"
                >
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

      {/* Skin ranking */}
      <section className="build-section">
        <h3 className="build-section-title">Skins Mais Usadas</h3>
        <div className="skin-ranking-list">
          {buildData.skinStats.map((s, i) => (
            <div key={s.skinId} className="skin-ranking-row">
              <div className="skin-rank-num">#{i + 1}</div>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${buildData.champId}_${s.skinNum}.jpg`}
                alt={s.skinName}
                width={40}
                height={67}
                className="skin-thumb-mini"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
              />
              <div className="skin-ranking-name">{s.skinName}</div>
              <div className="skin-ranking-bar-wrap">
                <div className="skin-ranking-bar" style={{ width: `${Math.min(s.usageRate * 2.5, 100)}%` }} />
              </div>
              <div className="skin-ranking-rate">{s.usageRate}%</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Dicas Tab ─────────────────────────────────────────────────────────────────

function DicasTab({ champName }: { champName: string }) {
  return (
    <div className="tab-content">
      <section className="build-section">
        <h3 className="build-section-title">Dicas da Comunidade para {champName}</h3>
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
          <p>Nenhuma dica enviada ainda. Seja o primeiro a contribuir!</p>
          <p className="muted-sm" style={{ marginTop: "0.5rem" }}>Em breve você poderá submeter dicas, estratégias e combos para a comunidade.</p>
        </div>
      </section>

      <section className="build-section">
        <h3 className="build-section-title">Dicas Gerais</h3>
        <div className="tips-list">
          {[
            `Use o combo Flash + R de ${champName} para surpreender inimigos fora de posição.`,
            "Guarde a habilidade de dash para escapar de CC, não apenas para engajar.",
            `${champName} é forte em split-push — aproveite janelas de 1v1 quando o inimigo não tem TP.`,
            "No teamfight, espere a frontline engajar antes de ir na backline.",
            "Compre Zhonya's contra composições com muito burst físico.",
          ].map((tip, i) => (
            <div key={i} className="tip-card">
              <span className="tip-icon">💡</span>
              <p>{tip}</p>
            </div>
          ))}
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
    } catch {
      setText("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open) load();
    setOpen(!open);
  }

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
          {loading && (
            <div className="ai-skeleton-wrap">
              {[120, 80, 100, 80, 100].map((h, i) => <Skeleton key={i} h={h} />)}
            </div>
          )}
          {!loading && sections.map((sec) => (
            <div key={sec.title} className="ai-section">
              <h4 className="ai-section-title">{sec.title}</h4>
              <div className="ai-section-body">
                {sec.body.split("\n").map((line, i) => {
                  const isBullet = line.trimStart().startsWith("-");
                  return isBullet
                    ? <li key={i} className="ai-bullet">{line.replace(/^[\s-]+/, "")}</li>
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

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  champ: DDChampion;
  detail: DDChampionFull | null;
  buildData: ChampionBuildData;
  allChampions: DDChampion[];
  ddBase: string;
  splashUrl: string;
}

export function ChampionPageClient({ champ, detail, buildData, allChampions, ddBase, splashUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Build");
  const [filters, setFilters] = useState({
    role: buildData.primaryRole,
    region: "BR",
    elo: "Platina-Esmeralda",
    mode: "Ranqueado Solo/Duo",
    patch: buildData.patch,
  });

  function handleFilter(key: string, val: string) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="champ-page">
      <ChampionHeader champ={champ} detail={detail} buildData={buildData} ddBase={ddBase} splashUrl={splashUrl} />

      <FilterBar filters={filters} onChange={handleFilter} />

      <div className="champ-page-inner">
        <AIAnalysis champId={champ.id} />

        {/* Tab navigation */}
        <div className="champ-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`champ-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Banner ad between AI analysis and tab content — igual OP.GG */}
        <AdBanner />

        {/* Tab content */}
        <div className="champ-tab-content">
          {activeTab === "Build" && <BuildTab buildData={buildData} />}
          {activeTab === "Counters" && <CountersTab buildData={buildData} champName={champ.name} />}
          {activeTab === "Runas" && <RunasTab buildData={buildData} />}
          {activeTab === "Habilidades" && <HabilidadesTab detail={detail} ddBase={ddBase} />}
          {activeTab === "Sinergias" && <SinergiasTab buildData={buildData} champName={champ.name} />}
          {activeTab === "Maestria" && <MaestriaTab buildData={buildData} />}
          {activeTab === "Dicas" && <DicasTab champName={champ.name} />}
        </div>
      </div>
    </div>
  );
}
