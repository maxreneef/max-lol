import type { Metadata } from "next";
import { LobbyAnalysis } from "./LobbyAnalysis";
import { PageWithAds } from "@/components/PageWithAds";

export const metadata: Metadata = {
  title: "Análise de Lobby — Max LoL",
  description: "Analise até 10 invocadores ao mesmo tempo antes da partida. Veja elo, win rate e histórico de cada jogador.",
};

export default function LobbyPage() {
  return (
    <PageWithAds>
      <main className="container">
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          Análise de Lobby
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
          Insira até 10 Riot IDs (um por linha) para analisar todos antes da partida.
        </p>
        <LobbyAnalysis />
      </main>
    </PageWithAds>
  );
}
