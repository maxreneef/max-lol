/**
 * Agregador de builds — calcula win rates e pick rates a partir de partidas reais.
 * Substitui os dados mock do mockChampData.ts quando partidas reais da Riot API estão disponíveis.
 */

import { BOOTS_IDS, STARTING_ITEM_IDS } from "./riotIds";

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Interface para uma partida real retornada por /api/champion/[champId]/matches */
export interface RealMatch {
  matchId: string;
  win: boolean;
  spell1Id: number;
  spell2Id: number;
  primaryRuneId: number;
  primaryStyle: number;
  subStyle: number;
  runeSelections: number[];
  subSelections: number[];
  statShards: number[];
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  lane: string;
  skillOrder: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: number;
  killParticipation: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  gameDurationSeconds: number;
  // Campos opcionais de compatibilidade
  items?: string[];
  runes?: { primary: string; secondary: string; keystone: string; primaryStyle?: number; subStyle?: number; primaryRuneId?: number };
  summonerSpells?: string[];
}

export interface AggregatedEntry {
  pickRate: number;
  winRate: number;
  count: number;
}

export interface SummonerSpellAgg extends AggregatedEntry {
  spell1Id: number;
  spell2Id: number;
}

export interface KeystoneAgg extends AggregatedEntry {
  runeId: number;
}

export interface StyleAgg extends AggregatedEntry {
  styleId: number;
}

export interface CoreItemsAgg extends AggregatedEntry {
  items: number[];
}

export interface BootsAgg extends AggregatedEntry {
  itemId: number;
}

export interface StartingItemsAgg extends AggregatedEntry {
  items: number[];
}

/** Runa mais popular num slot específico da árvore */
export interface SlotRuneAgg {
  runeId: number;
  pickRate: number;
  winRate: number;
  count: number;
}

export interface AggregatedBuildData {
  summonerSpells: SummonerSpellAgg[];
  keystones: KeystoneAgg[];
  primaryStyles: StyleAgg[];
  subStyles: StyleAgg[];
  /** Slots 1-3 da árvore primária (cada slot = lista de runas por popularidade) */
  primarySlots: SlotRuneAgg[][];
  /** Slots 0-1 da árvore secundária */
  subSlots: SlotRuneAgg[][];
  coreItems: CoreItemsAgg[];
  startingItems: StartingItemsAgg[];
  boots: BootsAgg[];
  // Metadados
  totalGames: number;
  wins: number;
  winRate: number;
  hasRealData: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isBoots(itemId: number): boolean {
  return BOOTS_IDS.has(itemId);
}

function isStartingItem(itemId: number): boolean {
  return STARTING_ITEM_IDS.has(itemId);
}

/** Pega todos os itens da partida como array de números, filtrando zeros */
function getAllItems(m: RealMatch): number[] {
  const ids = [m.item0, m.item1, m.item2, m.item3, m.item4, m.item5, m.item6];
  return ids.filter((id) => id > 0);
}

/** Retorna os itens que NÃO são botas nem iniciais (core items), na ordem dos slots */
function getCoreItems(m: RealMatch): number[] {
  const all = getAllItems(m);
  return all.filter((id) => !isBoots(id) && !isStartingItem(id));
}

/** Retorna os itens iniciais (custo ≤ 500 gold) */
function getStartingItems(m: RealMatch): number[] {
  const all = getAllItems(m);
  return all.filter((id) => isStartingItem(id));
}

/** Retorna o ID da bota comprada (primeira encontrada) */
function getBootsItem(m: RealMatch): number | null {
  const all = getAllItems(m);
  return all.find((id) => isBoots(id)) ?? null;
}

// ── Agregação genérica ────────────────────────────────────────────────────────

interface CountEntry {
  wins: number;
  count: number;
}

/**
 * Agrupa partidas por uma chave derivada, conta wins e total,
 * e retorna ordenado por contagem decrescente com pickRate e winRate.
 */
function aggregateByKey<T>(
  matches: RealMatch[],
  keyFn: (m: RealMatch) => string | null,
  mapFn: (key: string, entry: CountEntry) => T
): T[] {
  const map = new Map<string, CountEntry>();

  for (const m of matches) {
    const key = keyFn(m);
    if (key === null) continue;
    const entry = map.get(key) ?? { wins: 0, count: 0 };
    entry.count++;
    if (m.win) entry.wins++;
    map.set(key, entry);
  }

  const total = matches.length;
  const results: T[] = [];
  for (const [key, entry] of map) {
    if (entry.count < 2) continue; // filtrar ruído
    results.push(
      mapFn(key, {
        wins: entry.wins,
        count: entry.count,
      })
    );
  }

  results.sort((a, b) => {
    const ca = (a as unknown as AggregatedEntry).count;
    const cb = (b as unknown as AggregatedEntry).count;
    return cb - ca;
  });
  return results;
}

// ── Função principal ──────────────────────────────────────────────────────────

export function aggregateBuildData(matches: RealMatch[]): AggregatedBuildData {
  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;

  if (total === 0) {
    return {
      summonerSpells: [],
      keystones: [],
      primaryStyles: [],
      subStyles: [],
      primarySlots: [[], [], []],
      subSlots: [[], []],
      coreItems: [],
      startingItems: [],
      boots: [],
      totalGames: 0,
      wins: 0,
      winRate: 0,
      hasRealData: false,
    };
  }

  // ── Feitiços de invocador (par spell1Id + spell2Id) ──
  const summonerSpells = aggregateByKey<SummonerSpellAgg>(
    matches,
    (m) => {
      if (!m.spell1Id || !m.spell2Id) return null;
      // Ordenar para consistência (Flash sempre primeiro se presente)
      const ids = [m.spell1Id, m.spell2Id].sort((a, b) => b - a); // Flash=4 fica antes
      return `${ids[0]}:${ids[1]}`;
    },
    (key, entry) => {
      const [id1, id2] = key.split(":").map(Number);
      return {
        spell1Id: id1,
        spell2Id: id2,
        pickRate: +((entry.count / total) * 100).toFixed(1),
        winRate: +((entry.wins / entry.count) * 100).toFixed(1),
        count: entry.count,
      };
    }
  );

  // ── Keystones (primaryRuneId) ──
  const keystones = aggregateByKey<KeystoneAgg>(
    matches,
    (m) => (m.primaryRuneId > 0 ? String(m.primaryRuneId) : null),
    (key, entry) => ({
      runeId: Number(key),
      pickRate: +((entry.count / total) * 100).toFixed(1),
      winRate: +((entry.wins / entry.count) * 100).toFixed(1),
      count: entry.count,
    })
  );

  // ── Árvores primárias (primaryStyle) ──
  const primaryStyles = aggregateByKey<StyleAgg>(
    matches,
    (m) => (m.primaryStyle > 0 ? String(m.primaryStyle) : null),
    (key, entry) => ({
      styleId: Number(key),
      pickRate: +((entry.count / total) * 100).toFixed(1),
      winRate: +((entry.wins / entry.count) * 100).toFixed(1),
      count: entry.count,
    })
  );

  // ── Árvores secundárias (subStyle) ──
  const subStyles = aggregateByKey<StyleAgg>(
    matches,
    (m) => (m.subStyle > 0 ? String(m.subStyle) : null),
    (key, entry) => ({
      styleId: Number(key),
      pickRate: +((entry.count / total) * 100).toFixed(1),
      winRate: +((entry.wins / entry.count) * 100).toFixed(1),
      count: entry.count,
    })
  );

  // ── Itens core (pares dos 2 primeiros itens não-bota, não-inicial) ──
  const coreItems = aggregateByKey<CoreItemsAgg>(
    matches,
    (m) => {
      const core = getCoreItems(m).slice(0, 2);
      if (core.length === 0) return null;
      core.sort((a, b) => a - b); // ordenar pra consistência
      return core.join(":");
    },
    (key, entry) => {
      const items = key.split(":").map(Number);
      return {
        items,
        pickRate: +((entry.count / total) * 100).toFixed(1),
        winRate: +((entry.wins / entry.count) * 100).toFixed(1),
        count: entry.count,
      };
    }
  );

  // ── Itens iniciais ──
  const startingItems = aggregateByKey<StartingItemsAgg>(
    matches,
    (m) => {
      const starters = getStartingItems(m);
      if (starters.length === 0) return null;
      starters.sort((a, b) => a - b);
      return starters.join(":");
    },
    (key, entry) => {
      const items = key.split(":").map(Number);
      return {
        items,
        pickRate: +((entry.count / total) * 100).toFixed(1),
        winRate: +((entry.wins / entry.count) * 100).toFixed(1),
        count: entry.count,
      };
    }
  );

  // ── Slots primários (índices 1-3 de runeSelections) ──
  function aggregateSlot(slotIndex: number, source: "primary" | "sub"): SlotRuneAgg[] {
    const map = new Map<number, { wins: number; count: number }>();
    for (const m of matches) {
      const arr = source === "primary" ? m.runeSelections : m.subSelections;
      const runeId = arr?.[slotIndex];
      if (!runeId || runeId <= 0) continue;
      const entry = map.get(runeId) ?? { wins: 0, count: 0 };
      entry.count++;
      if (m.win) entry.wins++;
      map.set(runeId, entry);
    }
    const results: SlotRuneAgg[] = [];
    for (const [id, entry] of map) {
      results.push({
        runeId: id,
        pickRate: +((entry.count / total) * 100).toFixed(1),
        winRate: +((entry.wins / entry.count) * 100).toFixed(1),
        count: entry.count,
      });
    }
    results.sort((a, b) => b.count - a.count);
    return results.slice(0, 3);
  }

  // Slots 1, 2, 3 da árvore primária (slot 0 = keystone, já coberto por keystones[])
  const primarySlots: SlotRuneAgg[][] = [
    aggregateSlot(1, "primary"),
    aggregateSlot(2, "primary"),
    aggregateSlot(3, "primary"),
  ];

  // Slots 0 e 1 da árvore secundária
  const subSlots: SlotRuneAgg[][] = [
    aggregateSlot(0, "sub"),
    aggregateSlot(1, "sub"),
  ];

  // ── Botas ──
  const boots = aggregateByKey<BootsAgg>(
    matches,
    (m) => {
      const b = getBootsItem(m);
      return b !== null ? String(b) : null;
    },
    (key, entry) => ({
      itemId: Number(key),
      pickRate: +((entry.count / total) * 100).toFixed(1),
      winRate: +((entry.wins / entry.count) * 100).toFixed(1),
      count: entry.count,
    })
  );

  return {
    summonerSpells,
    keystones,
    primaryStyles,
    subStyles,
    primarySlots,
    subSlots,
    coreItems,
    startingItems,
    boots,
    totalGames: total,
    wins,
    winRate: +((wins / total) * 100).toFixed(1),
    hasRealData: true,
  };
}
