export default function Home() {
  return (
    <main className="container hero">
      <h1>Max LoL — suas estatísticas de League of Legends</h1>
      <p className="tagline">
        Uma plataforma completa de estatísticas de League of Legends, reunindo
        perfis de invocador, histórico de partidas, tier lists e análise de
        builds em uma experiência única. Foco inicial no servidor brasileiro
        (BR1).
      </p>

      <div className="features">
        <div className="feature">
          <h3>Perfis de invocador</h3>
          <p>
            Histórico de elo, maestria de campeões, taxas de vitória e
            estatísticas de KDA.
          </p>
        </div>
        <div className="feature">
          <h3>Histórico de partidas</h3>
          <p>
            Gráficos interativos de desempenho: timeline de ouro, distribuição
            de dano e participação em objetivos.
          </p>
        </div>
        <div className="feature">
          <h3>Estatísticas de campeões</h3>
          <p>
            Builds, runas, ordem de habilidades e taxas de vitória agregadas de
            partidas de alto elo.
          </p>
        </div>
        <div className="feature">
          <h3>Tier lists</h3>
          <p>
            Listas filtradas por faixa de elo e patch, atualizadas
            automaticamente a cada atualização da Riot.
          </p>
        </div>
        <div className="feature">
          <h3>Visualizador ao vivo</h3>
          <p>
            Dados de seleção de campeões em tempo real e análise de lobby
            pré-partida para múltiplos invocadores.
          </p>
        </div>
        <div className="feature">
          <h3>Análise pós-partida</h3>
          <p>
            Sugestões personalizadas de melhoria e acompanhamento de builds de
            jogadores profissionais.
          </p>
        </div>
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
