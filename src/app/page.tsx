import Link from "next/link";
import type { Metadata } from "next";
import { HomeSearch } from "./HomeSearch";

export const metadata: Metadata = {
  title: "Max LoL — Estatísticas de League of Legends",
};

export default function Home() {
  return (
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
  );
}

const FEATURES = [
  { href: "/summoner", icon: "🔍", title: "Busca de invocador", desc: "Perfil completo com elo, nível, ícone e filas ranqueadas." },
  { href: "/summoner", icon: "📋", title: "Histórico de partidas", desc: "Últimas 20 partidas com campeão, KDA, dano e resultado." },
  { href: "/summoner", icon: "📈", title: "Gráficos de performance", desc: "Evolução de KDA e dano ao longo das partidas recentes." },
  { href: "/tierlist", icon: "🏆", title: "Tier List", desc: "Ranking de todos os campeões com win rate, pick e ban rate." },
  { href: "/leaderboard", icon: "👑", title: "Leaderboard", desc: "Os melhores jogadores Challenger, Grandmaster e Master." },
  { href: "/lobby", icon: "🎯", title: "Análise de Lobby", desc: "Analise até 10 invocadores antes da partida começar." },
  { href: "/compare", icon: "⚔️", title: "Comparar Invocadores", desc: "Coloque dois jogadores lado a lado com barras comparativas." },
  { href: "/summoner", icon: "🔴", title: "Partida Ao Vivo", desc: "Veja se um invocador está em partida agora com tempo real." },
];

const STATS = [
  { val: "170+", label: "Campeões" },
  { val: "6+", label: "Regiões" },
  { val: "5", label: "Filas monitoradas" },
  { val: "100%", label: "Gratuito" },
];

const ROADMAP = [
  { title: "Busca de invocador", desc: "Perfil, nível, elo e filas ranqueadas.", live: true },
  { title: "Histórico de partidas", desc: "Últimas 20 partidas com detalhes completos.", live: true },
  { title: "Análise pós-partida", desc: "Insights de KDA, CS, dano, visão e ouro.", live: true },
  { title: "Tier List", desc: "Ranking de campeões por tier e win rate.", live: true },
  { title: "Leaderboard", desc: "Top Challenger, Grandmaster e Master.", live: true },
  { title: "Análise de Lobby", desc: "Multi-busca de invocadores pré-partida.", live: true },
  { title: "Comparação de invocadores", desc: "Dois jogadores lado a lado.", live: true },
  { title: "Partida ao vivo", desc: "Dados em tempo real da partida atual.", live: true },
  { title: "Estatísticas detalhadas de campeões", desc: "Builds, runas e matchups reais com dados agregados.", live: false },
  { title: "Análise de builds", desc: "Items mais eficientes por patch e elo.", live: false },
];
