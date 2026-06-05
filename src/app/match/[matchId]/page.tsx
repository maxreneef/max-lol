import type { Metadata } from "next";
import { MatchDetail } from "./MatchDetail";
import { PageWithAds } from "@/components/PageWithAds";

// Página dinâmica - não faz pré-renderização (SSG)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalhes da partida — Max LoL",
  description: "Análise detalhada de uma partida de League of Legends.",
};

export default function MatchPage() {
  // O componente MatchDetail (cliente) lida com os params via useSearchParams
  return (
    <PageWithAds>
      <main className="container">
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Detalhes da partida
        </h1>
        <MatchDetail />
      </main>
    </PageWithAds>
  );
}
