"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageWithAds } from "@/components/PageWithAds";
import { AdRect } from "@/components/AdUnit";

interface RuneSlot { runes: Rune[] }
interface Rune { id: number; key: string; icon: string; name: string; shortDesc: string; longDesc: string }
interface RuneTree { id: number; key: string; icon: string; name: string; slots: RuneSlot[] }

const TREE_COLORS: Record<string, string> = {
  Precision: "#c8aa6e", Domination: "#e84057", Sorcery: "#9faafc",
  Resolve: "#c0e4cb", Inspiration: "#39d0d8",
};

export default function RunesPage() {
  const [trees, setTrees] = useState<RuneTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/cdn/15.11.1/data/pt_BR/runesReforged.json")
      .then((r) => r.json())
      .then((data) => setTrees(data as RuneTree[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWithAds>
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Runas</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Todas as runas organizadas por árvore — Patch 15.11
      </p>

      {loading && (
        <div className="matches-loading">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="match-skeleton" style={{ height: 200 }} />)}
        </div>
      )}

      <div className="rune-trees">
        {trees.map((tree, idx) => (
          <div key={tree.id}>
          {idx === 2 && <AdRect />}
          <div className="rune-tree-card" style={{ "--tree-color": TREE_COLORS[tree.key] ?? "#fff" } as React.CSSProperties}>
            <div className="rune-tree-header">
              <img src={`https://ddragon.leagueoflegends.com/cdn/img/${tree.icon}`} alt={tree.name} width={36} height={36} className="rune-tree-icon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <h2 style={{ color: TREE_COLORS[tree.key] ?? "var(--text)" }}>{tree.name}</h2>
            </div>
            {tree.slots.map((slot, si) => (
              <div key={si} className="rune-slot">
                <p className="rune-slot-label">{si === 0 ? "Pedra-chave" : `Slot ${si}`}</p>
                <div className="rune-slot-row">
                  {slot.runes.map((rune) => (
                    <div key={rune.id} className={`rune-item ${si === 0 ? "rune-keystone" : ""}`} title={rune.name}>
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                        alt={rune.name}
                        width={si === 0 ? 48 : 36}
                        height={si === 0 ? 48 : 36}
                        className="rune-item-icon"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="rune-item-info">
                        <p className="rune-item-name">{rune.name}</p>
                        <p className="rune-item-desc">
                          {rune.shortDesc.replace(/<[^>]+>/g, " ").slice(0, 80)}…
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        ))}
      </div>
    </main>
    </PageWithAds>
  );
}
