import { NextResponse } from "next/server";
import { getMatchHistory, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const puuid = (searchParams.get("puuid") ?? "").trim();
  const region = (searchParams.get("region") ?? "br1").trim();
  const start = parseInt(searchParams.get("start") ?? "0");
  const count = Math.min(parseInt(searchParams.get("count") ?? "20"), 100);

  if (!puuid) {
    return NextResponse.json({ error: "PUUID é obrigatório." }, { status: 400 });
  }
  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  }

  try {
    const history = await getMatchHistory(puuid, region, start, count);
    return NextResponse.json(history);
  } catch (err) {
    if (err instanceof RiotError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Erro ao buscar histórico de partidas." },
      { status: 500 }
    );
  }
}
