import type { Metadata } from "next";
import { ItemsClient } from "./ItemsClient";

export const metadata: Metadata = {
  title: "Itens — Max LoL",
  description: "Banco de dados completo de itens de League of Legends com stats, custo e categoria.",
};

export const revalidate = 3600;

async function fetchItems() {
  const res = await fetch(
    "https://ddragon.leagueoflegends.com/cdn/15.11.1/data/pt_BR/item.json",
    { next: { revalidate: 3600 } }
  );
  const json = await res.json();
  return json.data as Record<string, {
    name: string;
    description: string;
    gold: { base: number; total: number; sell: number; purchasable: boolean };
    tags: string[];
    image: { full: string };
    stats: Record<string, number>;
  }>;
}

export default async function ItemsPage() {
  const items = await fetchItems();
  const list = Object.entries(items)
    .filter(([, item]) => item.gold.purchasable && item.gold.total > 0)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => b.gold.total - a.gold.total);

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Itens</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        {list.length} itens compráveis — Patch 15.11
      </p>
      <ItemsClient items={list} />
    </main>
  );
}
