import Link from "next/link";
import type { Metadata } from "next";
import { HomeSearch } from "./HomeSearch";
import { PageWithAds } from "@/components/PageWithAds";
import { AdRect } from "@/components/AdUnit";

export const metadata: Metadata = {
  title: "Max LoL — Estatísticas de League of Legends",
};

export default function Home() {
  return (
    <PageWithAds>
    <main>
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1 className="home-title">
            Domine o <span className="gold">League of Legends</span> com dados reais
          </h1>
          <p className="home-sub">
            Perfis de invocador, histórico de partidas, tier lists, análise de
            lobby e muito mais — focado no servidor brasileiro.
          </p>
          <HomeSearch />

          <div className="home-cta" style={{ marginTop: "1rem" }}>
            <Link href="/tierlist" className="btn btn-lg">Tier List</Link>
            <Link href="/rotation" className="btn btn-lg">Rotação gratuita</Link>
            <Link href="/items" className="btn btn-lg">Itens</Link>
          </div>
        </div>
      </section>

      <AdRect />

      {/* Features grid */}
      <section className="home-features container">
        <h2 className="home-section-title">Tudo que você precisa</h2>
        <div className="home-features-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="home-feature-card">
              <span className="home-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="home-stats">
        <div className="container home-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="home-stat">
              <span className="home-stat-val">{s.val}</span>
              <span className="home-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="container">
        <h2 className="home-section-title">Status &amp; roadmap</h2>
        <div className="roadmap">
          <ul>
            {ROADMAP.map((r) => (
              <li key={r.title}>
                <span className={`status-badge ${r.live ? "status-live" : "status-soon"}`}>
                  {r.live ? "Disponível" : "Em breve"}
                </span>
                <strong>{r.title}</strong>
                {" — "}
                {r.desc}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="disclaimer container">
        Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
        views or opinions of Riot Games or anyone officially involved in
        producing or managing Riot Games properties. Riot Games, and all
        associated properties are trademarks or registered trademarks of Riot
        Games, Inc.
      </p>
    </main>
    </PageWithAds>
  );
}

const FEATURES = [
  { href: "/summoner",  icon: "🔍", title: "Busca de invocador",     desc: "Perfil completo com elo, nível, ícone e filas ranqueadas." },
  { href: "/summoner",  icon: "📋", title: "Histórico de partidas",  desc: "Últimas partidas com campeão, KDA, grade S+ e muito mais." },
  { href: "/summoner",  icon: "📈", title: "Score & performance",    desc: "Rating numérico, gráficos de evolução e tendência de forma." },
  { href: "/champions", icon: "🗡️", title: "Todos os campeões",      desc: "Grid completo com tier, builds, runas, skins e matchups." },
  { href: "/tierlist",  icon: "🏆", title: "Tier List",              desc: "Ranking de todos os campeões com win rate, pick e ban rate." },
  { href: "/leaderboard", icon: "👑", title: "Leaderboard",          desc: "Os melhores jogadores Challenger, Grandmaster e Master." },
  { href: "/lobby",     icon: "🎯", title: "Análise de Lobby",       desc: "Analise até 10 invocadores antes da partida começar." },
  { href: "/compare",   icon: "⚔️", title: "Comparar Invocadores",   desc: "Dois jogadores lado a lado com barras comparativas." },
  { href: "/items",     icon: "⚗️", title: "Banco de Itens",         desc: "Todos os itens com stats, custo e filtros por categoria." },
  { href: "/runes",     icon: "💎", title: "Banco de Runas",         desc: "Todas as árvores de runas com descrições completas." },
  { href: "/rotation",  icon: "🎁", title: "Rotação Gratuita",       desc: "Campeões disponíveis gratuitamente esta semana." },
  { href: "/spells",    icon: "✨", title: "Busca por Habilidade",   desc: "Encontre campeões pelo nome ou efeito de qualquer skill." },
];

const STATS = [
  { val: "170+", label: "Campeões" },
  { val: "6",    label: "Regiões" },
  { val: "26",   label: "Páginas" },
  { val: "100%", label: "Gratuito" },
];

const ROADMAP = [
  { title: "Busca de invocador",         desc: "Perfil, elo, score, forma recente e maestria.", live: true },
  { title: "Histórico de partidas",      desc: "Últimas 20+ partidas com grade S+/A/B/C/D.", live: true },
  { title: "Análise pós-partida",        desc: "Insights personalizados de KDA, CS, dano e visão.", live: true },
  { title: "Gráficos de performance",   desc: "Sparklines de KDA e dano ao longo das partidas.", live: true },
  { title: "Tier List",                  desc: "Ranking de todos os campeões por win rate.", live: true },
  { title: "Página de campeão",          desc: "Builds, runas, habilidades, skins e matchups.", live: true },
  { title: "Leaderboard",               desc: "Top Challenger, Grandmaster e Master.", live: true },
  { title: "Análise de Lobby",           desc: "Multi-busca de até 10 invocadores.", live: true },
  { title: "Comparação de invocadores", desc: "Dois jogadores lado a lado com barras.", live: true },
  { title: "Partida ao vivo",           desc: "Dados em tempo real da partida atual.", live: true },
  { title: "Banco de Itens & Runas",    desc: "Referência completa com stats e filtros.", live: true },
  { title: "Rotação gratuita",          desc: "Campeões disponíveis esta semana.", live: true },
  { title: "Busca por habilidade",      desc: "Encontre campeões pelo efeito de qualquer skill.", live: true },
  { title: "Dados reais de win rate",   desc: "Calculado a partir de partidas coletadas com Production Key.", live: false },
  { title: "Análise de builds reais",   desc: "Items e runas mais eficientes por patch e elo.", live: false },
];
