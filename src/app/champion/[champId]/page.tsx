import type { Metadata } from "next";
import { fetchChampions, fetchChampionDetail, mockTierStats, primaryRole, DD_BASE } from "@/lib/ddragon";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ champId: string }>;
}): Promise<Metadata> {
  const { champId } = await params;
  return {
    title: `${champId} — Max LoL`,
    description: `Estatísticas, builds e tier de ${champId} em League of Legends.`,
  };
}

export default async function ChampionPage({
  params,
}: {
  params: Promise<{ champId: string }>;
}) {
  const { champId } = await params;
  const champions = await fetchChampions();
  const champ = champions.find((c) => c.id === champId);
  if (!champ) notFound();

  const stats = mockTierStats(champ.id);
  const role = primaryRole(champ.tags);

  const TIER_COLORS: Record<string, string> = {
    S: "#c89b3c", A: "#51cf66", B: "#0ac8b9", C: "#adb5bd", D: "#ff6b6b",
  };

  const [allChampions, detail] = await Promise.all([
    fetchChampions(),
    fetchChampionDetail(champ.id),
  ]);
  const mockBuilds = [
    { name: "Ofensivo", items: ["Trinity Force", "Sterak's Gage", "Death's Dance", "Guardian Angel", "Plated Steelcaps", "Black Cleaver"], wr: 57.2, games: 1840 },
    { name: "Tank", items: ["Sunfire Aegis", "Heartsteel", "Warmog's Armor", "Force of Nature", "Plated Steelcaps", "Thornmail"], wr: 53.1, games: 920 },
  ];

  const mockRunes = [
    { name: "Grasp of the Undying", desc: "Primário — Resolve", wr: 56.4 },
    { name: "Conqueror", desc: "Primário — Precisão", wr: 54.1 },
  ];

  return (
    <main className="container">
      {/* Back */}
      <Link href="/tierlist" className="btn" style={{ marginBottom: "1.5rem", display: "inline-block" }}>
        ← Tier List
      </Link>

      {/* Header */}
      <div className="champ-header">
        <img
          src={`${DD_BASE}/img/champion/${champ.id}.png`}
          alt={champ.name}
          width={96}
          height={96}
          className="champ-big-icon"
        />
        <div>
          <h1 style={{ fontSize: "2rem" }}>{champ.name}</h1>
          <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>{champ.title}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {champ.tags.map((t) => (
              <span key={t} className="champ-tag">{t}</span>
            ))}
            <span className="champ-tag">{role}</span>
          </div>
        </div>
        <div
          className="champ-tier-badge"
          style={{ color: TIER_COLORS[stats.tier], borderColor: TIER_COLORS[stats.tier] + "55" }}
        >
          {stats.tier}
        </div>
      </div>

      {/* Stats */}
      <div className="champ-stats-grid">
        <div className="stat-card">
          <p className="stat-label">Win Rate</p>
          <p className="stat-value" style={{ color: stats.winRate >= 52 ? "#51cf66" : stats.winRate < 48 ? "#ff6b6b" : "var(--text)" }}>
            {stats.winRate}%
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pick Rate</p>
          <p className="stat-value">{stats.pickRate}%</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Ban Rate</p>
          <p className="stat-value">{stats.banRate}%</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Role Principal</p>
          <p className="stat-value">{role}</p>
        </div>
      </div>

      {/* Base stats */}
      <h2 className="section-title">Atributos base</h2>
      <div className="base-stats">
        {[
          { label: "HP", val: champ.stats.hp, max: 1200 },
          { label: "Ataque", val: champ.stats.attackdamage, max: 100 },
          { label: "Armadura", val: champ.stats.armor, max: 60 },
          { label: "Res. Mágica", val: champ.stats.spellblock, max: 60 },
          { label: "Vel. Ataque", val: +(champ.stats.attackspeed * 100).toFixed(0), max: 100 },
        ].map(({ label, val, max }) => (
          <div key={label} className="base-stat-row">
            <span className="base-stat-label">{label}</span>
            <div className="base-stat-bar-bg">
              <div
                className="base-stat-bar-fill"
                style={{ width: `${Math.min((val / max) * 100, 100)}%` }}
              />
            </div>
            <span className="base-stat-val">{val}</span>
          </div>
        ))}
      </div>

      {/* Builds */}
      <h2 className="section-title">Builds mais usadas</h2>
      <div className="builds-grid">
        {mockBuilds.map((b) => (
          <div key={b.name} className="build-card">
            <div className="build-header">
              <p className="build-name">{b.name}</p>
              <div>
                <span className="build-wr">{b.wr}% WR</span>
                <span className="build-games"> · {b.games.toLocaleString()} jogos</span>
              </div>
            </div>
            <div className="build-items">
              {b.items.map((item) => (
                <div key={item} className="build-item-chip">{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Runas */}
      <h2 className="section-title">Runas recomendadas</h2>
      <div className="runes-grid">
        {mockRunes.map((r) => (
          <div key={r.name} className="rune-card">
            <p className="rune-name">{r.name}</p>
            <p className="rune-desc">{r.desc}</p>
            <p className="rune-wr">{r.wr}% WR</p>
          </div>
        ))}
      </div>

      {/* Lore */}
      {detail?.lore && (
        <>
          <h2 className="section-title">Lore</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.8, maxWidth: 720, marginBottom: "1rem" }}>
            {detail.lore}
          </p>
        </>
      )}

      {/* Habilidades */}
      {detail?.spells && (
        <>
          <h2 className="section-title">Habilidades</h2>
          <div className="spells-grid">
            {/* Passiva */}
            <div className="spell-card">
              <img
                src={`${DD_BASE}/img/passive/${detail.passive.image.full}`}
                alt={detail.passive.name}
                width={48} height={48}
                className="spell-icon"
              />
              <div>
                <p className="spell-key">Passiva</p>
                <p className="spell-name">{detail.passive.name}</p>
                <p className="spell-desc"
                  dangerouslySetInnerHTML={{ __html: detail.passive.description.replace(/<[^>]+>/g, " ").slice(0, 120) + "…" }}
                />
              </div>
            </div>
            {detail.spells.slice(0, 4).map((sp, i) => (
              <div key={sp.id} className="spell-card">
                <img
                  src={`${DD_BASE}/img/spell/${sp.image.full}`}
                  alt={sp.name}
                  width={48} height={48}
                  className="spell-icon"
                />
                <div>
                  <p className="spell-key">{["Q","W","E","R"][i]}</p>
                  <p className="spell-name">{sp.name}</p>
                  <p className="spell-desc">
                    {sp.description.replace(/<[^>]+>/g, " ").slice(0, 120)}…
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Matchups */}
      <h2 className="section-title">Matchups — Melhores vs Piores</h2>
      <div className="matchups-grid">
        <div className="matchup-col">
          <h3 className="matchup-col-title good">Favoráveis</h3>
          {generateMatchups(champ.id, allChampions, "good").map((m) => (
            <Link key={m.id} href={`/champion/${m.id}`} className="matchup-row">
              <img src={`${DD_BASE}/img/champion/${m.id}.png`} alt={m.name} width={32} height={32} className="matchup-icon" />
              <span className="matchup-name">{m.name}</span>
              <span className="matchup-wr good">{m.wr}% WR</span>
            </Link>
          ))}
        </div>
        <div className="matchup-col">
          <h3 className="matchup-col-title bad">Difíceis</h3>
          {generateMatchups(champ.id, allChampions, "bad").map((m) => (
            <Link key={m.id} href={`/champion/${m.id}`} className="matchup-row">
              <img src={`${DD_BASE}/img/champion/${m.id}.png`} alt={m.name} width={32} height={32} className="matchup-icon" />
              <span className="matchup-name">{m.name}</span>
              <span className="matchup-wr bad">{m.wr}% WR</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="disclaimer" style={{ marginTop: "2.5rem" }}>
        Builds, runas e matchups são representativos. Dados reais serão calculados a partir de partidas coletadas com a Production API Key.
      </p>
    </main>
  );
}

function generateMatchups(
  champId: string,
  all: import("@/lib/ddragon").DDChampion[],
  type: "good" | "bad"
) {
  // Gera matchups determinísticos a partir dos IDs dos dois campeões
  let h = 0;
  for (const c of champId) h = (h * 31 + c.charCodeAt(0)) >>> 0;

  const pool = all
    .filter((c) => c.id !== champId)
    .map((c) => {
      let seed = h;
      for (const ch of c.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const wr = type === "good"
        ? 55 + (seed % 1200) / 100
        : 36 + (seed % 1200) / 100;
      return { id: c.id, name: c.name, wr: +wr.toFixed(1), seed };
    })
    .sort((a, b) => type === "good" ? b.wr - a.wr : a.wr - b.wr)
    .slice(0, 5);

  return pool;
}
