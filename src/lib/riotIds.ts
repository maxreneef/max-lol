/**
 * Mapeamentos estáticos de IDs da Riot API → nomes e ícones do Data Dragon.
 * Referência: https://ddragon.leagueoflegends.com/cdn/16.11.1/data/pt_BR/
 */

// ── Feitiços de Invocador ─────────────────────────────────────────────────────

export const SUMMONER_SPELL_IDS: Record<number, { name: string; icon: string }> = {
  1:  { name: "Clarividência", icon: "SummonerReveal" },
  3:  { name: "Exaustão",      icon: "SummonerExhaust" },
  4:  { name: "Flash",         icon: "SummonerFlash" },
  6:  { name: "Fantasma",      icon: "SummonerHaste" },
  7:  { name: "Curar",         icon: "SummonerHeal" },
  11: { name: "Golpe",         icon: "SummonerSmite" },
  12: { name: "Teleporte",     icon: "SummonerTeleport" },
  13: { name: "Clareza",       icon: "SummonerMana" },
  14: { name: "Incendiar",     icon: "SummonerDot" },
  21: { name: "Barreira",      icon: "SummonerBarrier" },
  32: { name: "Avanço Glacial",icon: "SummonerSnowball" },
};

// ── Árvores de Runas (estilos) ────────────────────────────────────────────────

export const RUNE_STYLE_IDS: Record<number, { name: string; color: string }> = {
  8000: { name: "Precisão",    color: "#c8aa6e" },
  8100: { name: "Dominação",   color: "#e84057" },
  8200: { name: "Feitiçaria",  color: "#9faafc" },
  8300: { name: "Inspiração",  color: "#0bc4e3" },
  8400: { name: "Determinação", color: "#c0e4cb" },
};

// ── Botas ──────────────────────────────────────────────────────────────────────

export const BOOTS_IDS = new Set<number>([
  3006,  // Grevas do Berserker
  3009,  // Botas Ionianas da Lucidez
  3020,  // Sapatos do Feiticeiro
  3047,  // Tamancos de Ninja
  3111,  // Sapatos de Mercúrio
  3117,  // Botas de Mobilidade
  3158,  // Sapatos da Rapidez
]);

// ── Itens iniciais (custo ≤ 500 gold) ─────────────────────────────────────────

export const STARTING_ITEM_IDS = new Set<number>([
  1054,  // Escudo de Doran
  1055,  // Anel de Doran
  1056,  // Doran's Blade
  1082,  // Lacre das Trevas
  1083,  // Colhedora de Minérios
  1101,  // Bola de Neve
  1102,  // Nó do Vigia
  1103,  // Relic Shield
  1104,  // Spectral Sickle
  1862,  // Poção de Habilidade Arcana
  2003,  // Poção de Vida
  2033,  // Poção de Vida Reutilizável
  2055,  // Elixir do Vigia
  3070,  // Lágrima da Deusa
  3302,  // Lâmina do Conjurador
  3340,  // Bugiganga do Vigia
  3364,  // Lente do Oráculo
  3850,  // Suporte de Batalha
  3854,  // Foice Sombria
  3858,  // Suporte de Bronze
  3859,  // Suporte de Prata
  3860,  // Suporte de Ouro
]);

// ── Shards de runas (IDs conhecidos) ──────────────────────────────────────────

export const RUNE_SHARD_NAMES: Record<number, string> = {
  5001: "Vida (escalonável)",
  5002: "Armadura",
  5003: "Resistência Mágica",
  5005: "Velocidade de Ataque",
  5007: "Força Adaptativa",
  5008: "Aceleração de Habilidade",
};
