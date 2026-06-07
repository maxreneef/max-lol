"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useState, useMemo } from "react";

const DD = DD_BASE;

// ── Valores base de ouro por unidade de stat (Patch 15.11) ──────────────
// Calculados a partir dos itens de componente básicos da Riot:
const GOLD_PER_STAT: Record<string, number> = {
  FlatPhysicalDamageMod:     35.00,   // Long Sword: 350g / 10 AD
  FlatSpellBlockMod:         18.00,   // Null-Magic Mantle: 450g / 25 MR
  FlatArmorMod:              20.00,   // Cloth Armor: 300g / 15 armor
  FlatHPPoolMod:              2.67,   // Ruby Crystal: 400g / 150 HP
  FlatMPPoolMod:              1.17,   // Sapphire Crystal: 350g / 300 mana
  PercentAttackSpeedMod:    300.00,   // Dagger: 300g / 12% AS (por unidade decimal = *100)
  FlatCritChanceMod:       5333.33,   // Cloak of Agility: 800g / 15% = 53.33g/% → por decimal
  PercentLifeStealMod:     4667.00,   // Vampiric Scepter: 900g / 15% = 60g/% → por decimal
  FlatMagicDamageMod:        21.33,   // Amplifying Tome: 435g / 20 AP
  FlatHPRegenMod:            17.14,   // ~ estimado
  FlatMPRegenMod:            11.00,   // ~ estimado
  FlatMovementSpeedMod:       9.50,   // ~ estimado
};

function computeGoldEfficiency(
  stats: Record<string, number>,
  totalCost: number
): { statValue: number; efficiency: number } | null {
  if (totalCost <= 0) return null;
  let statValue = 0;
  let hasKnown = false;

  for (const [key, val] of Object.entries(stats)) {
    const gpUnit = GOLD_PER_STAT[key];
    if (!gpUnit) continue;
    statValue += gpUnit * val;
    hasKnown = true;
  }

  if (!hasKnown || statValue === 0) return null;
  return {
    statValue: Math.round(statValue),
    efficiency: Math.round((statValue / totalCost) * 100),
  };
}

function efficiencyColor(pct: number): string {
  if (pct >= 120) return "#51cf66";
  if (pct >= 100) return "#0ac8b9";
  if (pct >= 80)  return "var(--text)";
  return "#ff6b6b";
}

function efficiencyLabel(pct: number): string {
  if (pct >= 130) return "Extremamente eficiente";
  if (pct >= 110) return "Muito eficiente";
  if (pct >= 100) return "Eficiente";
  if (pct >= 85)  return "Razoável";
  return "Ineficiente (passiva/ativa compensam)";
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const ALL_TAGS = [
  "Damage", "CriticalStrike", "AttackSpeed", "LifeSteal", "Armor", "SpellBlock",
  "Health", "Mana", "CooldownReduction", "AbilityHaste", "SpellDamage",
  "ManaRegen", "HealthRegen", "Tenacity", "NonbootsMovement", "Boots", "Lane", "Jungle", "Vision",
];

export interface ItemData {
  id: string;
  name: string;
  description: string;
  gold: { base: number; total: number; sell: number; purchasable?: boolean };
  tags: string[];
  image: { full: string };
  stats: Record<string, number>;
  from?: string[];
  into?: string[];
  depth?: number;
}

interface Props {
  items: ItemData[];
  itemMap: Record<string, ItemData>;
}

export function ItemsClient({ items, itemMap }: Props) {
  const [search, setSearch]   = useState("");
  const [tag, setTag]         = useState("Todos");
  const [sort, setSort]       = useState<"total" | "base" | "efficiency" | "name">("total");
  const [selected, setSelected] = useState<ItemData | null>(null);

  const usedTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return ["Todos", ...ALL_TAGS.filter((t) => set.has(t))];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (tag !== "Todos") result = result.filter((i) => i.tags.includes(tag));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sort === "name")  return a.name.localeCompare(b.name);
      if (sort === "base")  return b.gold.base - a.gold.base;
      if (sort === "efficiency") {
        const ea = computeGoldEfficiency(a.stats, a.gold.total)?.efficiency ?? 0;
        const eb = computeGoldEfficiency(b.stats, b.gold.total)?.efficiency ?? 0;
        return eb - ea;
      }
      return b.gold.total - a.gold.total;
    });
  }, [items, tag, search, sort]);

  const efficiency = selected ? computeGoldEfficiency(selected.stats, selected.gold.total) : null;

  return (
    <div className="items-layout">
      {/* Filtros */}
      <div className="tl-filters">
        <input type="text" placeholder="Buscar item..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="tl-search" />
        <div className="tl-pills" style={{ flexWrap: "wrap" }}>
          {usedTags.map((t) => (
            <button key={t} className={`tl-pill ${tag === t ? "active" : ""}`} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="tl-sort">
          <option value="total">Custo total</option>
          <option value="base">Custo base</option>
          <option value="efficiency">Eficiência de ouro</option>
          <option value="name">Nome</option>
        </select>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {filtered.length} itens {sort === "efficiency" ? "— ordenados por eficiência de ouro" : ""}
      </p>

      <div className="items-main">
        {/* Grid */}
        <div className="items-grid">
          {filtered.map((item) => {
            const eff = computeGoldEfficiency(item.stats, item.gold.total);
            return (
              <button key={item.id}
                className={`item-card ${selected?.id === item.id ? "item-selected" : ""}`}
                onClick={() => setSelected(item)} title={item.name}
              >
                <img src={`${DD}/img/item/${item.image.full}`} alt={item.name}
                  width={48} height={48} className="item-grid-icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <p className="item-grid-name">{item.name}</p>
                <p className="item-grid-cost">{item.gold.total}g</p>
                {eff && (
                  <p className="item-grid-eff" style={{ color: efficiencyColor(eff.efficiency) }}>
                    {eff.efficiency}%
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="item-detail-panel">
            {/* Header */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" }}>
              <img src={`${DD}/img/item/${selected.image.full}`} alt={selected.name}
                width={72} height={72}
                style={{ borderRadius: 10, border: "1px solid var(--border)", flexShrink: 0 }}
              />
              <div>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{selected.name}</h2>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#c89b3c", fontWeight: 700 }}>{selected.gold.total}g total</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Base: {selected.gold.base}g</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Venda: {selected.gold.sell}g</span>
                </div>
              </div>
            </div>

            {/* Eficiência de ouro */}
            {efficiency && (
              <div className="item-efficiency">
                <div className="item-eff-header">
                  <p className="item-eff-title">Eficiência de ouro</p>
                  <span className="item-eff-pct" style={{ color: efficiencyColor(efficiency.efficiency) }}>
                    {efficiency.efficiency}%
                  </span>
                </div>
                <div className="item-eff-bar-bg">
                  <div className="item-eff-bar-fill"
                    style={{
                      width: `${Math.min(efficiency.efficiency, 150)}%`,
                      background: efficiencyColor(efficiency.efficiency),
                    }}
                  />
                  {/* Linha de 100% */}
                  <div className="item-eff-baseline" style={{ left: `${(100 / 150) * 100}%` }} />
                </div>
                <p className="item-eff-label" style={{ color: efficiencyColor(efficiency.efficiency) }}>
                  {efficiencyLabel(efficiency.efficiency)}
                </p>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
                  Valor estatístico: {efficiency.statValue}g
                  {efficiency.efficiency < 100 && " — a diferença é coberta por passivas/ativas"}
                </p>
              </div>
            )}

            {/* Stats */}
            {Object.entries(selected.stats).length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Stats</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {Object.entries(selected.stats).map(([k, v]) => {
                    const gpUnit = GOLD_PER_STAT[k];
                    const goldVal = gpUnit ? Math.round(gpUnit * v) : null;
                    return (
                      <div key={k} className="item-stat-chip">
                        <span style={{ color: "var(--accent-2)" }}>+{v} {k.replace(/^Flat|PerLevel|Mod$/, "").replace(/([A-Z])/g, " $1").trim()}</span>
                        {goldVal && <span className="item-stat-gold">≈ {goldVal}g</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Receita */}
            {selected.from && selected.from.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Receita ({selected.gold.base}g + componentes)
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                  {selected.from.map((compId, idx) => {
                    const comp = itemMap[compId];
                    if (!comp) return null;
                    return (
                      <div key={idx} className="recipe-item" onClick={() => setSelected(comp)} title={`${comp.name} — ${comp.gold.total}g`}>
                        <img src={`${DD}/img/item/${comp.image.full}`} alt={comp.name}
                          width={36} height={36} className="recipe-icon"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="recipe-cost">{comp.gold.total}g</span>
                      </div>
                    );
                  })}
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    + {selected.gold.base}g = {selected.gold.total}g
                  </span>
                </div>
              </div>
            )}

            {/* Constrói em */}
            {selected.into && selected.into.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Constrói em
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {selected.into.slice(0, 8).map((intoId) => {
                    const intoItem = itemMap[intoId];
                    if (!intoItem) return null;
                    return (
                      <div key={intoId} className="recipe-item" onClick={() => setSelected(intoItem)} title={`${intoItem.name} — ${intoItem.gold.total}g`}>
                        <img src={`${DD}/img/item/${intoItem.image.full}`} alt={intoItem.name}
                          width={36} height={36} className="recipe-icon"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="recipe-cost">{intoItem.gold.total}g</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Descrição */}
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              {stripHtml(selected.description).slice(0, 300)}
              {selected.description.length > 300 ? "…" : ""}
            </p>

            {selected.tags.length > 0 && (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                {selected.tags.map((t) => <span key={t} className="champ-tag">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
