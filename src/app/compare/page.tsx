import type { Metadata } from "next";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: "Comparar Invocadores — Max LoL",
  description: "Compare dois invocadores de League of Legends lado a lado: elo, win rate, KDA e mais.",
};

export default function ComparePage() {
  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Comparar Invocadores</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Compare dois jogadores lado a lado — elo, win rate, nível e estatísticas ranqueadas.
      </p>
      <CompareClient />
    </main>
  );
}
