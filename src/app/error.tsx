"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container" style={{ textAlign: "center", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</p>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
        Algo deu errado
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        Ocorreu um erro inesperado. Tente novamente ou volte para a Home.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={reset}>Tentar novamente</button>
        <Link href="/" className="btn">Ir para a Home</Link>
      </div>
    </main>
  );
}
