/**
 * Camada de storage persistente (Neon Postgres) para partidas indexadas por campeão.
 *
 * O robô (/api/cron/scan) varre partidas de alto elo e indexa TODOS os campeões de
 * cada partida nesta tabela. O endpoint /matches lê daqui (instantâneo). Se o banco
 * não estiver provisionado (sem DATABASE_URL), tudo opera em modo no-op e o site
 * continua usando a busca ao vivo como fallback.
 */
import { DD_BASE } from "@/lib/ddragon";
import { neon } from "@neondatabase/serverless";

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

export const hasDB = !!DB_URL;

const sql = hasDB ? neon(DB_URL) : null;

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
  data: Record<string, unknown>; // "visão" da partida p/ aquele participante
}

export interface GetOpts {
  tiers?: string[]; // filtra por elo (ex: ["CHALLENGER","DIAMOND"])
  lane?: string;    // teamPosition (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY)
  minMastery?: number; // pontos mínimos de maestria (0 = sem filtro)
  puuids?: string[];   // filtra por puuids específicos (usado no modo One-Trick)
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

// ── Schema ──────────────────────────────────────────────────────────────────
let schemaReady = false;
async function ensureSchema(): Promise<void> {
  if (!sql || schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS champion_matches (
      match_id      TEXT    NOT NULL,
      puuid         TEXT    NOT NULL,
      region        TEXT    NOT NULL,
      champion      TEXT    NOT NULL,
      tier          TEXT,
      rank          TEXT,
      lane          TEXT,
      win           BOOLEAN,
      game_creation BIGINT,
      data          JSONB,
      indexed_at    BIGINT,
      PRIMARY KEY (match_id, puuid)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cm_lookup
    ON champion_matches (region, champion, game_creation DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scan_state (
      region     TEXT PRIMARY KEY,
      cursor     INT  NOT NULL DEFAULT 0,
      updated_at BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS otp_mastery (
      puuid           TEXT NOT NULL,
      region          TEXT NOT NULL,
      champion_id     INT  NOT NULL,
      champion_points INT  NOT NULL,
      champion_level  INT  NOT NULL,
      tier            TEXT,
      rank            TEXT,
      lp              INT,
      last_updated    BIGINT,
      PRIMARY KEY (puuid, champion_id)
    )
  `;
  schemaReady = true;
}

/** Garante o schema sob demanda (usado pelo cron antes de gravar). */
export async function initSchema(): Promise<void> {
  await ensureSchema();
}

// ── Leitura ─────────────────────────────────────────────────────────────────

/** Lê partidas de um campeão, ordenadas da mais recente, com filtros opcionais. */
export async function getStoredMatches(
  region: string,
  champion: string,
  opts: GetOpts
): Promise<Record<string, unknown>[]> {
  if (!sql) return [];
  await ensureSchema();
  const champ = champion.toLowerCase();
  const limit = Math.min(Math.max(opts.limit, 1), 10000);
  const tiers = opts.tiers?.length ? opts.tiers : null;
  const lane = opts.lane || null;

  const minMst = opts.minMastery ?? 0;
  const puuids = opts.puuids?.length ? opts.puuids : null;
  const rows = (await sql`
    SELECT data FROM champion_matches
    WHERE region = ${region}
      AND champion = ${champ}
      AND (${tiers}::text[] IS NULL OR tier = ANY(${tiers}::text[]))
      AND (${lane}::text   IS NULL OR lane = ${lane})
      AND (${minMst}::int = 0 OR (data->>'championPoints')::int >= ${minMst})
      AND (${puuids}::text[] IS NULL OR puuid = ANY(${puuids}::text[]))
    ORDER BY game_creation DESC
    LIMIT ${limit}
  `) as Array<{ data: Record<string, unknown> }>;

  return rows.map((r) => r.data);
}

/** Quantas partidas de um campeão já estão indexadas (decide usar banco x fallback). */
export async function getStoredCount(region: string, champion: string): Promise<number> {
  if (!sql) return 0;
  await ensureSchema();
  const champ = champion.toLowerCase();
  const r = (await sql`
    SELECT COUNT(*)::int AS n FROM champion_matches
    WHERE region = ${region} AND champion = ${champ}
  `) as Array<{ n: number }>;
  return r[0]?.n ?? 0;
}

/** Dos match IDs informados, retorna os que AINDA NÃO foram indexados (evita rebaixar). */
export async function filterNewMatchIds(region: string, ids: string[]): Promise<string[]> {
  if (!sql || ids.length === 0) return ids;
  await ensureSchema();
  const rows = (await sql`
    SELECT DISTINCT match_id FROM champion_matches
    WHERE region = ${region} AND match_id = ANY(${ids}::text[])
  `) as Array<{ match_id: string }>;
  const seen = new Set(rows.map((r) => r.match_id));
  return ids.filter((id) => !seen.has(id));
}

// ── Gravação ────────────────────────────────────────────────────────────────

/** Insere as "visões" de partida (1 por participante) em lote, ignorando duplicatas. */
export async function storeMatchViews(rows: StoredMatchRow[]): Promise<number> {
  if (!sql || rows.length === 0) return 0;
  await ensureSchema();
  const now = Date.now();
  const CHUNK = 100;
  let stored = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    // Usa o callback form de transaction(): txn`...` cria queries que só executam
    // dentro da transação (único round-trip HTTP). Fora do callback, sql`...`
    // dispararia cada INSERT como uma requisição individual imediata.
    await sql.transaction((txn) =>
      chunk.map((r) =>
        txn`
          INSERT INTO champion_matches
            (match_id, puuid, region, champion, tier, rank, lane, win, game_creation, data, indexed_at)
          VALUES (
            ${r.matchId}, ${r.puuid}, ${r.region}, ${r.champion.toLowerCase()},
            ${r.tier}, ${r.rank}, ${r.lane}, ${r.win}, ${r.gameCreation},
            ${JSON.stringify(r.data)}::jsonb, ${now}
          )
          ON CONFLICT (match_id, puuid) DO NOTHING
        `
      )
    );
    stored += chunk.length;
  }
  return stored;
}

// ── Cursor de varredura ─────────────────────────────────────────────────────

export async function getCursor(region: string): Promise<number> {
  if (!sql) return 0;
  await ensureSchema();
  const r = (await sql`SELECT cursor FROM scan_state WHERE region = ${region}`) as Array<{ cursor: number }>;
  return r[0]?.cursor ?? 0;
}

/** Tenta obter lock para scan. Retorna true se conseguiu, false se outro scan está rodando. */
export async function tryLockScan(region: string): Promise<boolean> {
  if (!sql) return true;
  await ensureSchema();
  const now = Date.now();
  const LOCK_DURATION = 120_000; // 2 min — tempo máximo de um scan
  const r = await sql`
    UPDATE scan_state
    SET updated_at = ${now}
    WHERE region = ${region}
      AND (updated_at IS NULL OR updated_at < ${now - LOCK_DURATION})
    RETURNING cursor
  ` as Array<{ cursor: number }>;
  return r.length > 0;
}

export async function setCursor(region: string, cursor: number): Promise<void> {
  if (!sql) return;
  await ensureSchema();
  // updated_at = 0 libera o lock para o proximo scan
  await sql`
    INSERT INTO scan_state (region, cursor, updated_at)
    VALUES (${region}, ${cursor}, 0)
    ON CONFLICT (region) DO UPDATE SET cursor = ${cursor}, updated_at = 0
  `;
}

/** Reseta o lock (em caso de erro) */
export async function unlockScan(region: string): Promise<void> {
  if (!sql) return;
  await sql`UPDATE scan_state SET updated_at = 0 WHERE region = ${region}`;
}

/** Estatísticas rápidas para diagnóstico do robô. */
export async function getScanStats(region: string): Promise<{
  totalRows: number;
  champions: number;
  cursor: number;
}> {
  if (!sql) return { totalRows: 0, champions: 0, cursor: 0 };
  await ensureSchema();
  const a = (await sql`SELECT COUNT(*)::int AS n FROM champion_matches WHERE region = ${region}`) as Array<{ n: number }>;
  const b = (await sql`SELECT COUNT(DISTINCT champion)::int AS n FROM champion_matches WHERE region = ${region}`) as Array<{ n: number }>;
  return {
    totalRows: a[0]?.n ?? 0,
    champions: b[0]?.n ?? 0,
    cursor: await getCursor(region),
  };
}

// ── One-Trick Mastery (pré-computado pelo scan) ──────────────────────────────

/** Grava jogadores com 500k+ de maestria em lote (UPSERT). */
export async function storeOtpMastery(rows: OtpRow[]): Promise<number> {
  if (!sql || rows.length === 0) return 0;
  await ensureSchema();
  const now = Date.now();
  const CHUNK = 50;
  let stored = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await sql.transaction((txn) =>
      chunk.map((r) =>
        txn`
          INSERT INTO otp_mastery
            (puuid, region, champion_id, champion_points, champion_level, tier, rank, lp, last_updated)
          VALUES (
            ${r.puuid}, ${r.region}, ${r.champion_id},
            ${r.champion_points}, ${r.champion_level},
            ${r.tier}, ${r.rank}, ${r.lp}, ${now}
          )
          ON CONFLICT (puuid, champion_id) DO UPDATE SET
            champion_points = EXCLUDED.champion_points,
            champion_level  = EXCLUDED.champion_level,
            tier            = EXCLUDED.tier,
            rank            = EXCLUDED.rank,
            lp              = EXCLUDED.lp,
            last_updated    = EXCLUDED.last_updated
        `
      )
    );
    stored += chunk.length;
  }
  return stored;
}

// Cache local de nome → ID numérico (Data Dragon)
let _champNameToId: Map<string, number> | null = null;

async function champNameToId(championName: string): Promise<number | null> {
  if (!_champNameToId) {
    try {
      const res = await fetch(
        `${DD_BASE}/data/en_US/champion.json`,
        { next: { revalidate: 3600 } }
      );
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
  if (!sql) return [];
  await ensureSchema();
  const champId = await champNameToId(championName);
  if (!champId) return [];
  const rows = (await sql`
    SELECT puuid, tier, rank, lp, champion_points as points
    FROM otp_mastery
    WHERE region = ${region}
      AND champion_id = ${champId}
      AND champion_points >= ${minPoints}
    ORDER BY champion_points DESC
    LIMIT 200
  `) as Array<{ puuid: string; tier: string; rank: string; lp: number; points: number }>;
  return rows;
}
