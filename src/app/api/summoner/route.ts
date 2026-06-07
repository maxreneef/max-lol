import { NextResponse } from "next/server";
import { getProfile, RiotError } from "@/lib/riot";
import { isPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = (searchParams.get("riotId") ?? "").trim();
  const region = (searchParams.get("region") ?? "br1").trim();

  if (!isPlatform(region)) {
    return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  }

  if (!riotId.includes("#")) {
    return NextResponse.json(
      { error: 'Use o formato Nome#TAG (ex.: "Faker#KR1").' },
      { status: 400 }
    );
  }

  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "Nome e TAG são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const profile = await getProfile(gameName, tagLine, region);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof RiotError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Erro inesperado ao consultar a API." },
      { status: 500 }
    );
  }
}
