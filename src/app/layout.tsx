import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { NavMenu } from "./NavMenu";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { CookieConsent } from "@/components/CookieConsent";
import { SupportButton } from "@/components/SupportButton";
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

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Google AdSense — ativa automaticamente após aprovação */}
        {PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}

        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand">
              Max<span> LoL</span>
            </Link>
            <NavMenu />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link href="/suporte" className="support-nav-link" title="Apoiar o Max LoL">
                ☕ Apoiar
              </Link>
              <ThemeToggle />
            </div>
            <MobileNav />
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <Link href="/" className="brand" style={{ fontSize: "1.2rem" }}>
                Max<span> LoL</span>
              </Link>
              <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.5rem", maxWidth: 240 }}>
                Plataforma gratuita de estatísticas de League of Legends — foco no servidor BR.
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
                © {new Date().getFullYear()} Max LoL
              </p>
            </div>

            <div className="footer-links">
              <div className="footer-col">
                <p className="footer-col-title">Invocadores</p>
                <Link href="/summoner">Buscar</Link>
                <Link href="/compare">Comparar</Link>
                <Link href="/lobby">Lobby</Link>
                <Link href="/leaderboard">Ranking</Link>
              </div>
              <div className="footer-col">
                <p className="footer-col-title">Campeões</p>
                <Link href="/champions">Todos</Link>
                <Link href="/tierlist">Tier List</Link>
                <Link href="/rotation">Rotação</Link>
                <Link href="/spells">Habilidades</Link>
              </div>
              <div className="footer-col">
                <p className="footer-col-title">Jogo</p>
                <Link href="/items">Itens</Link>
                <Link href="/runes">Runas</Link>
                <Link href="/patches">Patch Notes</Link>
              </div>
              <div className="footer-col">
                <p className="footer-col-title">Institucional</p>
                <Link href="/suporte">Apoiar ☕</Link>
                <Link href="/about">Sobre</Link>
                <Link href="/privacy">Privacidade</Link>
                <Link href="/terms">Termos</Link>
                <Link href="/contact">Contato</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.{" "}
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Política de Privacidade</Link>{" "}·{" "}
            <Link href="/suporte" style={{ color: "inherit", textDecoration: "underline" }}>Divulgação de Afiliados</Link>
          </div>
        </footer>

        <SupportButton />
        <CookieConsent />
      </body>
    </html>
  );
}
