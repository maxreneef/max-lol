import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre — Max LoL",
  description: "Sobre o Max LoL — plataforma brasileira de estatísticas de League of Legends.",
};

export default function AboutPage() {
  return (
    <main className="container legal">
      <h1>Sobre o Max LoL</h1>
      <p className="updated">Construído para a comunidade brasileira de LoL</p>

      <p>
        O <strong>Max LoL</strong> é uma plataforma gratuita de estatísticas de League
        of Legends com foco inicial no servidor brasileiro (BR1). Nosso objetivo é
        reunir em um único lugar tudo que um jogador precisa para acompanhar sua evolução,
        preparar seu lobby e dominar o meta.
      </p>

      <h2>O que oferecemos</h2>
      <ul>
        <li><strong>Busca de invocador</strong> — perfil, nível, elo e maestria de campeões</li>
        <li><strong>Histórico de partidas</strong> — últimas partidas com KDA, dano, ouro e grade</li>
        <li><strong>Análise pós-partida</strong> — insights personalizados de KDA, CS, visão e dano</li>
        <li><strong>Gráficos de performance</strong> — evolução de KDA e dano ao longo das partidas</li>
        <li><strong>Tier List</strong> — ranking de campeões por win rate, pick rate e ban rate</li>
        <li><strong>Página de campeão</strong> — builds, runas, habilidades, skins e matchups</li>
        <li><strong>Leaderboard</strong> — os melhores Challenger, Grandmaster e Master</li>
        <li><strong>Análise de Lobby</strong> — analisa até 10 invocadores antes da partida</li>
        <li><strong>Comparação</strong> — dois invocadores lado a lado com barras visuais</li>
        <li><strong>Partida ao vivo</strong> — dados em tempo real da partida atual</li>
        <li><strong>Rotação gratuita</strong> — campeões disponíveis esta semana</li>
        <li><strong>Banco de itens e runas</strong> — referência completa do jogo</li>
      </ul>

      <h2>Tecnologia</h2>
      <p>
        Desenvolvido com <strong>Next.js 15</strong> (App Router), <strong>TypeScript</strong> e
        hospedado na <strong>Vercel</strong>. Os dados de jogo são obtidos exclusivamente
        através das <strong>APIs oficiais da Riot Games</strong>.
      </p>

      <h2>API da Riot Games</h2>
      <p>
        O Max LoL utiliza as seguintes APIs da Riot Games:
        Riot Account API, Summoner-v4, Match-v5, League-v4,
        Champion-Mastery-v4, Spectator-v5, Champion-v3 e Data Dragon.
        Todos os dados são tratados conforme a{" "}
        <a href="https://developer.riotgames.com/policies/general" target="_blank" rel="noopener noreferrer">
          Política de Desenvolvedor da Riot Games
        </a>.
      </p>

      <h2>Contato</h2>
      <p>
        Para dúvidas, sugestões ou reportar problemas:{" "}
        <a href="mailto:maxreneef@gmail.com">maxreneef@gmail.com</a>
      </p>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", flexWrap: "wrap" }}>
        <Link href="/" className="btn btn-primary">Ir para a Home</Link>
        <Link href="/privacy" className="btn">Privacidade</Link>
        <Link href="/terms" className="btn">Termos</Link>
        <Link href="/contact" className="btn">Contato</Link>
      </div>

      <p className="disclaimer">
        Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
        views or opinions of Riot Games or anyone officially involved in
        producing or managing Riot Games properties. Riot Games, and all
        associated properties are trademarks or registered trademarks of Riot
        Games, Inc.
      </p>
    </main>
  );
}
