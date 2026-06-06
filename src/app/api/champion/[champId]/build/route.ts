import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/types";
import { cached } from "@/lib/cache";
import { aggregateBuildData } from "@/lib/buildAggregator";

const API_KEY = process.env.RIOT_API_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;
  const region = req.nextUrl.searchParams.get("region") ?? "br1";

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({
      message: "API Key não configurada — dados mock em uso",
      hasRealData: false,
    });
  }

  const cacheKey = `champion-build:${champId}:${region}`;

  try {
    const data = await cached(cacheKey, 10 * 60 * 1000, async () => {
      // Chama a rota de matches internamente para obter partidas reais
      const host = req.headers.get("host") ?? "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const matchesUrl = `${protocol}://${host}/api/champion/${encodeURIComponent(champId)}/matches?region=${encodeURIComponent(region)}`;

      const matchesRes = await fetch(matchesUrl, {
        headers: { cookie: req.headers.get("cookie") ?? "" },
      });

      if (!matchesRes.ok) {
        const err = await matchesRes.json().catch(() => ({ error: "Erro ao buscar partidas" }));
        throw new Error(err.error ?? "Erro ao buscar partidas");
      }

      const matchesData = await matchesRes.json();
      const matches = matchesData.matches ?? [];

      if (matches.length === 0) {
        return {
          message: "Nenhuma partida encontrada",
          hasRealData: false,
          totalGames: 0,
        };
      }

      const aggregated = aggregateBuildData(matches);

      return {
        ...aggregated,
        message: `Build calculada de ${aggregated.totalGames} partidas reais`,
      };
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: msg, hasRealData: false, totalGames: 0 },
      { status: 500 }
    );
  }
}
