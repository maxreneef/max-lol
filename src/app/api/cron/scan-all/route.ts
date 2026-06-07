import { NextRequest, NextResponse } from "next/server";
import { hasDB, initSchema } from "@/lib/matchStore";
import { scanRegion } from "@/lib/scanEngine";

export const maxDuration = 60;

const REGIONS = ["br1", "na1", "euw1", "eun1", "kr"] as const;

/**
 * Cron rotativo: cada execução escaneia o próximo servidor da fila.
 * A cada 2 min, 1 servidor diferente é visitado → cada servidor a cada 10 min.
 * Processa 15 jogadores por visita, avançando via cursor.
 */
export async function GET(_req: NextRequest) {
  if (!hasDB) {
    return NextResponse.json({ ok: false, error: "Banco não provisionado" });
  }

  await initSchema();

  // Round-robin baseado no minuto UTC (sem estado no banco)
  const minute = new Date().getUTCMinutes();
  const region = REGIONS[Math.floor(minute / 2) % REGIONS.length];

  const result = await scanRegion(region);

  return NextResponse.json({
    rotation: { region, minute, slot: Math.floor(minute / 2) % REGIONS.length, total: REGIONS.length },
    ...result,
  });
}
