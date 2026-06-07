import { NextRequest, NextResponse } from "next/server";
import { hasDB, getStoredMatches, getOtpPlayers } from "@/lib/matchStore";
import { aggregateBuildData, type RealMatch } from "@/lib/buildAggregator";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;
  const region = req.nextUrl.searchParams.get("region") ?? "br1";
  const lane = req.nextUrl.searchParams.get("lane") ?? "";
  const minMastery = parseInt(req.nextUrl.searchParams.get("minMastery") ?? "0", 10);

  if (!hasDB) {
    return NextResponse.json({ error: "Banco não disponível" }, { status: 503 });
  }

  try {
    let puuids: string[] | undefined;

    // Modo One-Trick: filtra pelos jogadores da tabela otp_mastery
    if (minMastery > 0) {
      const otpPlayers = await getOtpPlayers(region, champId, minMastery);
      if (otpPlayers.length === 0) {
        return NextResponse.json({
          hasRealData: false,
          totalGames: 0,
          message: `Nenhum One-Trick (${minMastery.toLocaleString()}+) de ${champId} encontrado em ${region}`,
        });
      }
      puuids = otpPlayers.map((p) => p.puuid);
    }

    // Busca TODAS as partidas do banco (até 10.000) para agregacao
    const stored = await getStoredMatches(region, champId, {
      lane: lane || undefined,
      limit: 10000,
      puuids,
    });

    if (stored.length === 0) {
      return NextResponse.json({
        hasRealData: false,
        totalGames: 0,
        message: `Nenhuma partida de ${champId} encontrada no banco`,
      });
    }

    // Converte para RealMatch[] e agrega
    const matches = stored as unknown as RealMatch[];
    const aggregated = aggregateBuildData(matches);

    return NextResponse.json({
      ...aggregated,
      source: "db",
      totalGames: aggregated.totalGames,
      message: minMastery > 0
        ? `Build calculada de ${aggregated.totalGames} partidas (One-Tricks ${minMastery.toLocaleString()}+)`
        : `Build calculada de ${aggregated.totalGames} partidas (banco)`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao agregar builds", hasRealData: false },
      { status: 500 }
    );
  }
}
