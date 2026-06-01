import { NextResponse } from "next/server";
import { getMatchSummaries, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const puuid = (searchParams.get("puuid") ?? "").trim();
  const region = (searchParams.get("region") ?? "br1").trim();
  const count = Math.min(parseInt(searchParams.get("count") ?? "20"), 20);

  if (!puuid) {
    return NextResponse.json({ error: "PUUID é obrigatório." }, { status: 400 });
  }
  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  }

  try {
    const summaries = await getMatchSummaries(puuid, region, count);
    return NextResponse.json(summaries);
  } catch (err) {
    if (err instanceof RiotError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Erro ao buscar histórico." },
      { status: 500 }
    );
  }
}
