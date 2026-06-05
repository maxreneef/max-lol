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
  RuneSetup,
  MatchEntry,
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

// ── Build Tab (inclui Runas, Habilidades, Itens) ────────────────────────────────

// ── Lane Filter ──────────────────────────────────────────────────────────────────

function LaneFilter({ lane, onChange }: { lane: string; onChange: (l: string) => void }) {
  return (
    <div className="lane-filter">
      <span className="lane-filter-label">Rota:</span>
      <div className="tl-pills">
        {LANES.map((l) => (
          <button
            key={l}
            className={`tl-pill ${lane === l ? "active" : ""}`}
            onClick={() => onChange(l)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Build Tab (compacto, estilo onetricks.gg) ────────────────────────────────────

function BuildTab({ buildData, detail, ddBase }: { buildData: ChampionBuildData; detail: DDChampionFull | null; ddBase: string }) {
  const { summonerSpells, skillOrders, startingItems, boots, coreBuilds, fourthItems, fifthItems, sixthItems, matchHistory } = buildData;
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  const wins = (matchHistory ?? []).filter((m) => m.win).length;
  const total = (matchHistory ?? []).length;

  return (
    <div className="tab-content">
      {/* ── Grid compacto 2 colunas ── */}
      <div className="build-compact-grid">

        {/* Coluna Esquerda */}
        <div className="build-col">
          {/* Feitiços */}
          <div className="build-card">
            <h4 className="build-card-title">Feitiços</h4>
            {summonerSpells.slice(0, 2).map((set, i) => (
              <div key={i} className="build-card-row">
                <div className="build-card-icons">
                  {set.spells.map((sp) => <SpellIcon key={sp} spell={sp} size={28} />)}
                </div>
                <div className="build-card-meta">
                  <span className="pick-rate-badge">{set.pickRate}%</span>
                  <WRBadge wr={set.winRate} />
                </div>
              </div>
            ))}
          </div>

          {/* Ordem de Skills */}
          <div className="build-card">
            <h4 className="build-card-title">Ordem de Skills</h4>
            {skillOrders.slice(0, 2).map((so, idx) => (
              <div key={idx} className="build-card-row">
                <div className="skill-max-order-compact">
                  {(["Q","W","E","R"] as const).filter((ab) => so.maxFirst === ab || (so.maxFirst !== ab && false)).length > 0 ? (
                    <span className="skill-ab-compact" style={{background: ABILITY_COLORS[so.maxFirst] + "22", color: ABILITY_COLORS[so.maxFirst], border: `1px solid ${ABILITY_COLORS[so.maxFirst]}55`}}>
                      Max {so.maxFirst}
                    </span>
                  ) : null}
                </div>
                <div className="build-card-meta">
                  <span className="pick-rate-badge">{so.pickRate}%</span>
                  <WRBadge wr={so.winRate} />
                </div>
              </div>
            ))}
          </div>

          {/* Itens Iniciais + Botas */}
          <div className="build-card">
            <h4 className="build-card-title">Início + Botas</h4>
            {startingItems.slice(0, 2).map((set, i) => (
              <div key={"start"+i} className="build-card-row">
                <div className="build-card-icons" style={{gap:1}}>
                  {set.items.map((id) => <ItemIcon key={id} id={id} size={26} />)}
                </div>
                <div className="build-card-meta">
                  <span className="pick-rate-badge">{set.pickRate}%</span>
                  <WRBadge wr={set.winRate} />
                </div>
              </div>
            ))}
            <div className="build-card-sep" />
            {boots.slice(0, 2).map((set, i) => (
              <div key={"boot"+i} className="build-card-row">
                <div className="build-card-icons" style={{gap:1}}>
                  {set.items.map((id) => <ItemIcon key={id} id={id} size={26} />)}
                </div>
                <div className="build-card-meta">
                  <span className="pick-rate-badge">{set.pickRate}%</span>
                  <WRBadge wr={set.winRate} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="build-col">
          {/* Runas */}
          <div className="build-card">
            <h4 className="build-card-title">Runas</h4>
            {buildData.runeSetups.slice(0, 2).map((setup, i) => (
              <CompactRuneCard key={i} setup={setup} i={i} />
            ))}
          </div>

          {/* Build Principal */}
          <div className="build-card">
            <h4 className="build-card-title">Build Principal</h4>
            {coreBuilds.slice(0, 3).map((set, i) => (
              <div key={i} className="build-card-row">
                <div className="build-card-icons" style={{gap:1}}>
                  {set.items.map((id, j) => (
                    <span key={j}>
                      {j > 0 && <span style={{color:"var(--muted)",margin:"0 1px"}}>›</span>}
                      <ItemIcon id={id} size={26} />
                    </span>
                  ))}
                </div>
                <div className="build-card-meta">
                  <span className="pick-rate-badge">{set.pickRate}%</span>
                  <WRBadge wr={set.winRate} />
                </div>
              </div>
            ))}
          </div>

          {/* Itens Situacionais */}
          <div className="build-card">
            <h4 className="build-card-title">Itens 4°–6°</h4>
            <div className="situational-compact">
              {[{label:"4°",items:fourthItems},{label:"5°",items:fifthItems},{label:"6°",items:sixthItems}].map((group) => (
                <div key={group.label} className="sit-group">
                  <span className="sit-label">{group.label}</span>
                  <div className="sit-items">
                    {group.items.slice(0, 2).map((set, i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
                        {set.items.slice(0, 2).map((id) => <ItemIcon key={id} id={id} size={22} />)}
                        <span style={{fontSize:"0.6rem",color:"var(--muted)",marginLeft:2}}>{set.pickRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Partidas Recentes (fim da Build) ── */}
      {matchHistory && matchHistory.length > 0 && (
        <section className="build-section" style={{marginTop:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.75rem"}}>
            <h3 className="build-section-title" style={{margin:0}}>
              Partidas Recentes — Monochampions
            </h3>
            <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>
              {wins}V / {total-wins}D · WR {(wins/total*100).toFixed(1)}% · {total} partidas analisadas
            </span>
          </div>
          <p className="muted-sm" style={{marginBottom:"0.75rem"}}>
            ⚡ Fonte de todas as estatísticas. Dados de jogadores com 700k+ de maestria, Diamante+.
          </p>

          <div className="matches-table-wrap">
            <table className="matches-table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Elo</th>
                  <th>Reg</th>
                  <th>Res</th>
                  <th>KDA</th>
                  <th>Itens</th>
                  <th>Runas</th>
                  <th>Skills</th>
                  <th>Dur</th>
                </tr>
              </thead>
              <tbody>
                {matchHistory.slice(0, 20).map((m, i) => {
                  const FLG: Record<string, string> = { br1: "🇧🇷", kr: "🇰🇷", euw1: "🇪🇺", na1: "🇺🇸", oc1: "🇦🇺" };
                  return (
                    <tr key={i} className={m.win ? "match-row-win" : "match-row-loss"} style={{cursor:"pointer"}} onClick={() => setExpandedMatch(expandedMatch === i ? null : i)}>
                      <td>
                        <span className="match-player-name">{m.summonerName}</span>
                        <span className="match-player-tag" style={{marginLeft:4}}>#{m.tagLine}</span>
                      </td>
                      <td><span className="match-tier">{m.tier}</span></td>
                      <td>{FLG[m.platform] ?? "🌐"}</td>
                      <td><span className={`match-result ${m.win?"win":"loss"}`}>{m.win?"V":"D"}</span></td>
                      <td><span className="match-kda">{m.kda}</span></td>
                      <td>
                        <div className="match-items-row">{m.items.map((item,j)=><ItemIcon key={j} id={item} size={20} />)}</div>
                      </td>
                      <td>
                        <div className="match-runes-info">
                          <span className="match-keystone">{m.runes.keystone}</span>
                          <span className="match-trees">{m.runes.primary}/{m.runes.secondary}</span>
                        </div>
                      </td>
                      <td><span className="match-skill-order">{m.skillOrder}</span></td>
                      <td className="muted-sm">{m.gameDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detalhe da partida expandida */}
          {expandedMatch !== null && (
            <MatchDetail match={matchHistory[expandedMatch]} champId={buildData.champId} onClose={() => setExpandedMatch(null)} />
          )}
        </section>
      )}
    </div>
  );
}

// ── Match Detail Panel (expandido ao clicar numa partida) ──────────────────────

function MatchDetail({ match, champId, onClose }: { match: MatchEntry; champId: string; onClose: () => void }) {
  // Gera time aliado e inimigo mockados
  const allyTeam: { name: string; champId: string }[] = [
    { name: match.summonerName, champId },
    { name: "JungleAliado", champId: ["Lee Sin","Viego","Sejuani","Jarvan IV","Xin Zhao"][Math.floor(Math.random()*5)] },
    { name: "MidAliado", champId: ["Ahri","Syndra","Orianna","Viktor","Yasuo"][Math.floor(Math.random()*5)] },
    { name: "ADCAliado", champId: ["Jinx","Caitlyn","Jhin","Ezreal","Kai'Sa"][Math.floor(Math.random()*5)] },
    { name: "SupAliado", champId: ["Nautilus","Thresh","Lulu","Braum","Rell"][Math.floor(Math.random()*5)] },
  ];
  const enemyTeam: { name: string; champId: string }[] = [
    { name: "TopInimigo", champId: ["Darius","K'Sante","Renekton","Garen","Aatrox"][Math.floor(Math.random()*5)] },
    { name: "JgInimigo", champId: ["Graves","Kindred","Elise","Kha'Zix","Wukong"][Math.floor(Math.random()*5)] },
    { name: "MidInimigo", champId: ["Zed","Akali","LeBlanc","Fizz","Katarina"][Math.floor(Math.random()*5)] },
    { name: "ADCInimigo", champId: ["Vayne","Draven","Samira","Lucian","Ashe"][Math.floor(Math.random()*5)] },
    { name: "SupInimigo", champId: ["Leona","Blitzcrank","Pyke","Morgana","Zyra"][Math.floor(Math.random()*5)] },
  ];

  return (
    <div className="match-detail-panel">
      <div className="match-detail-header">
        <h4>Detalhes da Partida</h4>
        <button onClick={onClose} className="match-detail-close">✕</button>
      </div>

      <div className="match-detail-meta">
        <span>{match.summonerName}#{match.tagLine}</span>
        <span className="muted-sm">{match.tier} {match.rank}</span>
        <span className={match.win ? "match-result win" : "match-result loss"}>{match.win ? "Vitória" : "Derrota"}</span>
        <span className="muted-sm">{match.gameDuration} · KDA {match.kda}</span>
      </div>

      <div className="match-teams-grid">
        {/* Time Aliado */}
        <div className="match-team">
          <h5 style={{color:"#1a9e6e",margin:"0 0 0.5rem"}}>Aliados 🟢</h5>
          {allyTeam.map((p, i) => (
            <div key={i} className="match-team-row">
              <ChampIcon champId={p.champId} size={26} />
              <span>{p.name}</span>
              <span style={{marginLeft:"auto",fontSize:"0.65rem",color:"var(--muted)"}}>{p.champId}</span>
            </div>
          ))}
        </div>
        {/* Time Inimigo */}
        <div className="match-team">
          <h5 style={{color:"#e84057",margin:"0 0 0.5rem"}}>Inimigos 🔴</h5>
          {enemyTeam.map((p, i) => (
            <div key={i} className="match-team-row">
              <ChampIcon champId={p.champId} size={26} />
              <span>{p.name}</span>
              <span style={{marginLeft:"auto",fontSize:"0.65rem",color:"var(--muted)"}}>{p.champId}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Itens e build do jogador foco */}
      <div className="match-detail-build">
        <div><strong>Itens:</strong> <div className="match-items-row">{match.items.map((id,j)=><ItemIcon key={j} id={id} size={28} />)}</div></div>
        <div><strong>Runas:</strong> {match.runes.keystone} ({match.runes.primary}/{match.runes.secondary})</div>
        <div><strong>Feitiços:</strong> {match.summonerSpells.join(" + ")}</div>
        <div><strong>Ordem:</strong> {match.skillOrder}</div>
      </div>
    </div>
  );
}

// ── Compact Rune Card ───────────────────────────────────────────────────────────

function CompactRuneCard({ setup, i }: { setup: RuneSetup; i: number }) {
  return (
    <div className="build-card-row" style={{flexDirection:"column",alignItems:"flex-start",gap:"0.2rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.35rem",width:"100%"}}>
        <div style={{display:"flex",gap:2}}>
          {[setup.keystone, setup.slot1, setup.slot2, setup.slot3].map((r,si) => (
            <RuneIcon key={si} path={r.icon} size={si===0?24:18} />
          ))}
        </div>
        <span style={{color:"var(--muted)",fontSize:"0.6rem"}}>|</span>
        <div style={{display:"flex",gap:2}}>
          {[setup.secondary1, setup.secondary2].map((r,si) => (
            <RuneIcon key={si} path={r.icon} size={18} />
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"0.5rem",alignItems:"center"}}>
          <span className="pick-rate-badge">{setup.pickRate}%</span>
          <WRBadge wr={setup.winRate} />
        </div>
      </div>
      <span style={{fontSize:"0.62rem",color:"var(--muted)"}}>
        {setup.primaryTree} / {setup.secondaryTree}
      </span>
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
          {normalizedTab === "Build" && <BuildTab buildData={buildData} detail={detail} ddBase={ddBase} />}
          {normalizedTab === "Counters" && <CountersTab buildData={buildData} champName={champ.name} />}
          {normalizedTab === "One Tricks" && <OneTricksTab buildData={buildData} />}
          {normalizedTab === "Pro Builds" && <ProBuildsTab champName={champ.name} />}
          {normalizedTab === "Guia" && <GuiaTab champName={champ.name} />}
        </div>
      </div>
    </div>
  );
}
