import type { Metadata } from "next";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://max-lol.vercel.app"),
  title: {
    default: "Max LoL — Estatísticas de League of Legends",
    template: "%s",
  },
  description:
    "Plataforma de estatísticas de League of Legends: perfis de invocador, histórico de partidas, tier lists e análise de builds. Foco inicial no servidor BR.",
  openGraph: {
    title: "Max LoL — Estatísticas de League of Legends",
    description:
      "Perfis de invocador, histórico de partidas, tier lists e análise de builds. Foco inicial no servidor BR.",
    url: "https://max-lol.vercel.app",
    siteName: "Max LoL",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Max LoL — Estatísticas de League of Legends",
    description:
      "Perfis de invocador, histórico de partidas, tier lists e análise de builds.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand">
              Max<span> LoL</span>
            </Link>
            <nav>
              <Link href="/">Início</Link>
              <Link href="/summoner">Buscar</Link>
              <Link href="/tierlist">Tier List</Link>
              <Link href="/leaderboard">Ranking</Link>
              <Link href="/lobby">Lobby</Link>
              <Link href="/compare">Comparar</Link>
              <Link href="/privacy">Privacidade</Link>
              <Link href="/terms">Termos</Link>
              <Link href="/contact">Contato</Link>
            </nav>
            <MobileNav />
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="inner">
            <span>© {new Date().getFullYear()} Max LoL</span>
            <nav>
              <Link href="/privacy">Política de Privacidade</Link>
              <Link href="/terms">Termos de Uso</Link>
              <a href="mailto:maxreneef@gmail.com">Contato</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
