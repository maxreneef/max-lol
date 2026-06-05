/**
 * Gerador determinístico de dados de build para campeões.
 * Todos os dados são mock estruturados para simular a saída real da API.
 * Substituir por dados reais quando Production Key for aprovada.
 */

import type { DDChampion } from "./ddragon";

// Seed hash determinístico
function hash(s: string): number {
  let h = 5381;
  for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h;
}
function seeded(champId: string, salt: string): number {
  return (hash(champId + salt) % 1000) / 1000;
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RuneChoice {
  id: string;
  name: string;
  icon: string;
  pickRate: number;
  winRate: number;
}

export interface RuneSetup {
  primaryTree: string;
  primaryTreeColor: string;
  keystone: RuneChoice;
  slot1: RuneChoice;
  slot2: RuneChoice;
  slot3: RuneChoice;
  secondaryTree: string;
  secondary1: RuneChoice;
  secondary2: RuneChoice;
  shard1: string;
  shard2: string;
  shard3: string;
  pickRate: number;
  winRate: number;
  sampleSize: number;
}

export interface SummonerSpellSet {
  spells: [string, string];
  pickRate: number;
  winRate: number;
  sampleSize: number;
}

export interface SkillOrder {
  order: string[];         // ex: ["Q","W","E","Q","Q","R","Q","E","Q","E","R","E","E","W","W"]
  maxFirst: "Q" | "W" | "E";
  pickRate: number;
  winRate: number;
  sampleSize: number;
}

export interface ItemSet {
  items: string[];
  pickRate: number;
  winRate: number;
  sampleSize: number;
}

export interface MatchupEntry {
  champId: string;
  champName: string;
  winRate: number;
  games: number;
}

export interface CounterHeadToHead {
  enemyChampId: string;
  enemyChampName: string;
  ourLaneKillRate: number;
  enemyLaneKillRate: number;
  ourKDA: string;
  enemyKDA: string;
  ourKP: number;
  enemyKP: number;
  ourDmg: number;
  enemyDmg: number;
  ourFirstTower: string;
  enemyFirstTower: string;
  ourWR: number;
  enemyWR: number;
  ourLaneWR: number;
  enemyLaneWR: number;
  ourPR: number;
  enemyPR: number;
  ourBR: number;
  enemyBR: number;
  games: number;
}

export interface SynergyEntry {
  champId: string;
  champName: string;
  winRate: number;
  games: number;
  role: string;
  pickRate: number;
}

export interface MasteryEntry {
  summonerName: string;
  tagLine: string;
  games: number;
  winRate: number;
  tier: string;
  rank: string;
  profileIconId: number;
}

export interface SkinStatEntry {
  skinId: string;
  skinNum: number;
  skinName: string;
  usageRate: number;
}

export interface MatchEntry {
  matchId: string;
  summonerName: string;
  tagLine: string;
  region: string;
  platform: string;
  tier: string;
  rank: string;
  championId: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  items: string[];
  runes: { primary: string; secondary: string; keystone: string };
  summonerSpells: [string, string];
  skillOrder: string;
  gameDuration: string; // "32:15"
  gameCreation: number; // timestamp
  queueId: number;
}

export interface ChampionBuildData {
  champId: string;
  patch: string;
  prevPatch: string;
  tier: "S+" | "S" | "A" | "B" | "C" | "D";
  winRate: number;
  pickRate: number;
  banRate: number;
  winRateDelta: number;    // vs prev patch
  pickRateDelta: number;
  primaryRole: string;
  secondaryRole: string;
  primaryRoleShare: number;
  totalGames: number;
  difficulty: "Fácil" | "Médio" | "Difícil" | "Muito Difícil";

  runeSetups: [RuneSetup, RuneSetup];
  summonerSpells: SummonerSpellSet[];
  skillOrders: SkillOrder[];

  startingItems: ItemSet[];
  boots: ItemSet[];
  coreBuilds: ItemSet[];
  fourthItems: ItemSet[];
  fifthItems: ItemSet[];
  sixthItems: ItemSet[];

  hardCounters: MatchupEntry[];
  easyMatchups: MatchupEntry[];
  evenMatchups: MatchupEntry[];
  countersH2H: CounterHeadToHead[];
  synergies: SynergyEntry[];
  masteryRanking: MasteryEntry[];
  skinStats: SkinStatEntry[];
  matchHistory: MatchEntry[];
}

// ── Dados de referência ───────────────────────────────────────────────────────

const KEYSTONES: Record<string, { name: string; icon: string; tree: string; color: string }> = {
  Electrocute:  { name: "Eletrocutar",       icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png", tree: "Dominação",   color: "#e84057" },
  Conqueror:    { name: "Conquistador",       icon: "perk-images/Styles/Precision/Conqueror/Conqueror.png",     tree: "Precisão",    color: "#c8aa6e" },
  DarkHarvest:  { name: "Colheita Sombria",   icon: "perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png",tree: "Dominação",   color: "#e84057" },
  GraspUndying: { name: "Toque dos Mortos-Vivos", icon: "perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png", tree: "Resolve", color: "#c0e4cb" },
  LethalTempo:  { name: "Andamento Letal",    icon: "perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png", tree: "Precisão", color: "#c8aa6e" },
  Comet:        { name: "Cometa Arcano",      icon: "perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png",  tree: "Feitiçaria", color: "#9faafc" },
  FleetFootwork:{ name: "Passo Ágil",         icon: "perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png", tree: "Precisão", color: "#c8aa6e" },
  Phase:        { name: "Disparada",          icon: "perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png",      tree: "Feitiçaria", color: "#9faafc" },
  HailOfBlades: { name: "Chuva de Lâminas",  icon: "perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png", tree: "Dominação", color: "#e84057" },
};

const SECONDARY_RUNES = [
  { id: "SuddenImpact",  name: "Impacto Repentino",   icon: "perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png" },
  { id: "TasteBlood",    name: "Gosto de Sangue",     icon: "perk-images/Styles/Domination/TasteOfBlood/GreenTerror_TasteOfBlood.png" },
  { id: "TreasureHunter",name: "Caçador de Tesouros", icon: "perk-images/Styles/Domination/TreasureHunter/TreasureHunter.png" },
  { id: "UltimateHunter",name: "Caçador de Supremas", icon: "perk-images/Styles/Domination/UltimateHunter/UltimateHunter.png" },
  { id: "EyeballCollection", name: "Coleção de Globos", icon: "perk-images/Styles/Domination/EyeballCollection/EyeballCollection.png" },
  { id: "AbsoluteFocus", name: "Foco Absoluto",       icon: "perk-images/Styles/Sorcery/AbsoluteFocus/AbsoluteFocus.png" },
  { id: "GatheringStorm",name: "Tempestade Crescente",icon: "perk-images/Styles/Sorcery/GatheringStorm/GatheringStorm.png" },
  { id: "Transcendence", name: "Transcendência",      icon: "perk-images/Styles/Sorcery/Transcendence/Transcendence.png" },
  { id: "Overgrowth",    name: "Supercrescimento",    icon: "perk-images/Styles/Resolve/Overgrowth/Overgrowth.png" },
  { id: "SecondWind",    name: "Segundo Fôlego",      icon: "perk-images/Styles/Resolve/SecondWind/SecondWind.png" },
  { id: "BonePlating",   name: "Revestimento Ósseo",  icon: "perk-images/Styles/Resolve/BonePlating/BonePlating.png" },
  { id: "Triumph",       name: "Triunfo",             icon: "perk-images/Styles/Precision/Triumph/Triumph.png" },
  { id: "Alacrity",      name: "Legend: Agilidade",   icon: "perk-images/Styles/Precision/LegendAlacrity/LegendAlacrity.png" },
  { id: "CoupDeGrace",   name: "Golpe de Misericórdia",icon: "perk-images/Styles/Precision/CoupDeGrace/CoupDeGrace.png" },
  { id: "NimbusCl",      name: "Manto de Nuvem",      icon: "perk-images/Styles/Sorcery/NimbusCloak/NimbusCloak.png" },
  { id: "Scorch",        name: "Chamuscar",           icon: "perk-images/Styles/Sorcery/Scorch/Scorch.png" },
];

const ALL_ITEMS = [
  { id: "3145", name: "Hextech Gunblade" },
  { id: "4645", name: "Shadowflame" },
  { id: "3157", name: "Zhonya's Hourglass" },
  { id: "3152", name: "Bastão do Vazio" },
  { id: "3089", name: "Chapéu de Rabadon" },
  { id: "4628", name: "Horizonte Sombrio" },
  { id: "3135", name: "Void Staff" },
  { id: "3165", name: "Morellonomicon" },
  { id: "3116", name: "Rylai's Crystal Scepter" },
  { id: "3020", name: "Sapatos do Feiticeiro" },
  { id: "3111", name: "Mercúrio" },
  { id: "3047", name: "Tamancos de Ninja" },
  { id: "3070", name: "Bota do Tempo de Iônia" },
  { id: "1055", name: "Anel de Doran" },
  { id: "1054", name: "Escudo de Doran" },
  { id: "1082", name: "Lacre das Trevas" },
  { id: "2003", name: "Poção de Vida" },
  { id: "3867", name: "Lâmina da Tempestade" },
  { id: "3142", name: "Youmuu's Ghostblade" },
  { id: "6694", name: "Crown of the Shattered Queen" },
  { id: "3115", name: "Nashor's Tooth" },
  { id: "4633", name: "Riftmaker" },
  { id: "6653", name: "Luden's Tempest" },
  { id: "3040", name: "Seraph's Embrace" },
  { id: "4637", name: "Stormsurge" },
];

const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"];
const TIERS = ["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Esmeralda", "Diamante", "Mestre", "Grão-Mestre", "Challenger"];
const RANKS = ["IV", "III", "II", "I", ""];

const SUMMONER_NAMES_BR = [
  "FuriaBR", "AkilaTop", "NightHunter", "ShadowBlade", "StarGuard",
  "DragonSlayer", "VoidWalker", "GoldKing", "SilverArrow", "EmeraldMid",
  "DiamondDuo", "MasterYi", "ChallengerBR", "PROPlayer", "LCSHopes",
  "BRImmortal", "GodTier", "UnstoppableR", "LegendBR", "TopLaner",
];

const FAMOUS_SKINS: Record<string, { num: number; name: string }[]> = {
  Akali: [
    { num: 6, name: "K/DA Akali" },
    { num: 8, name: "K/DA ALL OUT Akali" },
    { num: 3, name: "Crimson Akali" },
    { num: 7, name: "Infernal Akali" },
    { num: 9, name: "True Damage Akali" },
    { num: 5, name: "Blood Moon Akali" },
    { num: 4, name: "Nurse Akali" },
    { num: 2, name: "All-Star Akali" },
    { num: 1, name: "Stinger Akali" },
    { num: 0, name: "Base Akali" },
  ],
};

function pickItems(champId: string, salt: string, count: number, pool: typeof ALL_ITEMS) {
  const s = hash(champId + salt);
  return Array.from({ length: count }, (_, i) => pool[(s + i * 7) % pool.length]);
}

// ── Gerador principal ─────────────────────────────────────────────────────────

export function generateChampionBuildData(champ: DDChampion, allChampions: DDChampion[]): ChampionBuildData {
  const id = champ.id;
  const s = (salt: string) => seeded(id, salt);

  const wr       = 46 + s("wr")  * 12;
  const pr       = 2  + s("pr")  * 14;
  const br       = 2  + s("br")  * 22;
  const wrDelta  = +(s("wrdelta") * 3 - 1.5).toFixed(1);
  const prDelta  = +(s("prdelta") * 2 - 1).toFixed(1);
  const tierVal  = wr >= 54 ? "S+" : wr >= 52 ? "S" : wr >= 50 ? "A" : wr >= 48 ? "B" : wr >= 46 ? "C" : "D";
  let totalGames = Math.floor(20000 + s("games") * 80000);

  const diffLevel = champ.info.difficulty;
  const difficulty: ChampionBuildData["difficulty"] =
    diffLevel >= 8 ? "Muito Difícil" : diffLevel >= 6 ? "Difícil" : diffLevel >= 4 ? "Médio" : "Fácil";

  // ── Roles ──
  const roleIdx = hash(id) % ROLES.length;
  const primaryRole   = ROLES[roleIdx];
  const secondaryRole = ROLES[(roleIdx + 1) % ROLES.length];
  const primaryShare  = Math.round(55 + s("roleshare") * 35);

  // ── Keystones ──
  const keystoneKeys = Object.keys(KEYSTONES);
  const k1key = keystoneKeys[hash(id) % keystoneKeys.length];
  const k2key = keystoneKeys[(hash(id) + 3) % keystoneKeys.length];
  const k1 = KEYSTONES[k1key];
  const k2 = KEYSTONES[k2key];

  function makeRuneChoice(champId: string, salt: string, rune: typeof SECONDARY_RUNES[0]): RuneChoice {
    return {
      id: rune.id, name: rune.name, icon: rune.icon,
      pickRate: Math.round(60 + seeded(champId, salt + rune.id) * 35),
      winRate:  Math.round((46 + seeded(champId, salt + rune.id + "wr") * 10) * 10) / 10,
    };
  }

  const runes = SECONDARY_RUNES;
  const ri = hash(id);

  const runeSetups: [RuneSetup, RuneSetup] = [
    {
      primaryTree: k1.tree, primaryTreeColor: k1.color,
      keystone: { id: k1key, name: k1.name, icon: k1.icon, pickRate: Math.round(50 + s("k1pr") * 45), winRate: +wr.toFixed(1) },
      slot1: makeRuneChoice(id, "s1", runes[ri % runes.length]),
      slot2: makeRuneChoice(id, "s2", runes[(ri + 2) % runes.length]),
      slot3: makeRuneChoice(id, "s3", runes[(ri + 4) % runes.length]),
      secondaryTree: "Resolve",
      secondary1: makeRuneChoice(id, "sec1", runes[(ri + 6) % runes.length]),
      secondary2: makeRuneChoice(id, "sec2", runes[(ri + 8) % runes.length]),
      shard1: "Força Adaptativa", shard2: "Força Adaptativa", shard3: "Vida (escalonável)",
      pickRate: Math.round(55 + s("rpr1") * 35),
      winRate:  +wr.toFixed(1),
      sampleSize: Math.floor(totalGames * (0.55 + s("rpr1") * 0.35)),
    },
    {
      primaryTree: k2.tree, primaryTreeColor: k2.color,
      keystone: { id: k2key, name: k2.name, icon: k2.icon, pickRate: Math.round(15 + s("k2pr") * 25), winRate: +(wr - 1 - s("k2wrm") * 2).toFixed(1) },
      slot1: makeRuneChoice(id, "s1b", runes[(ri + 1) % runes.length]),
      slot2: makeRuneChoice(id, "s2b", runes[(ri + 3) % runes.length]),
      slot3: makeRuneChoice(id, "s3b", runes[(ri + 5) % runes.length]),
      secondaryTree: "Feitiçaria",
      secondary1: makeRuneChoice(id, "sec1b", runes[(ri + 7) % runes.length]),
      secondary2: makeRuneChoice(id, "sec2b", runes[(ri + 9) % runes.length]),
      shard1: "Velocidade de Ataque", shard2: "Força Adaptativa", shard3: "Armadura",
      pickRate: Math.round(15 + s("rpr2") * 25),
      winRate:  +(wr - 1 - s("k2wrm") * 2).toFixed(1),
      sampleSize: Math.floor(totalGames * (0.15 + s("rpr2") * 0.25)),
    },
  ];

  // ── Feitiços ──
  const summonerSpells: SummonerSpellSet[] = [
    { spells: ["Flash", "Ignite"],    pickRate: Math.round(60 + s("sp1") * 30), winRate: +(wr + s("sp1wr") * 2 - 1).toFixed(1), sampleSize: Math.floor(totalGames * (0.6 + s("sp1") * 0.3)) },
    { spells: ["Flash", "Teleporte"], pickRate: Math.round(10 + s("sp2") * 20), winRate: +(wr - 1 - s("sp2wr") * 2).toFixed(1), sampleSize: Math.floor(totalGames * (0.1 + s("sp2") * 0.2)) },
    { spells: ["Flash", "Barreira"],  pickRate: Math.round(2  + s("sp3") * 8),  winRate: +(wr + s("sp3wr") * 1).toFixed(1),     sampleSize: Math.floor(totalGames * (0.02 + s("sp3") * 0.08)) },
  ];

  // ── Ordem de habilidades ──
  const maxOptions: Array<"Q" | "W" | "E"> = ["Q", "E", "W"];
  const maxFirst = maxOptions[hash(id) % 3];
  const maxSecond = maxOptions[(hash(id) + 1) % 3];
  function buildOrder(first: "Q" | "W" | "E"): string[] {
    const second = maxOptions.find((x) => x !== first && x !== "W") ?? "E";
    const order: string[] = [first, "W", "E", first, first, "R", first];
    for (let i = 7; i <= 17; i++) {
      if (i % 3 === 1) order.push(first);
      else if (i % 3 === 2) order.push(second);
      else order.push("W");
    }
    return order.slice(0, 18);
  }

  const skillOrders: SkillOrder[] = [
    { order: buildOrder(maxFirst),  maxFirst,      pickRate: Math.round(60 + s("so1pr") * 30), winRate: +(wr + 2 + s("so1wr") * 4).toFixed(1), sampleSize: Math.floor(totalGames * (0.6 + s("so1pr") * 0.3)) },
    { order: buildOrder(maxSecond), maxFirst: maxSecond, pickRate: Math.round(10 + s("so2pr") * 25), winRate: +(wr - 1 + s("so2wr") * 2).toFixed(1), sampleSize: Math.floor(totalGames * (0.1 + s("so2pr") * 0.25)) },
  ];

  // ── Itens ──
  const itemPool = ALL_ITEMS;
  const ip = hash(id);

  function buildItemSet(saltPfx: string, count: number, baseWr: number, basePr: number, baseSample: number): ItemSet {
    return {
      items: Array.from({ length: count }, (_, i) => itemPool[(ip + i * 3 + hash(saltPfx)) % itemPool.length].id),
      pickRate: Math.round(basePr + seeded(id, saltPfx + "pr") * 30),
      winRate:  +(baseWr + seeded(id, saltPfx + "wr") * 5 - 2).toFixed(1),
      sampleSize: Math.floor(baseSample * (0.5 + seeded(id, saltPfx + "ss") * 0.8)),
    };
  }

  const startingItems: ItemSet[] = [
    { items: ["1055", "2003"], pickRate: Math.round(50 + s("si1pr") * 30), winRate: +(wr + s("si1wr") * 2).toFixed(1), sampleSize: Math.floor(totalGames * 0.5) },
    { items: ["1054"],          pickRate: Math.round(30 + s("si2pr") * 20), winRate: +(wr - s("si2wr")).toFixed(1),      sampleSize: Math.floor(totalGames * 0.3) },
    { items: ["1082", "2003"],  pickRate: Math.round(5  + s("si3pr") * 10), winRate: +(wr + 1 + s("si3wr") * 3).toFixed(1), sampleSize: Math.floor(totalGames * 0.08) },
  ];

  const boots: ItemSet[] = [
    { items: ["3020"], pickRate: Math.round(60 + s("b1pr") * 25), winRate: +(wr + 0.5 + s("b1wr") * 2).toFixed(1), sampleSize: Math.floor(totalGames * 0.6) },
    { items: ["3111"], pickRate: Math.round(10 + s("b2pr") * 15), winRate: +(wr - 0.5 + s("b2wr") * 1.5).toFixed(1), sampleSize: Math.floor(totalGames * 0.1) },
    { items: ["3047"], pickRate: Math.round(5  + s("b3pr") * 10), winRate: +(wr + s("b3wr") * 2).toFixed(1), sampleSize: Math.floor(totalGames * 0.05) },
  ];

  const coreBuilds: ItemSet[] = [
    buildItemSet("core1", 3, wr,       30, totalGames),
    buildItemSet("core2", 3, wr - 1,   20, totalGames),
    buildItemSet("core3", 3, wr + 2,    6, totalGames),
    buildItemSet("core4", 3, wr + 1,   10, totalGames),
    buildItemSet("core5", 4, wr + 3,    5, totalGames),
  ];

  const fourthItems:  ItemSet[] = [buildItemSet("4th1", 1, wr + 2, 40, totalGames), buildItemSet("4th2", 1, wr + 1, 25, totalGames), buildItemSet("4th3", 1, wr, 15, totalGames), buildItemSet("4th4", 1, wr - 1, 10, totalGames), buildItemSet("4th5", 1, wr + 3, 5, totalGames)];
  const fifthItems:   ItemSet[] = [buildItemSet("5th1", 1, wr + 3, 35, totalGames), buildItemSet("5th2", 1, wr + 2, 20, totalGames), buildItemSet("5th3", 1, wr + 1, 12, totalGames), buildItemSet("5th4", 1, wr, 8, totalGames), buildItemSet("5th5", 1, wr + 4, 4, totalGames)];
  const sixthItems:   ItemSet[] = [buildItemSet("6th1", 1, wr + 4, 30, totalGames), buildItemSet("6th2", 1, wr + 3, 18, totalGames), buildItemSet("6th3", 1, wr + 2, 10, totalGames), buildItemSet("6th4", 1, wr + 1, 7, totalGames), buildItemSet("6th5", 1, wr + 5, 3, totalGames)];

  // ── Matchups ──
  const others = allChampions.filter((c) => c.id !== id);
  function makeMatchup(idx: number, salt: string, wrBase: number, minGames: number): MatchupEntry {
    const c = others[(hash(id + salt) + idx * 17) % others.length];
    return {
      champId: c.id, champName: c.name,
      winRate: +(wrBase + seeded(id, salt + c.id) * 8).toFixed(1),
      games:   Math.floor(minGames + seeded(id, salt + c.id + "g") * 1200),
    };
  }

  const hardCounters: MatchupEntry[] = Array.from({ length: 10 }, (_, i) => makeMatchup(i, "hc", 38, 150));
  const easyMatchups: MatchupEntry[] = Array.from({ length: 10 }, (_, i) => makeMatchup(i, "em", 54, 120));
  const evenMatchups: MatchupEntry[] = Array.from({ length: 8 }, (_, i) => makeMatchup(i, "ev", 49, 100));
  hardCounters.sort((a, b) => a.winRate - b.winRate);
  easyMatchups.sort((a, b) => b.winRate - a.winRate);
  evenMatchups.sort((a, b) => Math.abs(a.winRate - 50) - Math.abs(b.winRate - 50));

  // ── Head-to-head counter data ──
  const countersH2H: CounterHeadToHead[] = [...hardCounters.slice(0, 5), ...easyMatchups.slice(0, 3)].map((m) => {
    const isHard = m.winRate < 50;
    return {
      enemyChampId: m.champId,
      enemyChampName: m.champName,
      ourLaneKillRate: isHard ? 41 + seeded(id, "h2h" + m.champId + "lkr") * 15 : 55 + seeded(id, "h2h" + m.champId + "lkr") * 15,
      enemyLaneKillRate: 100 - (isHard ? 41 + seeded(id, "h2h" + m.champId + "lkr") * 15 : 55 + seeded(id, "h2h" + m.champId + "lkr") * 15),
      ourKDA: `${(1.5 + seeded(id, "h2h" + m.champId + "kda") * 2).toFixed(2)}:1`,
      enemyKDA: `${(1.5 + seeded(id, "h2h" + m.champId + "ekda") * 2).toFixed(2)}:1`,
      ourKP: Math.round(38 + seeded(id, "h2h" + m.champId + "kp") * 15),
      enemyKP: Math.round(38 + seeded(id, "h2h" + m.champId + "ekp") * 15),
      ourDmg: Math.round(22000 + seeded(id, "h2h" + m.champId + "dmg") * 8000),
      enemyDmg: Math.round(22000 + seeded(id, "h2h" + m.champId + "edmg") * 8000),
      ourFirstTower: `${14 + Math.floor(seeded(id, "h2h" + m.champId + "ft") * 6)}'${Math.floor(seeded(id, "h2h" + m.champId + "fts") * 60).toString().padStart(2,"0")}"`,
      enemyFirstTower: `${14 + Math.floor(seeded(id, "h2h" + m.champId + "eft") * 6)}'${Math.floor(seeded(id, "h2h" + m.champId + "efts") * 60).toString().padStart(2,"0")}"`,
      ourWR: +m.winRate.toFixed(1),
      enemyWR: +(100 - m.winRate).toFixed(1),
      ourLaneWR: +(m.winRate - 0.5 + seeded(id, "h2h" + m.champId + "lwr") * 2).toFixed(1),
      enemyLaneWR: +(100 - m.winRate + 0.5 - seeded(id, "h2h" + m.champId + "lwr") * 2).toFixed(1),
      ourPR: +pr.toFixed(1),
      enemyPR: +(2 + seeded(id, "h2h" + m.champId + "epr") * 14).toFixed(1),
      ourBR: +br.toFixed(1),
      enemyBR: +(2 + seeded(id, "h2h" + m.champId + "ebr") * 22).toFixed(1),
      games: m.games,
    };
  });

  // ── Sinergias ──
  const synergies: SynergyEntry[] = Array.from({ length: 10 }, (_, i) => {
    const c = others[(hash(id + "syn") + i * 13) % others.length];
    return {
      champId: c.id, champName: c.name,
      winRate: +(52 + seeded(id, "syn" + c.id) * 12).toFixed(1),
      games:   Math.floor(200 + seeded(id, "syn" + c.id + "g") * 2000),
      role: ROLES[(hash(c.id) + 1) % ROLES.length],
      pickRate: +(1 + seeded(id, "syn" + c.id + "pr") * 8).toFixed(1),
    };
  }).sort((a, b) => b.winRate - a.winRate);

  // ── Ranking de Maestria ──
  const masteryRanking: MasteryEntry[] = Array.from({ length: 10 }, (_, i) => {
    const nameIdx = (hash(id + "mastery" + i) % SUMMONER_NAMES_BR.length);
    const tierIdx = Math.max(6, Math.min(9, 9 - i)); // Challenger down to Diamond
    const rankIdx = i < 3 ? 4 : hash(id + "rank" + i) % 4;
    return {
      summonerName: SUMMONER_NAMES_BR[nameIdx] + (i > 0 ? String(i) : ""),
      tagLine: "BR1",
      games: Math.floor(600 - i * 50 + seeded(id, "mastery" + i) * 200),
      winRate: +(50 + seeded(id, "masterywr" + i) * 12).toFixed(1),
      tier: TIERS[tierIdx],
      rank: RANKS[rankIdx],
      profileIconId: Math.floor(1 + seeded(id, "icon" + i) * 28),
    };
  });

  // ── Ranking de Skins ──
  const famousSkins = FAMOUS_SKINS[id];
  const skinStats: SkinStatEntry[] = famousSkins
    ? famousSkins.map((sk, i) => ({
        skinId: `${id}_${sk.num}`,
        skinNum: sk.num,
        skinName: sk.name,
        usageRate: +(35 - i * 3 + seeded(id, "skin" + i) * 8).toFixed(1),
      })).sort((a, b) => b.usageRate - a.usageRate)
    : Array.from({ length: 5 }, (_, i) => ({
        skinId: `${id}_${i}`,
        skinNum: i,
        skinName: i === 0 ? "Base" : `Skin ${i}`,
        usageRate: +(30 - i * 4 + seeded(id, "skin" + i) * 8).toFixed(1),
      }));

  // ── Match History (one-trick games) ──────────────────────────────────────────
  const matchHistory: MatchEntry[] = generateMatchHistory(champ);
  totalGames = matchHistory.length;

  return {
    champId: id, patch: "15.11", prevPatch: "15.10",
    tier: tierVal as ChampionBuildData["tier"],
    winRate: +wr.toFixed(1), pickRate: +pr.toFixed(1), banRate: +br.toFixed(1),
    winRateDelta: wrDelta, pickRateDelta: prDelta,
    primaryRole, secondaryRole, primaryRoleShare: primaryShare, totalGames,
    difficulty,
    runeSetups, summonerSpells, skillOrders,
    startingItems, boots, coreBuilds, fourthItems, fifthItems, sixthItems,
    hardCounters, easyMatchups, evenMatchups, countersH2H, synergies,
    masteryRanking, skinStats,
    matchHistory,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH HISTORY — partidas reais de monochampions (mock)
// ═══════════════════════════════════════════════════════════════════════════════

const ONE_TRICK_PLAYERS: { name: string; tag: string; region: string; platform: string; tier: string; rank: string }[] = [
  { name: "KierDock",        tag: "13116", region: "Brasil",           platform: "br1", tier: "Diamante",    rank: "II" },
  { name: "LucasRei",        tag: "BR1",   region: "Brasil",           platform: "br1", tier: "Mestre",      rank: "I" },
  { name: "JooJoo",          tag: "777",   region: "Brasil",           platform: "br1", tier: "Challenger",  rank: "800 LP" },
  { name: "Hide on bush",    tag: "KR1",   region: "Coreia do Sul",    platform: "kr",  tier: "Challenger",  rank: "1200 LP" },
  { name: "MidBeast",        tag: "OCE",   region: "Oceania",          platform: "oc1", tier: "Grão-Mestre", rank: "I" },
  { name: "Quantum",         tag: "NA1",   region: "América do Norte", platform: "na1", tier: "Challenger",  rank: "900 LP" },
  { name: "Noway4u",         tag: "EUW",   region: "Europa Oeste",     platform: "euw1", tier: "Desafiante", rank: "I" },
  { name: "Pobelter",        tag: "NA",    region: "América do Norte", platform: "na1", tier: "Challenger",  rank: "700 LP" },
  { name: "BaianoSensei",    tag: "BR",    region: "Brasil",           platform: "br1", tier: "Mestre",      rank: "III" },
  { name: "Yoda",            tag: "KR2",   region: "Coreia do Sul",    platform: "kr",  tier: "Challenger",  rank: "1000 LP" },
];

function randomItem(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

function generateMatchHistory(champ: DDChampion): MatchEntry[] {
  const games = 20;
  const matches: MatchEntry[] = [];
  const now = Date.now();

  // Itens, runas e spells típicos baseados na role
  const roleItems: Record<string, { core: string[]; situational: string[][] }> = {
    Top:     { core: ["3078","3153","3071"], situational: [["3111","3134","3074"],["3156","3036","3812"],["3006","3047","3133"]] },
    Jungle:  { core: ["3153","3078","3071"], situational: [["3111","3134","3074"],["3156","3036","3812"],["3006","3047","3133"]] },
    Mid:     { core: ["3157","3089","3135"], situational: [["3020","3100","3089"],["3152","3135","3165"],["3116","3157","3100"]] },
    ADC:     { core: ["3031","3153","3006"], situational: [["3072","3156","3031"],["3094","3078","3153"],["3036","3006","3156"]] },
    Suporte: { core: ["3850","3107","3190"], situational: [["3117","3068","3850"],["3001","3107","3190"],["3222","3504","3850"]] },
  };

  const role: keyof typeof roleItems = (champ.tags.includes("Marksman") ? "ADC" : champ.tags.includes("Support") ? "Suporte" : champ.tags.includes("Tank") || champ.tags.includes("Fighter") ? "Top" : champ.tags.includes("Mage") || champ.tags.includes("Assassin") ? "Mid" : "Jungle");

  const build = roleItems[role];
  const keystones = ["Conqueror","Electrocute","First Strike","Fleet Footwork","Grasp","Aery","Comet","Dark Harvest","Phase Rush","Press the Attack"];
  const primaryTrees = ["Precision","Domination","Inspiration","Sorcery","Resolve"];
  const secondaryTrees = ["Sorcery","Inspiration","Domination","Resolve","Precision"];
  const spells: [string, string][] = [["Flash","Ignite"],["Flash","Teleporte"],["Flash","Barreira"],["Flash","Exaustar"],["Flash","Fantasma"]];
  const queues = [420, 440, 420, 420, 450, 420, 420]; // maioria Solo/Duo

  for (let i = 0; i < games; i++) {
    const player = ONE_TRICK_PLAYERS[i % ONE_TRICK_PLAYERS.length];
    const win = seeded(champ.id, `match${i}win`) > 0.35; // ~65% WR pra um monochampion
    const dur = Math.floor(1500 + seeded(champ.id, `match${i}dur`) * 1200); // 25-45 min
    const mins = Math.floor(dur / 60);
    const secs = dur % 60;

    const k = 3 + seeded(champ.id, `match${i}k`) * 15;
    const d = 1 + seeded(champ.id, `match${i}d`) * 8;
    const a = 2 + seeded(champ.id, `match${i}a`) * 12;

    const itemSet = i < 13 ? build.core : build.situational[i % 3];
    const keystone = keystones[Math.floor(seeded(champ.id, `match${i}ks`) * keystones.length)];
    const primaryTree = primaryTrees[Math.floor(seeded(champ.id, `match${i}pt`) * primaryTrees.length)];
    const secondaryTree = secondaryTrees[Math.floor(seeded(champ.id, `match${i}st`) * secondaryTrees.length)];
    const spell = spells[Math.floor(seeded(champ.id, `match${i}sp`) * spells.length)];

    matches.push({
      matchId: `BR1_${3000000000 + i}`,
      summonerName: player.name,
      tagLine: player.tag,
      region: player.region,
      platform: player.platform,
      tier: player.tier,
      rank: player.rank,
      championId: champ.id,
      win,
      kills: Math.floor(k),
      deaths: Math.floor(d),
      assists: Math.floor(a),
      kda: `${Math.floor(k)}/${Math.floor(d)}/${Math.floor(a)}`,
      items: itemSet,
      runes: { primary: primaryTree, secondary: secondaryTree, keystone },
      summonerSpells: spell,
      skillOrder: ["Q","W","E"].sort(() => seeded(champ.id, `match${i}so`) - 0.5).join(">"),
      gameDuration: `${mins}:${String(secs).padStart(2, "0")}`,
      gameCreation: now - i * 3600000,
      queueId: queues[i % queues.length],
    });
  }

  return matches;
}
