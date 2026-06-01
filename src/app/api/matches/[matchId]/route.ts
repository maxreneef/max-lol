import { NextResponse } from "next/server";
import { getMatch, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") ?? "br1").trim();

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  }

  try {
    const match = await getMatch(matchId, region);
    return NextResponse.json(match);
  } catch (err) {
    if (err instanceof RiotError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Erro ao buscar partida." },
      { status: 500 }
    );
  }
}
