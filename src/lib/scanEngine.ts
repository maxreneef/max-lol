/**
 * Módulo compartilhado de scan — usado tanto por /api/cron/scan (individual)
 * quanto por /api/cron/scan-all (rotativo entre servidores).
 */
import {
  hasDB, initSchema, getCursor, setCursor,
  filterNewMatchIds, storeMatchViews, getScanStats,
  tryLockScan, unlockScan, storeOtpMastery, storeAllMastery,
  patchFromGameVersion, enforceRetention,
  type StoredMatchRow, type OtpRow, type AllMasteryRow,
} from "@/lib/matchStore";
import {
  getLeaderboard, getRankedMatchIds, riotFetch, hosts,
  buildMatchView, extractSkillOrder, extractItemPurchases,
  extractSkillLevelUps, sleep, type Player,
} from "@/lib/riotMatches";

const API_KEY = process.env.RIOT_API_KEY;
const SCAN_PLAYERS = 15;
const DETAIL_LIMIT = 30;
const MATCH_IDS_PER = 20;
const OTP_THRESHOLD = 500_000;

export interface ScanResult {
  ok: boolean;
  error?: string;
  region?: string;
  scanned?: number;
  newMatches?: number;
  matchesDownloaded?: number;
  matchErrors?: number;
  rowsStored?: number;
  otpStored?: number;
  allMasteryStored?: number;
  otpTotal?: number;
  allMasteryTotal?: number;
  cursor?: number;
  leaderboardSize?: number;
  patch?: string | null;
  retention?: unknown;
  stats?: { totalRows: number; champions: number; cursor: number };
}

/** Modo rápido: varre apenas maestria (top 10 de cada jogador) sem baixar partidas. */
export async function scanOtpOnly(region: string): Promise<ScanResult> {
  await initSchema();

  const players = await getLeaderboard(region, true);
  if (players.length === 0) {
    return { ok: false, error: "Leaderboard vazio — verifique a API Key" };
  }

  let cursor = await getCursor(region);
  if (cursor >= players.length) cursor = 0;
  const batch = players.slice(cursor, cursor + SCAN_PLAYERS);

  const { platHost } = hosts(region);
  const otpRows: OtpRow[] = [];
  const allRows: AllMasteryRow[] = [];

  for (let i = 0; i < batch.length; i += 5) {
    const slice = batch.slice(i, i + 5);
    const results = await Promise.all(
      slice.map(async (player) => {
        try {
          const res = await riotFetch(
            `${platHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${player.puuid}/top?count=10`,
            { useCache: false, revalidate: 1800 }
          );
          if (!res.ok) return null;
          const masteries: Array<{ championId: number; championPoints: number; championLevel: number }> = await res.json();
          return { player, masteries };
        } catch { return null; }
      })
    );
    for (const r of results) {
      if (!r) continue;
      const { player, masteries } = r;
      for (const m of masteries) {
        if (m.championPoints >= OTP_THRESHOLD) {
          otpRows.push({ puuid: player.puuid, region, champion_id: m.championId, champion_points: m.championPoints, champion_level: m.championLevel, tier: player.tier, rank: player.rank, lp: player.lp });
        }
      }
      for (const m of masteries) {
        allRows.push({ puuid: player.puuid, region, champion_id: m.championId, champion_name: null, champion_points: m.championPoints, champion_level: m.championLevel, is_otp: m.championPoints >= OTP_THRESHOLD, tier: player.tier, rank: player.rank, lp: player.lp });
      }
    }
    await sleep(400);
  }

  let storedOtp = 0, storedAll = 0;
  if (otpRows.length > 0) storedOtp = await storeOtpMastery(otpRows);
  if (allRows.length > 0) storedAll = await storeAllMastery(allRows);

  const next = cursor + SCAN_PLAYERS;
  await setCursor(region, next >= players.length ? 0 : next);

  return {
    ok: true, region,
    scanned: batch.length, otpStored: storedOtp, allMasteryStored: storedAll,
    otpTotal: otpRows.length, allMasteryTotal: allRows.length,
    cursor: next >= players.length ? 0 : next,
    leaderboardSize: players.length,
    stats: await getScanStats(region),
  };
}

/** Scan completo: leaderboard + partidas + maestria. */
export async function scanRegion(region: string): Promise<ScanResult> {
  await initSchema();

  if (!(await tryLockScan(region))) {
    return { ok: false, error: "Scan já está em andamento — tente novamente em 2 minutos." };
  }

  try {
    const players = await getLeaderboard(region, true);
    if (players.length === 0) {
      await unlockScan(region);
      return { ok: false, error: "Leaderboard vazio — verifique a API Key" };
    }

    let cursor = await getCursor(region);
    if (cursor >= players.length) cursor = 0;
    const batch = players.slice(cursor, cursor + SCAN_PLAYERS);

    const { regHost, platHost } = hosts(region);
    const startTimeSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // 1. Match IDs
    const ownerByMatch = new Map<string, Player>();
    for (let i = 0; i < batch.length; i += 10) {
      const slice = batch.slice(i, i + 10);
      const res = await Promise.all(
        slice.map(async (p) => ({
          p,
          ids: await getRankedMatchIds(region, p.puuid, MATCH_IDS_PER, startTimeSec, false),
        }))
      );
      for (const { p, ids } of res) {
        for (const id of ids) if (!ownerByMatch.has(id)) ownerByMatch.set(id, p);
      }
      await sleep(700);
    }

    // 2. Filtrar novas
    const allIds = [...ownerByMatch.keys()];
    const newIds = (await filterNewMatchIds(region, allIds)).slice(0, DETAIL_LIMIT);

    // 3. Detalhes + timeline
    const rows: StoredMatchRow[] = [];
    let matchesDownloaded = 0, matchErrors = 0;

    if (newIds.length > 0) {
      for (let i = 0; i < newIds.length; i += 5) {
        const slice = newIds.slice(i, i + 5);
        const results = await Promise.all(
          slice.map(async (mid) => {
            try {
              const [dRes, tRes] = await Promise.all([
                riotFetch(`${regHost}/lol/match/v5/matches/${mid}`, { useCache: false, revalidate: 86400 }),
                riotFetch(`${regHost}/lol/match/v5/matches/${mid}/timeline`, { useCache: false, revalidate: 86400 }),
              ]);
              if (!dRes.ok) return null;
              const match = await dRes.json();
              const info = match.info;
              if (!info?.participants || info.queueId !== 420) return null;

              const gameVersion = (info.gameVersion as string) ?? null;
              const patch = patchFromGameVersion(gameVersion);
              const timeline = tRes.ok ? await tRes.json() : null;
              const owner = ownerByMatch.get(mid)!;
              const participantRows: StoredMatchRow[] = [];

              for (const part of info.participants as Array<Record<string, unknown>>) {
                const champ = part.championName as string;
                if (!champ) continue;
                const isOwner = part.puuid === owner.puuid;
                const view = buildMatchView(mid, info, part, {
                  tier: owner.tier, rank: owner.rank, lp: isOwner ? owner.lp : 0, platform: region,
                });
                if (timeline) {
                  view.skillOrder = extractSkillOrder(timeline, part.puuid as string);
                  const tlPart = (timeline.info as { participants?: Array<{ participantId: number; puuid: string }> })?.participants?.find((x) => x.puuid === (part.puuid as string));
                  if (tlPart) {
                    const pid = tlPart.participantId;
                    view.itemPurchaseOrder = extractItemPurchases(timeline, pid);
                    view.skillLevelUpOrder = extractSkillLevelUps(timeline, pid);
                  }
                }
                view.allParticipants = (info.participants as Array<Record<string, unknown>>).map((pp) => ({
                  summonerName: (pp.riotIdGameName as string) || (pp.summonerName as string) || "",
                  tagLine: (pp.riotIdTagline as string) || "",
                  championId: (pp.championName as string) || "",
                  teamId: pp.teamId as number,
                  win: pp.win as boolean,
                  puuid: pp.puuid as string,
                }));
                const puuid = view._puuid as string;
                delete view._puuid;
                participantRows.push({
                  matchId: mid, puuid, region, champion: champ,
                  tier: owner.tier, rank: owner.rank,
                  lane: (view.lane as string) || null,
                  win: (view.win as boolean) ?? null,
                  gameCreation: (view.gameCreation as number) ?? 0,
                  patch, gameVersion, data: view,
                });
              }
              return participantRows;
            } catch { return null; }
          })
        );
        for (const r of results) {
          if (r) { rows.push(...r); matchesDownloaded++; }
          else { matchErrors++; }
        }
        await sleep(700);
      }
    }

    const stored = await storeMatchViews(rows);

    // 4. Maestria
    const otpRows: OtpRow[] = [];
    const allRows: AllMasteryRow[] = [];
    for (let i = 0; i < batch.length; i += 5) {
      const slice = batch.slice(i, i + 5);
      const results = await Promise.all(
        slice.map(async (player) => {
          try {
            const res = await riotFetch(
              `${platHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${player.puuid}/top?count=10`,
              { useCache: false, revalidate: 1800 }
            );
            if (!res.ok) return null;
            const masteries: Array<{ championId: number; championPoints: number; championLevel: number }> = await res.json();
            return { player, masteries };
          } catch { return null; }
        })
      );
      for (const r of results) {
        if (!r) continue;
        const { player, masteries } = r;
        for (const m of masteries) {
          if (m.championPoints >= OTP_THRESHOLD) {
            otpRows.push({ puuid: player.puuid, region, champion_id: m.championId, champion_points: m.championPoints, champion_level: m.championLevel, tier: player.tier, rank: player.rank, lp: player.lp });
          }
        }
        for (const m of masteries) {
          allRows.push({ puuid: player.puuid, region, champion_id: m.championId, champion_name: null, champion_points: m.championPoints, champion_level: m.championLevel, is_otp: m.championPoints >= OTP_THRESHOLD, tier: player.tier, rank: player.rank, lp: player.lp });
        }
      }
      await sleep(700);
    }

    let storedOtp = 0, storedAll = 0;
    if (otpRows.length > 0) storedOtp = await storeOtpMastery(otpRows);
    if (allRows.length > 0) storedAll = await storeAllMastery(allRows);

    const next = cursor + SCAN_PLAYERS;
    await setCursor(region, next >= players.length ? 0 : next);

    let retention = null;
    try { retention = await enforceRetention(); } catch { /* ok */ }

    const stats = await getScanStats(region);
    return {
      ok: true, region,
      scanned: batch.length, newMatches: newIds.length,
      matchesDownloaded, matchErrors, rowsStored: stored,
      otpStored: storedOtp, allMasteryStored: storedAll,
      otpTotal: otpRows.length, allMasteryTotal: allRows.length,
      cursor: next >= players.length ? 0 : next,
      leaderboardSize: players.length,
      patch: retention?.currentPatch ?? null,
      retention, stats,
    };
  } finally {
    await unlockScan(region);
  }
}
