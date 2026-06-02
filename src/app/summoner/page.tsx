import type { Metadata } from "next";
import { SummonerSearch } from "./SummonerSearch";

export const metadata: Metadata = {
  title: "Buscar invocador — Max LoL",
  description:
    "Busque o perfil de qualquer invocador de League of Legends pelo Riot ID e veja nível, ícone e elo nas filas ranqueadas.",
};

export default function SummonerPage({
  searchParams,
}: {
  searchParams: Promise<{ riotId?: string; region?: string }>;
}) {
  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
        Buscar invocador
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Digite o Riot ID no formato <strong>Nome#TAG</strong> e escolha a região.
      </p>
      <SummonerSearch searchParamsPromise={searchParams} />
    </main>
  );
}
