import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/types";
import {
  hasDB, initSchema, getCursor, setCursor,
  filterNewMatchIds, storeMatchViews, getScanStats,
  tryLockScan, unlockScan, storeOtpMastery,
  type StoredMatchRow, type OtpRow,
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

// Orçamento por execução (dev key = 100 req/2min por região regional):
//   match IDs (SCAN_PLAYERS) + detalhes+timelines (DETAIL_LIMIT × 2)
const SCAN_PLAYERS = 15; // jogadores do leaderboard processados por execução (avança via cursor)
const DETAIL_LIMIT = 30; // partidas NOVAS baixadas por execução
const MATCH_IDS_PER = 20;

export async function GET(req: NextRequest) {
  // ── Autenticação ──
  // Vercel Cron envia "Authorization: Bearer ${CRON_SECRET}". Também aceita ?secret= p/ cron externo.
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
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Modo rápido: varre apenas maestria (top 10 de cada jogador) sem baixar partidas.
 *  Popula a tabela otp_mastery para o modo One-Trick do site.
 *  NÃO usa lock — pode rodar em paralelo com scan completo. */
async function scanOtpOnly(region: string) {
  await initSchema();

  const players = await getLeaderboard(region);
  if (players.length === 0) {
    return { ok: false, error: "Leaderboard vazio — verifique a API Key" };
  }

  let cursor = await getCursor(region);
  if (cursor >= players.length) cursor = 0;
  const batch = players.slice(cursor, cursor + SCAN_PLAYERS);

  const OTP_THRESHOLD = 500_000;
  const { platHost } = hosts(region);
  const otpRows: OtpRow[] = [];

  for (let i = 0; i < batch.length; i += 5) {
    const slice = batch.slice(i, i + 5);
    const results = await Promise.all(
      slice.map(async (player) => {
        try {
          const res = await riotFetch(
            `${platHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${player.puuid}/top?count=10`
          );
          if (!res.ok) return [];
          const masteries: Array<{
            championId: number; championPoints: number; championLevel: number;
          }> = await res.json();
          return masteries
            .filter((m) => m.championPoints >= OTP_THRESHOLD)
            .map((m) => ({
              puuid: player.puuid,
              region,
              champion_id: m.championId,
              champion_points: m.championPoints,
              champion_level: m.championLevel,
              tier: player.tier,
              rank: player.rank,
              lp: player.lp,
            }));
        } catch {
          return [];
        }
      })
    );
    for (const r of results) otpRows.push(...r);
    await sleep(400); // mais rapido: so 5 reqs por lote (vs 10+5 no scan completo)
  }

  let storedOtp = 0;
  if (otpRows.length > 0) {
    storedOtp = await storeOtpMastery(otpRows);
  }

  const next = cursor + SCAN_PLAYERS;
  await setCursor(region, next >= players.length ? 0 : next);

  return {
    ok: true,
    region,
    mode: "otp",
    scanned: batch.length,
    otpStored: storedOtp,
    otpTotal: otpRows.length,
    cursor: next >= players.length ? 0 : next,
    leaderboardSize: players.length,
    stats: await getScanStats(region),
  };
}

async function scanRegion(region: string) {
  await initSchema();

  // Lock: impede scans simultâneos (cron-job.org + manual)
  if (!(await tryLockScan(region))) {
    return { ok: false, error: "Scan já está em andamento — tente novamente em 2 minutos." };
  }

  const players = await getLeaderboard(region);
  if (players.length === 0) {
    return { ok: false, error: "Leaderboard vazio — verifique a API Key" };
  }

  // Avança pelo leaderboard via cursor (volta ao início ao terminar → re-varre p/ pegar partidas novas)
  let cursor = await getCursor(region);
  if (cursor >= players.length) cursor = 0;
  const batch = players.slice(cursor, cursor + SCAN_PLAYERS);

  const startTimeSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // ── 1. Coleta match IDs ranqueados dos jogadores do lote ──
  const ownerByMatch = new Map<string, Player>();
  for (let i = 0; i < batch.length; i += 10) {
    const slice = batch.slice(i, i + 10);
    const res = await Promise.all(
      slice.map(async (p) => ({ p, ids: await getRankedMatchIds(region, p.puuid, MATCH_IDS_PER, startTimeSec) }))
    );
    for (const { p, ids } of res) {
      for (const id of ids) if (!ownerByMatch.has(id)) ownerByMatch.set(id, p);
    }
    await sleep(700);
  }

  // ── 2. Filtra as que ainda não estão indexadas (não rebaixa nada) ──
  const allIds = [...ownerByMatch.keys()];
  const newIds = (await filterNewMatchIds(region, allIds)).slice(0, DETAIL_LIMIT);

  if (newIds.length === 0) {
    const next = cursor + SCAN_PLAYERS;
    await setCursor(region, next >= players.length ? 0 : next);
    const stats = await getScanStats(region);
    return { ok: true, region, scanned: batch.length, newMatches: 0, rowsStored: 0, cursor: next, stats };
  }

  // ── 3. Baixa detalhe + timeline e indexa TODOS os campeões de cada partida ──
  const { regHost } = hosts(region);
  const rows: StoredMatchRow[] = [];

  for (let i = 0; i < newIds.length; i += 5) {
    const slice = newIds.slice(i, i + 5);
    await Promise.all(
      slice.map(async (mid) => {
        try {
          const [dRes, tRes] = await Promise.all([
            riotFetch(`${regHost}/lol/match/v5/matches/${mid}`),
            riotFetch(`${regHost}/lol/match/v5/matches/${mid}/timeline`),
          ]);
          if (!dRes.ok) return;
          const match = await dRes.json();
          const info = match.info;
          if (!info?.participants) return;
          // só ranqueada solo (queue 420)
          if (info.queueId !== 420) return;

          const timeline = tRes.ok ? await tRes.json() : null;
          const owner = ownerByMatch.get(mid)!;

          for (const part of info.participants as Array<Record<string, unknown>>) {
            const champ = part.championName as string;
            if (!champ) continue;
            const isOwner = part.puuid === owner.puuid;
            // Aproximação: em ranqueada de alto elo os 10 jogadores têm MMR próximo,
            // então o elo da partida ≈ elo do jogador do leaderboard que a trouxe.
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
            // Adiciona todos os participantes para exibicao no client
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

            rows.push({
              matchId: mid,
              puuid,
              region,
              champion: champ,
              tier: owner.tier,
              rank: owner.rank,
              lane: (view.lane as string) || null,
              win: (view.win as boolean) ?? null,
              gameCreation: (view.gameCreation as number) ?? 0,
              data: view,
            });
          }
        } catch {
          /* ignora partida com erro */
        }
      })
    );
    await sleep(700);
  }

  const stored = await storeMatchViews(rows);

  // ── 4. Coleta maestria dos jogadores do lote (top 10 campeões) ──
  //     Identifica One-Tricks (500k+) e grava na tabela otp_mastery
  //     para consulta instantânea no modo One-Trick do site.
  const OTP_THRESHOLD = 500_000;
  const { platHost } = hosts(region);
  const otpRows: OtpRow[] = [];

  for (let i = 0; i < batch.length; i += 5) {
    const slice = batch.slice(i, i + 5);
    const results = await Promise.all(
      slice.map(async (player) => {
        try {
          const res = await riotFetch(
            `${platHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${player.puuid}/top?count=10`
          );
          if (!res.ok) return [];
          const masteries: Array<{
            championId: number; championName?: string;
            championPoints: number; championLevel: number;
          }> = await res.json();
          return masteries
            .filter((m) => m.championPoints >= OTP_THRESHOLD)
            .map((m) => ({
              puuid: player.puuid,
              region,
              champion_id: m.championId,
              champion_points: m.championPoints,
              champion_level: m.championLevel,
              tier: player.tier,
              rank: player.rank,
              lp: player.lp,
            }));
        } catch {
          return [];
        }
      })
    );
    for (const r of results) otpRows.push(...r);
    await sleep(700);
  }

  if (otpRows.length > 0) {
    await storeOtpMastery(otpRows);
  }

  const next = cursor + SCAN_PLAYERS;
  await setCursor(region, next >= players.length ? 0 : next);

  const stats = await getScanStats(region);
  return {
    ok: true,
    region,
    scanned: batch.length,
    newMatches: newIds.length,
    rowsStored: stored,
    otpStored: otpRows.length,
    cursor: next >= players.length ? 0 : next,
    leaderboardSize: players.length,
    stats,
  };
}
