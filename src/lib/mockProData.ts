export interface ProPlayer {
  id: string;
  name: string;
  team: string;
  teamShort: string;
  region: string;
  platform: string;
  role: string;
  photoName?: string;
  mostPlayed: { champId: string; games: number; winRate: number }[];
  winRate: number;
  kda: number;
  games: number;
  elo: string;
  twitch?: string;
  twitter?: string;
}

const PRO_PLAYERS: ProPlayer[] = [
  // ═══ CBLOL (Brasil) ═══
  { id: "1", name: "Titan", team: "paiN Gaming", teamShort: "PNG", region: "Brasil", platform: "br1", role: "ADC", mostPlayed: [{ champId: "Jinx", games: 87, winRate: 63 }, { champId: "Caitlyn", games: 74, winRate: 58 }, { champId: "Aphelios", games: 62, winRate: 56 }], winRate: 61, kda: 4.2, games: 145, elo: "Challenger" },
  { id: "2", name: "Cariok", team: "paiN Gaming", teamShort: "PNG", region: "Brasil", platform: "br1", role: "Jungle", mostPlayed: [{ champId: "Lee Sin", games: 92, winRate: 59 }, { champId: "Viego", games: 68, winRate: 57 }, { champId: "Sejuani", games: 55, winRate: 62 }], winRate: 60, kda: 3.8, games: 138, elo: "Challenger" },
  { id: "3", name: "Robo", team: "LOUD", teamShort: "LLL", region: "Brasil", platform: "br1", role: "Top", mostPlayed: [{ champId: "K'Sante", games: 65, winRate: 58 }, { champId: "Renekton", games: 52, winRate: 55 }, { champId: "Jayce", games: 48, winRate: 62 }], winRate: 57, kda: 3.5, games: 120, elo: "Challenger" },
  { id: "4", name: "Tinowns", team: "LOUD", teamShort: "LLL", region: "Brasil", platform: "br1", role: "Mid", mostPlayed: [{ champId: "Ahri", games: 58, winRate: 64 }, { champId: "Akali", games: 45, winRate: 60 }, { champId: "LeBlanc", games: 42, winRate: 58 }], winRate: 59, kda: 4.5, games: 112, elo: "Challenger" },
  { id: "5", name: "Ceos", team: "LOUD", teamShort: "LLL", region: "Brasil", platform: "br1", role: "Support", mostPlayed: [{ champId: "Nautilus", games: 72, winRate: 62 }, { champId: "Rell", games: 48, winRate: 55 }, { champId: "Braum", games: 38, winRate: 58 }], winRate: 58, kda: 3.9, games: 108, elo: "Grandmaster" },
  { id: "6", name: "Faker do CBLOL", team: "RED Canids", teamShort: "RED", region: "Brasil", platform: "br1", role: "Mid", mostPlayed: [{ champId: "Yasuo", games: 95, winRate: 61 }, { champId: "Yone", games: 88, winRate: 58 }, { champId: "Zed", games: 72, winRate: 63 }], winRate: 60, kda: 3.6, games: 156, elo: "Challenger" },

  // ═══ LCK (Coreia) ═══
  { id: "10", name: "Faker", team: "T1", teamShort: "T1", region: "Coreia do Sul", platform: "kr", role: "Mid", mostPlayed: [{ champId: "Azir", games: 120, winRate: 68 }, { champId: "Ahri", games: 95, winRate: 65 }, { champId: "LeBlanc", games: 80, winRate: 71 }], winRate: 67, kda: 5.8, games: 180, elo: "Challenger", twitch: "faker" },
  { id: "11", name: "Gumayusi", team: "T1", teamShort: "T1", region: "Coreia do Sul", platform: "kr", role: "ADC", mostPlayed: [{ champId: "Jinx", games: 98, winRate: 70 }, { champId: "Caitlyn", games: 82, winRate: 66 }, { champId: "Jhin", games: 75, winRate: 72 }], winRate: 69, kda: 6.2, games: 165, elo: "Challenger" },
  { id: "12", name: "Chovy", team: "Gen.G", teamShort: "GEN", region: "Coreia do Sul", platform: "kr", role: "Mid", mostPlayed: [{ champId: "Yone", games: 110, winRate: 65 }, { champId: "Akali", games: 88, winRate: 62 }, { champId: "K'Sante", games: 65, winRate: 68 }], winRate: 66, kda: 5.4, games: 172, elo: "Challenger" },
  { id: "13", name: "Zeus", team: "T1", teamShort: "T1", region: "Coreia do Sul", platform: "kr", role: "Top", mostPlayed: [{ champId: "Jayce", games: 105, winRate: 64 }, { champId: "Gwen", games: 78, winRate: 60 }, { champId: "Aatrox", games: 60, winRate: 66 }], winRate: 63, kda: 4.8, games: 155, elo: "Challenger" },

  // ═══ LEC (Europa) ═══
  { id: "20", name: "Caps", team: "G2 Esports", teamShort: "G2", region: "Europa Oeste", platform: "euw1", role: "Mid", mostPlayed: [{ champId: "Ryze", games: 78, winRate: 62 }, { champId: "Azir", games: 65, winRate: 59 }, { champId: "Sylas", games: 55, winRate: 64 }], winRate: 61, kda: 4.6, games: 140, elo: "Challenger", twitch: "g2caps" },
  { id: "21", name: "BrokenBlade", team: "G2 Esports", teamShort: "G2", region: "Europa Oeste", platform: "euw1", role: "Top", mostPlayed: [{ champId: "Darius", games: 85, winRate: 63 }, { champId: "Fiora", games: 62, winRate: 58 }, { champId: "Kled", games: 48, winRate: 66 }], winRate: 62, kda: 4.1, games: 132, elo: "Challenger" },
  { id: "22", name: "Elyoya", team: "MAD Lions", teamShort: "MAD", region: "Europa Oeste", platform: "euw1", role: "Jungle", mostPlayed: [{ champId: "Viego", games: 72, winRate: 57 }, { champId: "Jarvan IV", games: 58, winRate: 60 }, { champId: "Xin Zhao", games: 52, winRate: 55 }], winRate: 58, kda: 3.9, games: 125, elo: "Grandmaster" },

  // ═══ LCS (América do Norte) ═══
  { id: "30", name: "Bjergsen", team: "Team Liquid", teamShort: "TL", region: "América do Norte", platform: "na1", role: "Mid", mostPlayed: [{ champId: "Zilean", games: 68, winRate: 64 }, { champId: "Syndra", games: 55, winRate: 60 }, { champId: "Orianna", games: 48, winRate: 58 }], winRate: 62, kda: 5.2, games: 118, elo: "Challenger" },
  { id: "31", name: "Doublelift", team: "Cloud9", teamShort: "C9", region: "América do Norte", platform: "na1", role: "ADC", mostPlayed: [{ champId: "Vayne", games: 88, winRate: 61 }, { champId: "Ezreal", games: 72, winRate: 57 }, { champId: "Kai'Sa", games: 60, winRate: 59 }], winRate: 59, kda: 4.3, games: 135, elo: "Challenger" },

  // ═══ LPL (China) ═══
  { id: "40", name: "Knight", team: "JD Gaming", teamShort: "JDG", region: "Vietnã", platform: "vn2", role: "Mid", mostPlayed: [{ champId: "Sylas", games: 92, winRate: 66 }, { champId: "Ahri", games: 75, winRate: 63 }, { champId: "Jayce", games: 60, winRate: 68 }], winRate: 65, kda: 5.5, games: 148, elo: "Challenger" },

  // ═══ Outros pro players BR ═══
  { id: "50", name: "CeloBolado", team: "Fluxo", teamShort: "FX", region: "Brasil", platform: "br1", role: "Jungle", mostPlayed: [{ champId: "Graves", games: 78, winRate: 56 }, { champId: "Kindred", games: 62, winRate: 54 }, { champId: "Kha'Zix", games: 50, winRate: 58 }], winRate: 56, kda: 3.4, games: 110, elo: "Grandmaster" },
  { id: "51", name: "Kami", team: "paiN Gaming", teamShort: "PNG", region: "Brasil", platform: "br1", role: "Mid", mostPlayed: [{ champId: "Orianna", games: 65, winRate: 59 }, { champId: "Taliyah", games: 48, winRate: 56 }, { champId: "Viktor", games: 42, winRate: 60 }], winRate: 58, kda: 4.0, games: 102, elo: "Challenger" },
];

export function getProPlayers(): ProPlayer[] {
  return PRO_PLAYERS;
}

export function getProPlayersByRegion(regions: string[]): ProPlayer[] {
  if (regions.length === 0) return PRO_PLAYERS;
  return PRO_PLAYERS.filter((p) => regions.includes(p.platform));
}

export function getProPlayersByRole(players: ProPlayer[], role: string): ProPlayer[] {
  if (role === "Todos" || !role) return players;
  return players.filter((p) => p.role === role);
}

export function searchProPlayers(players: ProPlayer[], query: string): ProPlayer[] {
  const q = query.toLowerCase().trim();
  if (!q) return players;
  return players.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      p.mostPlayed.some((c) => c.champId.toLowerCase().includes(q))
  );
}

export const ROLES = ["Todos", "Top", "Jungle", "Mid", "ADC", "Suporte"];
