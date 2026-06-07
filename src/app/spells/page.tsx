"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageWithAds } from "@/components/PageWithAds";
import { AdBanner } from "@/components/AdUnit";

const DD = DD_BASE;

interface Spell {
  id: string;
  name: string;
  description: string;
  image: { full: string };
}

interface ChampData {
  id: string;
  name: string;
  passive: { name: string; description: string; image: { full: string } };
  spells: Spell[];
}

interface SpellResult {
  champId: string;
  champName: string;
  spellKey: string;
  spellName: string;
  description: string;
  iconUrl: string;
}

export default function SpellsPage() {
  const [search, setSearch] = useState("");
  const [champions, setChampions] = useState<ChampData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load champion list then fetch each detail
    fetch(`${DD}/data/pt_BR/champion.json`)
      .then((r) => r.json())
      .then(async (json) => {
        const ids = Object.keys(json.data).slice(0, 170); // todos
        const details: ChampData[] = [];
        // Fetch em paralelo com limite
        const chunks = [];
        for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
        for (const chunk of chunks) {
          const results = await Promise.all(
            chunk.map((id) =>
              fetch(`${DD}/data/pt_BR/champion/${id}.json`)
                .then((r) => r.json())
                .then((d) => d.data[id] as ChampData)
                .catch(() => null)
            )
          );
          details.push(...results.filter(Boolean) as ChampData[]);
        }
        setChampions(details);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo<SpellResult[]>(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    const out: SpellResult[] = [];
    for (const c of champions) {
      const keys = ["P", "Q", "W", "E", "R"];
      const all = [
        { key: "P", name: c.passive.name, desc: c.passive.description, icon: `${DD}/img/passive/${c.passive.image.full}` },
        ...c.spells.slice(0, 4).map((s, i) => ({
          key: keys[i + 1],
          name: s.name,
          desc: s.description,
          icon: `${DD}/img/spell/${s.image.full}`,
        })),
      ];
      for (const sp of all) {
        const cleanDesc = sp.desc.replace(/<[^>]+>/g, " ").toLowerCase();
        if (sp.name.toLowerCase().includes(q) || cleanDesc.includes(q)) {
          out.push({
            champId: c.id,
            champName: c.name,
            spellKey: sp.key,
            spellName: sp.name,
            description: sp.desc.replace(/<[^>]+>/g, " ").slice(0, 120),
            iconUrl: sp.icon,
          });
        }
      }
    }
    return out.slice(0, 30);
  }, [search, champions]);

  return (
    <PageWithAds>
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Buscar por Habilidade</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        Encontre campeões pelo nome ou efeito de uma habilidade.
      </p>

      <AdBanner />

      <input
        type="text"
        placeholder="Ex: silêncio, dash, invisibilidade, rewind..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="tl-search"
        style={{ width: "100%", maxWidth: 560, padding: "0.75rem 1rem", fontSize: "1rem" }}
        autoFocus
      />

      {loading && (
        <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>
          Carregando habilidades de {170} campeões...
        </p>
      )}

      {!loading && search.length >= 2 && results.length === 0 && (
        <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>
          Nenhuma habilidade encontrada para "{search}".
        </p>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            {results.length} resultado(s)
          </p>
          {results.map((r, i) => (
            <Link key={i} href={`/champion/${r.champId}`} className="spell-search-row">
              <img
                src={r.iconUrl}
                alt={r.spellName}
                width={40} height={40}
                className="spell-search-icon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="spell-search-info">
                <p className="spell-search-name">
                  <span className="spell-search-key">{r.spellKey}</span>
                  {r.spellName}
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}> — {r.champName}</span>
                </p>
                <p className="spell-search-desc">{r.description}…</p>
              </div>
              <img
                src={`${DD}/img/champion/${r.champId}.png`}
                alt={r.champName}
                width={32} height={32}
                className="spell-search-champ"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </Link>
          ))}
        </div>
      )}
    </main>
    </PageWithAds>
  );
}
