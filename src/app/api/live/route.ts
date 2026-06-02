import { NextResponse } from "next/server";
import { getLiveGame, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const puuid = (searchParams.get("puuid") ?? "").trim();
  const region = (searchParams.get("region") ?? "br1").trim();

  if (!puuid) return NextResponse.json({ error: "PUUID obrigatório." }, { status: 400 });
  if (!isPlatform(region)) return NextResponse.json({ error: "Região inválida." }, { status: 400 });

  try {
    const game = await getLiveGame(puuid, region);
    return NextResponse.json({ game }); // game === null se não estiver em partida
  } catch (err) {
    if (err instanceof RiotError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erro ao buscar partida ao vivo." }, { status: 500 });
  }
}
