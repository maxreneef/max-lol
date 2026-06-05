import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guias de Campeões — Max LoL",
  description:
    "Guias criados pela comunidade de League of Legends. Builds, matchups, combos e dicas para cada campeão.",
};

export default function GuidesPage() {
  return (
    <div className="container" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
        Guias de Campeões
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
        Em breve você poderá ler e publicar guias completas de cada campeão,
        com builds detalhadas, matchups, combos, power spikes e muito mais —
        escritas por one-tricks e jogadores de alto elo.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/champions" className="btn">
          Ver Campeões
        </Link>
        <Link href="/tierlist" className="btn">
          Tier List
        </Link>
      </div>

      <div style={{
        marginTop: "2.5rem", padding: "1.5rem", background: "var(--panel)",
        borderRadius: 8, border: "1px solid var(--border)", maxWidth: 360, margin: "2.5rem auto",
        textAlign: "left",
      }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>📬 Quer contribuir?</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>
          Se você é mono-champion de alto elo e quer compartilhar seu conhecimento,
          entre em contato — estamos montando o time de colaboradores.
        </p>
        <Link href="/contact" style={{ fontSize: "0.82rem", marginTop: "0.75rem", display: "inline-block" }}>
          Entrar em contato →
        </Link>
      </div>
    </div>
  );
}
