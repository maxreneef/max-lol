import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Página não encontrada — Max LoL" };

export default function NotFound() {
  return (
    <main className="container" style={{ textAlign: "center", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <p style={{ fontSize: "5rem", marginBottom: "1rem" }}>404</p>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
        Página não encontrada
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        O invocador que você estava procurando pode ter mudado de nome, ou esta
        página não existe.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/" className="btn btn-primary">Ir para a Home</Link>
        <Link href="/summoner" className="btn">Buscar invocador</Link>
      </div>
    </main>
  );
}
