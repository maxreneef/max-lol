/**
 * Camada de storage persistente (Turso / libSQL / SQLite) para partidas indexadas
 * por campeão e maestria pré-computada.
 *
 * O robô (/api/cron/scan) varre partidas de alto elo e indexa TODOS os campeões de
 * cada partida. O endpoint /matches lê daqui (instantâneo). Se o banco não estiver
 * provisionado (sem TURSO_DATABASE_URL), tudo opera em modo no-op e o site continua
 * usando a busca ao vivo como fallback.
 *
 * Otimizações vs. versão Postgres anterior:
 *   - allParticipants NÃO é mais duplicado nas 10 linhas: fica 1x por partida em match_meta.
 *   - Cada partida guarda o `patch` (ex: "15.11") → retenção por patch.
 */
import { DD_BASE } from "@/lib/ddragon";
import { createClient, type InStatement } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

export const hasDB = !!TURSO_URL;

const db = hasDB
  ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN || undefined, intMode: "number" })
  : null;

// Retenção: dias de "sobreposição" após troca de patch antes de apagar o anterior.
const PATCH_OVERLAP_DAYS = 7;
// Rede de segurança: nada mais velho que isto sobrevive (cobre dados "legacy" sem patch).
const MAX_AGE_DAYS = 30;
// Throttle da limpeza (não roda a cada scan).
const RETENTION_INTERVAL_MS = 60 * 60 * 1000; // 1h

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface StoredMatchRow {
  matchId: string;
  puuid: string;
  region: string;
  champion: string;          // championName da Riot (normalizado p/ minúsculas)
  tier: string | null;
  rank: string | null;
  lane: string | null;
  win: boolean | null;
  gameCreation: number;
  patch?: string | null;        // ex: "15.11" (derivado de gameVersion)
  gameVersion?: string | null;  // versão completa
  data: Record<string, unknown>; // "visão" da partida p/ aquele participante (inclui allParticipants na entrada)
}

export interface GetOpts {
  tiers?: string[];
  lane?: string;
  minMastery?: number;
  puuids?: string[];
  limit: number;
}

export interface OtpRow {
  puuid: string;
  region: string;
  champion_id: number;
  champion_points: number;
  champion_level: number;
  tier: string | null;
  rank: string | null;
  lp: number;
}

export interface AllMasteryRow {
  puuid: string;
  region: string;
  champion_id: number;
  champion_name: string | null;
  champion_points: number;
  champion_level: number;
  is_otp: boolean;
  tier: string | null;
  rank: string | null;
  lp: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Gera "?,?,?" com n placeholders. */
function ph(n: number): string {
  return new Array(n).fill("?").join(",");
}

/** Executa statements em lote (transação), fatiando para não estourar limites. */
async function batchChunked(stmts: InStatement[], size = 100): Promise<void> {
  if (!db) return;
  for (let i = 0; i < stmts.length; i += size) {
    await db.batch(stmts.slice(i, i + size), "write");
  }
}

/** Deriva o patch (ex: "15.11") a partir do gameVersion ("15.11.673.1234"). */
export function patchFromGameVersion(gv: string | null | undefined): string | null {
  if (!gv) return null;
  const parts = String(gv).split(".");
  if (parts.length < 2) return null;
  return `${parts[0]}.${parts[1]}`;
}

// ── Schema ──────────────────────────────────────────────────────────────────
let schemaReady = false;
async function ensureSchema(): Promise<void> {
  if (!db || schemaReady) return;
  await db.batch(
    [
      // Visão por participante (1 linha por participante) — SEM allParticipants.
      `CREATE TABLE IF NOT EXISTS champion_matches (
        match_id      TEXT NOT NULL,
        puuid         TEXT NOT NULL,
        region        TEXT NOT NULL,
        champion      TEXT NOT NULL,
        tier          TEXT,
        rank          TEXT,
        lane          TEXT,
        win           INTEGER,
        game_creation INTEGER,
        patch         TEXT,
        data          TEXT,
        indexed_at    INTEGER,
        PRIMARY KEY (match_id, puuid)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cm_lookup ON champion_matches (region, champion, game_creation DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_cm_patch ON champion_matches (patch)`,
      `CREATE INDEX IF NOT EXISTS idx_cm_age ON champion_matches (game_creation)`,
      // Metadados da partida (1 linha por partida) — guarda os 10 participantes UMA vez.
      `CREATE TABLE IF NOT EXISTS match_meta (
        match_id      TEXT PRIMARY KEY,
        region        TEXT NOT NULL,
        patch         TEXT,
        game_version  TEXT,
        queue_id      INTEGER,
        game_creation INTEGER,
        participants  TEXT,
        indexed_at    INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_mm_patch ON match_meta (patch)`,
      `CREATE INDEX IF NOT EXISTS idx_mm_age ON match_meta (game_creation)`,
      `CREATE TABLE IF NOT EXISTS scan_state (
        region     TEXT PRIMARY KEY,
        cursor     INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS otp_mastery (
        puuid           TEXT NOT NULL,
        region          TEXT NOT NULL,
        champion_id     INTEGER NOT NULL,
        champion_points INTEGER NOT NULL,
        champion_level  INTEGER NOT NULL,
        tier            TEXT,
        rank            TEXT,
        lp              INTEGER,
        last_updated    INTEGER,
        PRIMARY KEY (puuid, champion_id)
      )`,
      // TODOS os dados de maestria (top 10 de cada jogador) + flag is_otp (500k+).
      `CREATE TABLE IF NOT EXISTS all_mastery (
        puuid           TEXT NOT NULL,
        region          TEXT NOT NULL,
        champion_id     INTEGER NOT NULL,
        champion_name   TEXT,
        champion_points INTEGER NOT NULL,
        champion_level  INTEGER NOT NULL,
        is_otp          INTEGER NOT NULL DEFAULT 0,
        tier            TEXT,
        rank            TEXT,
        lp              INTEGER,
        last_updated    INTEGER,
        PRIMARY KEY (puuid, champion_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_am_lookup ON all_mastery (region, champion_id, champion_points DESC)`,
      // Controle de retenção por patch (singleton id=1).
      `CREATE TABLE IF NOT EXISTS patch_state (
        id                INTEGER PRIMARY KEY CHECK (id = 1),
        current_patch     TEXT,
        detected_at       INTEGER,
        last_retention_at INTEGER
      )`,
    ],
    "write"
  );
  schemaReady = true;
}

/** Garante o schema sob demanda (usado pelo cron antes de gravar). */
export async function initSchema(): Promise<void> {
  await ensureSchema();
}

// ── Leitura ─────────────────────────────────────────────────────────────────

/** Lê partidas de um campeão, ordenadas da mais recente, com filtros opcionais.
 *  Reanexa allParticipants a partir de match_meta (1 query extra). */
export async function getStoredMatches(
  region: string,
  champion: string,
  opts: GetOpts
): Promise<Record<string, unknown>[]> {
  if (!db) return [];
  await ensureSchema();
  const champ = champion.toLowerCase();
  const limit = Math.min(Math.max(opts.limit, 1), 10000);

  const where: string[] = ["region = ?", "champion = ?"];
  const args: Array<string | number> = [region, champ];

  if (opts.tiers?.length) {
    where.push(`tier IN (${ph(opts.tiers.length)})`);
    args.push(...opts.tiers);
  }
  if (opts.lane) {
    where.push("lane = ?");
    args.push(opts.lane);
  }
  if (opts.minMastery && opts.minMastery > 0) {
    where.push("CAST(json_extract(data, '$.championPoints') AS INTEGER) >= ?");
    args.push(opts.minMastery);
  }
  if (opts.puuids?.length) {
    where.push(`puuid IN (${ph(opts.puuids.length)})`);
    args.push(...opts.puuids);
  }

  const rs = await db.execute({
    sql: `SELECT match_id, data FROM champion_matches WHERE ${where.join(" AND ")} ORDER BY game_creation DESC LIMIT ?`,
    args: [...args, limit],
  });

  const parsed = rs.rows.map((r) => ({
    matchId: r.match_id as string,
    data: JSON.parse(r.data as string) as Record<string, unknown>,
  }));

  // Reanexa allParticipants a partir de match_meta (1x por partida).
  const ids = [...new Set(parsed.map((p) => p.matchId))];
  if (ids.length > 0) {
    const mrs = await db.execute({
      sql: `SELECT match_id, participants FROM match_meta WHERE match_id IN (${ph(ids.length)})`,
      args: ids,
    });
    const pmap = new Map<string, unknown>(
      mrs.rows.map((m) => [
        m.match_id as string,
        m.participants ? JSON.parse(m.participants as string) : [],
      ])
    );
    for (const p of parsed) {
      p.data.allParticipants = pmap.get(p.matchId) ?? [];
    }
  }

  return parsed.map((p) => p.data);
}

/** Quantas partidas de um campeão já estão indexadas (decide usar banco x fallback). */
export async function getStoredCount(region: string, champion: string): Promise<number> {
  if (!db) return 0;
  await ensureSchema();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM champion_matches WHERE region = ? AND champion = ?`,
    args: [region, champion.toLowerCase()],
  });
  return Number(rs.rows[0]?.n ?? 0);
}

/** Dos match IDs informados, retorna os que AINDA NÃO foram indexados. */
export async function filterNewMatchIds(region: string, ids: string[]): Promise<string[]> {
  if (!db || ids.length === 0) return ids;
  await ensureSchema();
  const seen = new Set<string>();
  // Fatiar para respeitar o limite de variáveis do SQLite.
  for (let i = 0; i < ids.length; i += 400) {
    const slice = ids.slice(i, i + 400);
    const rs = await db.execute({
      sql: `SELECT DISTINCT match_id FROM champion_matches WHERE region = ? AND match_id IN (${ph(slice.length)})`,
      args: [region, ...slice],
    });
    for (const r of rs.rows) seen.add(r.match_id as string);
  }
  return ids.filter((id) => !seen.has(id));
}

// ── Gravação ────────────────────────────────────────────────────────────────

/** Insere as "visões" de partida (1 por participante) + metadados (1 por partida).
 *  Deduplica allParticipants: move para match_meta e remove do data de cada linha. */
export async function storeMatchViews(rows: StoredMatchRow[]): Promise<number> {
  if (!db || rows.length === 0) return 0;
  await ensureSchema();
  const now = Date.now();

  // 1. Metadados por partida (1x), extraindo allParticipants.
  const metas = new Map<string, InStatement>();
  for (const r of rows) {
    if (metas.has(r.matchId)) continue;
    const d = r.data as Record<string, unknown>;
    const participants = d.allParticipants ? JSON.stringify(d.allParticipants) : null;
    metas.set(r.matchId, {
      sql: `INSERT INTO match_meta (match_id, region, patch, game_version, queue_id, game_creation, participants, indexed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(match_id) DO UPDATE SET
              patch = excluded.patch,
              game_version = excluded.game_version,
              queue_id = excluded.queue_id,
              participants = COALESCE(excluded.participants, match_meta.participants)`,
      args: [
        r.matchId,
        r.region,
        r.patch ?? null,
        r.gameVersion ?? null,
        (d.queueId as number) ?? null,
        r.gameCreation ?? 0,
        participants,
        now,
      ],
    });
  }

  // 2. Visões por participante (data SEM allParticipants).
  const cmStmts: InStatement[] = rows.map((r) => {
    const d: Record<string, unknown> = { ...(r.data as Record<string, unknown>) };
    delete d.allParticipants; // dedup: vive só em match_meta
    return {
      sql: `INSERT INTO champion_matches
              (match_id, puuid, region, champion, tier, rank, lane, win, game_creation, patch, data, indexed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(match_id, puuid) DO NOTHING`,
      args: [
        r.matchId,
        r.puuid,
        r.region,
        r.champion.toLowerCase(),
        r.tier,
        r.rank,
        r.lane,
        r.win === null || r.win === undefined ? null : r.win ? 1 : 0,
        r.gameCreation ?? 0,
        r.patch ?? null,
        JSON.stringify(d),
        now,
      ],
    };
  });

  await batchChunked([...metas.values(), ...cmStmts]);
  return rows.length;
}

// ── Cursor de varredura ─────────────────────────────────────────────────────

export async function getCursor(region: string): Promise<number> {
  if (!db) return 0;
  await ensureSchema();
  const rs = await db.execute({
    sql: `SELECT cursor FROM scan_state WHERE region = ?`,
    args: [region],
  });
  return Number(rs.rows[0]?.cursor ?? 0);
}

/** Tenta obter lock para scan. Retorna true se conseguiu, false se outro scan roda. */
export async function tryLockScan(region: string): Promise<boolean> {
  if (!db) return true;
  await ensureSchema();
  const now = Date.now();
  const LOCK_DURATION = 120_000; // 2 min — tempo máximo de um scan
  // Garante que a linha exista (primeira varredura da região).
  await db.execute({
    sql: `INSERT INTO scan_state (region, cursor, updated_at) VALUES (?, 0, NULL) ON CONFLICT(region) DO NOTHING`,
    args: [region],
  });
  const rs = await db.execute({
    sql: `UPDATE scan_state SET updated_at = ? WHERE region = ? AND (updated_at IS NULL OR updated_at < ?)`,
    args: [now, region, now - LOCK_DURATION],
  });
  return rs.rowsAffected > 0;
}

export async function setCursor(region: string, cursor: number): Promise<void> {
  if (!db) return;
  await ensureSchema();
  // updated_at = 0 libera o lock para o próximo scan
  await db.execute({
    sql: `INSERT INTO scan_state (region, cursor, updated_at) VALUES (?, ?, 0)
          ON CONFLICT(region) DO UPDATE SET cursor = excluded.cursor, updated_at = 0`,
    args: [region, cursor],
  });
}

/** Reseta o lock (em caso de erro). */
export async function unlockScan(region: string): Promise<void> {
  if (!db) return;
  await db.execute({
    sql: `UPDATE scan_state SET updated_at = 0 WHERE region = ?`,
    args: [region],
  });
}

/** Estatísticas rápidas para diagnóstico do robô. */
export async function getScanStats(region: string): Promise<{
  totalRows: number;
  champions: number;
  cursor: number;
}> {
  if (!db) return { totalRows: 0, champions: 0, cursor: 0 };
  await ensureSchema();
  const a = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM champion_matches WHERE region = ?`,
    args: [region],
  });
  const b = await db.execute({
    sql: `SELECT COUNT(DISTINCT champion) AS n FROM champion_matches WHERE region = ?`,
    args: [region],
  });
  return {
    totalRows: Number(a.rows[0]?.n ?? 0),
    champions: Number(b.rows[0]?.n ?? 0),
    cursor: await getCursor(region),
  };
}

// ── Maestria ──────────────────────────────────────────────────────────────────

/** Grava jogadores com 500k+ de maestria em lote (UPSERT). */
export async function storeOtpMastery(rows: OtpRow[]): Promise<number> {
  if (!db || rows.length === 0) return 0;
  await ensureSchema();
  const now = Date.now();
  const stmts: InStatement[] = rows.map((r) => ({
    sql: `INSERT INTO otp_mastery
            (puuid, region, champion_id, champion_points, champion_level, tier, rank, lp, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(puuid, champion_id) DO UPDATE SET
            champion_points = excluded.champion_points,
            champion_level  = excluded.champion_level,
            tier            = excluded.tier,
            rank            = excluded.rank,
            lp              = excluded.lp,
            last_updated    = excluded.last_updated`,
    args: [r.puuid, r.region, r.champion_id, r.champion_points, r.champion_level, r.tier, r.rank, r.lp, now],
  }));
  await batchChunked(stmts);
  return rows.length;
}

/** Grava TODOS os dados de maestria (top 10 de cada jogador) com flag is_otp (500k+). */
export async function storeAllMastery(rows: AllMasteryRow[]): Promise<number> {
  if (!db || rows.length === 0) return 0;
  await ensureSchema();
  const now = Date.now();
  const stmts: InStatement[] = rows.map((r) => ({
    sql: `INSERT INTO all_mastery
            (puuid, region, champion_id, champion_name, champion_points, champion_level, is_otp, tier, rank, lp, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(puuid, champion_id) DO UPDATE SET
            champion_name   = excluded.champion_name,
            champion_points = excluded.champion_points,
            champion_level  = excluded.champion_level,
            is_otp          = excluded.is_otp,
            tier            = excluded.tier,
            rank            = excluded.rank,
            lp              = excluded.lp,
            last_updated    = excluded.last_updated`,
    args: [
      r.puuid, r.region, r.champion_id, r.champion_name,
      r.champion_points, r.champion_level, r.is_otp ? 1 : 0,
      r.tier, r.rank, r.lp, now,
    ],
  }));
  await batchChunked(stmts);
  return rows.length;
}

// ── Retenção por patch ────────────────────────────────────────────────────────

/**
 * Aplica a política de retenção (throttled a 1x/hora):
 *   - Rede de segurança: apaga qualquer partida com mais de MAX_AGE_DAYS dias.
 *   - Por patch: mantém o patch atual; quando um patch novo é detectado, registra a
 *     data e só após PATCH_OVERLAP_DAYS dias apaga os patches anteriores.
 * Retorna um resumo (ou null se foi pulado pelo throttle).
 */
export async function enforceRetention(force = false): Promise<{
  currentPatch: string | null;
  deletedOld: number;
  deletedPatch: number;
  skipped: boolean;
} | null> {
  if (!db) return null;
  await ensureSchema();
  const now = Date.now();

  // Throttle
  const ps0 = await db.execute({
    sql: `SELECT current_patch, detected_at, last_retention_at FROM patch_state WHERE id = 1`,
    args: [],
  });
  const state = ps0.rows[0];
  const lastRet = state ? Number(state.last_retention_at ?? 0) : 0;
  if (!force && now - lastRet < RETENTION_INTERVAL_MS) {
    return { currentPatch: (state?.current_patch as string) ?? null, deletedOld: 0, deletedPatch: 0, skipped: true };
  }

  // 1. Rede de segurança por idade.
  const cutoff = now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const delOldCm = await db.execute({
    sql: `DELETE FROM champion_matches WHERE game_creation > 0 AND game_creation < ?`,
    args: [cutoff],
  });
  await db.execute({
    sql: `DELETE FROM match_meta WHERE game_creation > 0 AND game_creation < ?`,
    args: [cutoff],
  });

  // 2. Patch atual = patch da partida mais recente (evita comparar strings "15.9" vs "15.10").
  const curRs = await db.execute({
    sql: `SELECT patch FROM match_meta
          WHERE patch IS NOT NULL AND patch != 'legacy'
          ORDER BY game_creation DESC LIMIT 1`,
    args: [],
  });
  const currentPatch = (curRs.rows[0]?.patch as string) ?? null;

  let deletedPatch = 0;
  if (currentPatch) {
    const prevPatch = state?.current_patch as string | undefined;
    const detectedAt = state ? Number(state.detected_at ?? 0) : 0;

    if (prevPatch !== currentPatch) {
      // Patch mudou (ou primeiro registro): grava e NÃO apaga ainda (sobreposição).
      await db.execute({
        sql: `INSERT INTO patch_state (id, current_patch, detected_at, last_retention_at)
              VALUES (1, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET current_patch = excluded.current_patch, detected_at = excluded.detected_at, last_retention_at = excluded.last_retention_at`,
        args: [currentPatch, now, now],
      });
    } else {
      // Mesmo patch: se já passou a janela de sobreposição, apaga patches anteriores.
      const overlapMs = PATCH_OVERLAP_DAYS * 24 * 60 * 60 * 1000;
      if (now - detectedAt >= overlapMs) {
        const d1 = await db.execute({
          sql: `DELETE FROM champion_matches WHERE patch IS NOT NULL AND patch != 'legacy' AND patch != ?`,
          args: [currentPatch],
        });
        await db.execute({
          sql: `DELETE FROM match_meta WHERE patch IS NOT NULL AND patch != 'legacy' AND patch != ?`,
          args: [currentPatch],
        });
        deletedPatch = d1.rowsAffected;
      }
      await db.execute({
        sql: `UPDATE patch_state SET last_retention_at = ? WHERE id = 1`,
        args: [now],
      });
    }
  } else {
    // Sem patch conhecido ainda: só atualiza o carimbo de tempo.
    await db.execute({
      sql: `INSERT INTO patch_state (id, current_patch, detected_at, last_retention_at)
            VALUES (1, NULL, ?, ?)
            ON CONFLICT(id) DO UPDATE SET last_retention_at = excluded.last_retention_at`,
      args: [now, now],
    });
  }

  return { currentPatch, deletedOld: delOldCm.rowsAffected, deletedPatch, skipped: false };
}

// ── One-Trick Mastery ─────────────────────────────────────────────────────────

// Cache local de nome → ID numérico (Data Dragon)
let _champNameToId: Map<string, number> | null = null;

async function champNameToId(championName: string): Promise<number | null> {
  if (!_champNameToId) {
    try {
      const res = await fetch(`${DD_BASE}/data/en_US/champion.json`, { next: { revalidate: 3600 } });
      const data = await res.json();
      _champNameToId = new Map<string, number>();
      for (const [name, info] of Object.entries(data.data ?? {}) as Array<[string, { key: string }]>) {
        _champNameToId.set(name.toLowerCase(), parseInt(info.key, 10));
      }
    } catch {
      return null;
    }
  }
  return _champNameToId.get(championName.toLowerCase()) ?? null;
}

/** Retorna jogadores com >= minPoints de maestria no campeão, ordenados por pontos. */
export async function getOtpPlayers(
  region: string,
  championName: string,
  minPoints: number
): Promise<Array<{ puuid: string; tier: string; rank: string; lp: number; points: number }>> {
  if (!db) return [];
  await ensureSchema();
  const champId = await champNameToId(championName);
  if (!champId) return [];
  const rs = await db.execute({
    sql: `SELECT puuid, tier, rank, lp, champion_points AS points
          FROM otp_mastery
          WHERE region = ? AND champion_id = ? AND champion_points >= ?
          ORDER BY champion_points DESC
          LIMIT 200`,
    args: [region, champId, minPoints],
  });
  return rs.rows.map((r) => ({
    puuid: r.puuid as string,
    tier: r.tier as string,
    rank: r.rank as string,
    lp: Number(r.lp ?? 0),
    points: Number(r.points ?? 0),
  }));
}
