// Data Dragon helpers — sem API key, dados públicos da Riot
export const DD_VERSION = "15.11.1";
export const DD_BASE = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`;

export function championIcon(name: string) {
  return `${DD_BASE}/img/champion/${name}.png`;
}

export function profileIcon(id: number) {
  return `${DD_BASE}/img/profileicon/${id}.png`;
}

export interface DDSpell {
  id: string;
  name: string;
  description: string;
  image: { full: string };
}

export interface DDChampionFull extends DDChampion {
  spells: DDSpell[];
  passive: { name: string; description: string; image: { full: string } };
  lore: string;
  skins: Array<{ id: string; num: number; name: string; chromas: boolean }>;
}

export interface DDChampion {
  id: string;        // "Aatrox"
  key: string;       // "266"
  name: string;      // "Aatrox"
  title: string;
  tags: string[];    // ["Fighter", "Tank"]
  stats: {
    hp: number;
    attackdamage: number;
    armor: number;
    spellblock: number;
    attackspeed: number;
  };
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  partype: string;
}

export function splashArt(champId: string, skinNum: number = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champId}_${skinNum}.jpg`;
}

export function loadingScreen(champId: string, skinNum: number = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_${skinNum}.jpg`;
}

export async function fetchChampionDetail(id: string): Promise<DDChampionFull | null> {
  try {
    const res = await fetch(
      `${DD_BASE}/data/pt_BR/champion/${id}.json`,
      { next: { revalidate: 3600 } }
    );
    const json = await res.json();
    return json.data[id] as DDChampionFull;
  } catch {
    return null;
  }
}

export interface DDChampionList {
  data: Record<string, DDChampion>;
}

export async function fetchChampions(): Promise<DDChampion[]> {
  const res = await fetch(
    `${DD_BASE}/data/pt_BR/champion.json`,
    { next: { revalidate: 3600 } }
  );
  const json = (await res.json()) as DDChampionList;
  return Object.values(json.data);
}

// Gera stats de tier list determinísticas a partir do nome do campeão.
// Isso será substituído por dados reais quando tivermos volume de partidas.
export function mockTierStats(champId: string) {
  let h = 0;
  for (let i = 0; i < champId.length; i++) h = (h * 31 + champId.charCodeAt(i)) >>> 0;
  const winRate = 46 + (h % 1200) / 100;      // 46% ~ 58%
  const pickRate = 1 + ((h >> 4) % 1500) / 100; // 1% ~ 16%
  const banRate = ((h >> 8) % 2000) / 100;       // 0% ~ 20%
  const tier =
    winRate >= 54 ? "S" :
    winRate >= 52 ? "A" :
    winRate >= 50 ? "B" :
    winRate >= 48 ? "C" : "D";
  return { winRate: +winRate.toFixed(1), pickRate: +pickRate.toFixed(1), banRate: +banRate.toFixed(1), tier };
}

// Mapeia tags Data Dragon → posição LoL
export function primaryRole(tags: string[]): string {
  if (tags.includes("Marksman")) return "ADC";
  if (tags.includes("Support")) return "Support";
  if (tags.includes("Mage")) return "Mid";
  if (tags.includes("Assassin")) return "Mid";
  if (tags.includes("Tank")) return "Top";
  if (tags.includes("Fighter")) return "Top";
  return "Jungle";
}
