import type { Metadata } from "next";
import { ItemsClient, type ItemData } from "./ItemsClient";

export const metadata: Metadata = {
  title: "Itens — Max LoL",
  description: "Banco de dados completo de itens de League of Legends com stats, custo, receita e eficiência de ouro.",
};
export const revalidate = 3600;

async function fetchItems(): Promise<Record<string, ItemData>> {
  const res = await fetch(
    "https://ddragon.leagueoflegends.com/cdn/15.11.1/data/pt_BR/item.json",
    { next: { revalidate: 3600 } }
  );
  const json = await res.json();
  return json.data as Record<string, ItemData>;
}

export default async function ItemsPage() {
  const rawItems = await fetchItems();

  // itemMap inclui TODOS os itens para resolver receita (incluindo não compráveis)
  const itemMap: Record<string, ItemData> = {};
  for (const [id, item] of Object.entries(rawItems)) {
    itemMap[id] = { ...item, id };
  }

  // Lista filtrável: apenas itens compráveis com custo > 0
  const list = Object.values(itemMap)
    .filter((item) => item.gold.purchasable && item.gold.total > 0)
    .sort((a, b) => b.gold.total - a.gold.total);

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Itens</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        {list.length} itens compráveis — Patch 15.11.
        Ordene por <strong>eficiência de ouro</strong> para ver custo-benefício por stats.
      </p>
      <ItemsClient items={list} itemMap={itemMap} />
    </main>
  );
}
