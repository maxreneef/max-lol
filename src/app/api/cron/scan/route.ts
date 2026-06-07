import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/types";
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

// Cada execução roda uma varredura incremental respeitando o rate limit da dev key.
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const API_KEY = process.env.RIOT_API_KEY;

// Orçamento por execução (dev key = 100 req/2min):
//   Leaderboard ~28 chamadas (cache 30min) + match IDs ~10 + detalhes ~20 + mastery ~10 = ~68
//   Com cache 24h nos detalhes (imutáveis), chamadas reais caem pra ~38 por execução.
const SCAN_PLAYERS = 10; // jogadores do leaderboard processados por execução
const DETAIL_LIMIT = 10; // partidas NOVAS baixadas por execução
const MATCH_IDS_PER = 20;
const OTP_THRESHOLD = 500_000;

export async function GET(req: NextRequest) {
  // ── Autenticação ──
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    const qs = req.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${CRON_SECRET}` && qs !== CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }
  }

  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "RIOT_API_KEY ausente" }, { status: 500 });
  }
  if (!hasDB) {
    return NextResponse.json({
      ok: false,
      error: "Banco não provisionado — defina DATABASE_URL (Neon/Postgres) no Vercel",
    });
  }

  const region = req.nextUrl.searchParams.get("region") ?? "br1";
  if (!isPlatform(region)) {
    return NextResponse.json({ ok: false, error: "Região inválida" }, { status: 400 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "full"; // "full" | "otp"

  try {
    const result = mode === "otp"
      ? await scanOtpOnly(region)
      : await scanRegion(region);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    // Garante que lock seja liberado e cursor NAO seja alterado
    try { await unlockScan(region); } catch { /* ignora */ }
    const cursorPreservado = await getCursor(region).catch(() => -1);
    console.error(`[scan] ERRO FATAL ${region} (cursor preservado em ${cursorPreservado}):`, msg);
    return NextResponse.json({
      ok: false,
      error: msg,
      cursorPreservado, // indica que o cursor NAO foi perdido
    }, { status: 500 });
  }
}

/** Modo rápido: varre apenas maestria (top 10 de cada jogador) sem baixar partidas.
 *  Popula as tabelas otp_mastery e all_mastery.
 *  NÃO usa lock — pode rodar em paralelo com scan completo. */
async function scanOtpOnly(region: string) {
  await initSchema();

  const players = await getLeaderboard(region, true); // usa cache 30min — leaderboard é pesado e não muda rápido
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
          const masteries: Array<{
            championId: number; championPoints: number; championLevel: number;
          }> = await res.json();
          return { player, masteries };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (!r) continue;
      const { player, masteries } = r;

      // otpRows: apenas 500k+ (para tabela otp_mastery e modo One-Trick)
      for (const m of masteries) {
        if (m.championPoints >= OTP_THRESHOLD) {
          otpRows.push({
            puuid: player.puuid,
            region,
            champion_id: m.championId,
            champion_points: m.championPoints,
            champion_level: m.championLevel,
            tier: player.tier,
            rank: player.rank,
            lp: player.lp,
          });
        }
      }

      // allRows: TODOS os dados de maestria com flag is_otp
      for (const m of masteries) {
        allRows.push({
          puuid: player.puuid,
          region,
          champion_id: m.championId,
          champion_name: null, // preenchido depois via Data Dragon se necessário
          champion_points: m.championPoints,
          champion_level: m.championLevel,
          is_otp: m.championPoints >= OTP_THRESHOLD,
          tier: player.tier,
          rank: player.rank,
          lp: player.lp,
        });
      }
    }
    await sleep(400);
  }

  let storedOtp = 0;
  let storedAll = 0;
  if (otpRows.length > 0) storedOtp = await storeOtpMastery(otpRows);
  if (allRows.length > 0) storedAll = await storeAllMastery(allRows);

  const next = cursor + SCAN_PLAYERS;
  await setCursor(region, next >= players.length ? 0 : next);

  return {
    ok: true,
    region,
    mode: "otp",
    scanned: batch.length,
    otpStored: storedOtp,
    allMasteryStored: storedAll,
    otpTotal: otpRows.length,
    allMasteryTotal: allRows.length,
    cursor: next >= players.length ? 0 : next,
    leaderboardSize: players.length,
    stats: await getScanStats(region),
  };
}

async function scanRegion(region: string) {
  await initSchema();

  // Lock: impede scans simultâneos do mesmo servidor
  if (!(await tryLockScan(region))) {
    return { ok: false, error: "Scan já está em andamento — tente novamente em 2 minutos." };
  }

  try {
    const players = await getLeaderboard(region, true); // usa cache 30min — leaderboard é pesado e não muda rápido
    if (players.length === 0) {
      const cursorAtual = await getCursor(region);
      await unlockScan(region);
      return { ok: false, error: "Leaderboard vazio — verifique a API Key", cursor: cursorAtual };
    }

    // Avança pelo leaderboard via cursor (NUNCA reseta em caso de erro)
    let cursor = await getCursor(region);
    if (cursor >= players.length) cursor = 0;
    const batch = players.slice(cursor, cursor + SCAN_PLAYERS);

    const startTimeSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // ── 1. Coleta match IDs ranqueados dos jogadores do lote ──
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

    // ── 2. Filtra as que ainda não estão indexadas ──
    const allIds = [...ownerByMatch.keys()];
    const newIds = (await filterNewMatchIds(region, allIds)).slice(0, DETAIL_LIMIT);

    // ── 3. Baixa detalhe + timeline e indexa TODOS os campeões de cada partida ──
    const { regHost } = hosts(region);
    const rows: StoredMatchRow[] = [];
    let matchesDownloaded = 0;
    let matchErrors = 0;

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
              if (!info?.participants) return null;
              // só ranqueada solo (queue 420)
              if (info.queueId !== 420) return null;

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
                  matchId: mid,
                  puuid,
                  region,
                  champion: champ,
                  tier: owner.tier,
                  rank: owner.rank,
                  lane: (view.lane as string) || null,
                  win: (view.win as boolean) ?? null,
                  gameCreation: (view.gameCreation as number) ?? 0,
                  patch,
                  gameVersion,
                  data: view,
                });
              }
              return participantRows;
            } catch {
              return null;
            }
          })
        );
        for (const r of results) {
          if (r) {
            rows.push(...r);
            matchesDownloaded++;
          } else {
            matchErrors++;
          }
        }
        await sleep(700);
      }
    }

    const stored = await storeMatchViews(rows);

    // ── 4. Coleta maestria dos jogadores do lote (top 10 campeões) ──
    //     Popula DUAS tabelas:
    //       otp_mastery: apenas jogadores com 500k+ (modo One-Trick rápido)
    //       all_mastery: TODOS os dados de maestria com flag is_otp (banco completo)
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
            const masteries: Array<{
              championId: number; championPoints: number; championLevel: number;
            }> = await res.json();
            return { player, masteries };
          } catch {
            return null;
          }
        })
      );
      for (const r of results) {
        if (!r) continue;
        const { player, masteries } = r;

        // otpRows: apenas 500k+
        for (const m of masteries) {
          if (m.championPoints >= OTP_THRESHOLD) {
            otpRows.push({
              puuid: player.puuid,
              region,
              champion_id: m.championId,
              champion_points: m.championPoints,
              champion_level: m.championLevel,
              tier: player.tier,
              rank: player.rank,
              lp: player.lp,
            });
          }
        }

        // allRows: TODOS com flag is_otp
        for (const m of masteries) {
          allRows.push({
            puuid: player.puuid,
            region,
            champion_id: m.championId,
            champion_name: null,
            champion_points: m.championPoints,
            champion_level: m.championLevel,
            is_otp: m.championPoints >= OTP_THRESHOLD,
            tier: player.tier,
            rank: player.rank,
            lp: player.lp,
          });
        }
      }
      await sleep(700);
    }

    let storedOtp = 0;
    let storedAllMastery = 0;
    if (otpRows.length > 0) storedOtp = await storeOtpMastery(otpRows);
    if (allRows.length > 0) storedAllMastery = await storeAllMastery(allRows);

    const next = cursor + SCAN_PLAYERS;
    await setCursor(region, next >= players.length ? 0 : next);

    // Retenção por patch + limpeza de >30 dias (throttled internamente a 1x/hora).
    let retention = null;
    try { retention = await enforceRetention(); } catch { /* nunca bloqueia o scan */ }

    const stats = await getScanStats(region);
    return {
      ok: true,
      region,
      scanned: batch.length,
      newMatches: newIds.length,
      matchesDownloaded,
      matchErrors,
      rowsStored: stored,
      otpStored: storedOtp,
      allMasteryStored: storedAllMastery,
      otpTotal: otpRows.length,
      allMasteryTotal: allRows.length,
      cursor: next >= players.length ? 0 : next,
      leaderboardSize: players.length,
      patch: retention?.currentPatch ?? null,
      retention,
      stats,
    };
  } finally {
    // SEMPRE libera o lock, mesmo em caso de erro
    await unlockScan(region);
  }
}
