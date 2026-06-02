import type { Metadata } from "next";
import { RotationClient } from "./RotationClient";

export const metadata: Metadata = {
  title: "Rotação Gratuita — Max LoL",
  description: "Campeões gratuitos desta semana em League of Legends.",
};

export default function RotationPage() {
  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Rotação Gratuita</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Campeões disponíveis gratuitamente esta semana. Atualiza toda terça-feira.
      </p>
      <RotationClient />
    </main>
  );
}
