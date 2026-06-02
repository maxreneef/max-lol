"use client";

import { useState, useMemo } from "react";

const DD = "https://ddragon.leagueoflegends.com/cdn/15.11.1";

const ALL_TAGS = ["Damage", "CriticalStrike", "AttackSpeed", "LifeSteal", "Armor", "SpellBlock",
  "Health", "Mana", "CooldownReduction", "AbilityHaste", "SpellDamage", "ManaRegen", "HealthRegen",
  "Tenacity", "NonbootsMovement", "Boots", "Lane", "Jungle", "Vision"];

interface Item {
  id: string;
  name: string;
  description: string;
  gold: { base: number; total: number; sell: number };
  tags: string[];
  image: { full: string };
  stats: Record<string, number>;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function ItemsClient({ items }: { items: Item[] }) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("Todos");
  const [sort, setSort] = useState<"total" | "base" | "name">("total");
  const [selected, setSelected] = useState<Item | null>(null);

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
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "base") return b.gold.base - a.gold.base;
      return b.gold.total - a.gold.total;
    });
  }, [items, tag, search, sort]);

  return (
    <div className="items-layout">
      {/* Filtros */}
      <div className="tl-filters">
        <input
          type="text"
          placeholder="Buscar item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tl-search"
        />
        <div className="tl-pills" style={{ flexWrap: "wrap" }}>
          {usedTags.map((t) => (
            <button key={t} className={`tl-pill ${tag === t ? "active" : ""}`} onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="tl-sort">
          <option value="total">Custo total</option>
          <option value="base">Custo base</option>
          <option value="name">Nome</option>
        </select>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {filtered.length} itens
      </p>

      <div className="items-main">
        {/* Grid */}
        <div className="items-grid">
          {filtered.map((item) => (
            <button
              key={item.id}
              className={`item-card ${selected?.id === item.id ? "item-selected" : ""}`}
              onClick={() => setSelected(item)}
              title={item.name}
            >
              <img
                src={`${DD}/img/item/${item.image.full}`}
                alt={item.name}
                width={48} height={48}
                className="item-grid-icon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="item-grid-name">{item.name}</p>
              <p className="item-grid-cost">{item.gold.total}g</p>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="item-detail-panel">
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" }}>
              <img
                src={`${DD}/img/item/${selected.image.full}`}
                alt={selected.name}
                width={72} height={72}
                style={{ borderRadius: 10, border: "1px solid var(--border)" }}
              />
              <div>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{selected.name}</h2>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#c89b3c", fontWeight: 700 }}>{selected.gold.total}g total</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Base: {selected.gold.base}g</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Venda: {selected.gold.sell}g</span>
                </div>
              </div>
            </div>

            {Object.entries(selected.stats).length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Stats</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {Object.entries(selected.stats).map(([k, v]) => (
                    <span key={k} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0.15rem 0.55rem", fontSize: "0.82rem" }}>
                      +{v} {k.replace(/^Flat|PerLevel|Mod/, "").replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              {stripHtml(selected.description).slice(0, 400)}
              {selected.description.length > 400 ? "…" : ""}
            </p>

            {selected.tags.length > 0 && (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                {selected.tags.map((t) => (
                  <span key={t} className="champ-tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
