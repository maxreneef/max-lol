import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max LoL — Estatísticas de League of Legends",
  description:
    "Plataforma de estatísticas de League of Legends: perfis de invocador, histórico de partidas, tier lists e análise de builds. Foco inicial no servidor BR.",
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
              <Link href="/privacy">Privacidade</Link>
              <Link href="/terms">Termos</Link>
            </nav>
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
