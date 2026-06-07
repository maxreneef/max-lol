import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/types";
import { hasDB, unlockScan, getCursor } from "@/lib/matchStore";
import { scanOtpOnly, scanRegion } from "@/lib/scanEngine";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const API_KEY = process.env.RIOT_API_KEY;

export async function GET(req: NextRequest) {
  // Autenticação
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
    return NextResponse.json({ ok: false, error: "Banco não provisionado" });
  }

  const region = req.nextUrl.searchParams.get("region") ?? "br1";
  if (!isPlatform(region)) {
    return NextResponse.json({ ok: false, error: "Região inválida" }, { status: 400 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "full";

  try {
    const result = mode === "otp"
      ? await scanOtpOnly(region)
      : await scanRegion(region);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    try { await unlockScan(region); } catch { /* ignora */ }
    const cursorPreservado = await getCursor(region).catch(() => -1);
    console.error(`[scan] ERRO FATAL ${region} (cursor preservado em ${cursorPreservado}):`, msg);
    return NextResponse.json({
      ok: false,
      error: msg,
      cursorPreservado,
    }, { status: 500 });
  }
}
