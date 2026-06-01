import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Max LoL",
};

export default function Privacy() {
  return (
    <main className="container legal">
      <h1>Política de Privacidade</h1>
      <p className="updated">Última atualização: 1 de junho de 2026</p>

      <p>
        Esta Política de Privacidade descreve como o Max LoL (&quot;nós&quot;,
        &quot;nosso&quot;) coleta, usa e protege as informações relacionadas ao
        uso da nossa plataforma de estatísticas de League of Legends.
      </p>

      <h2>1. Informações que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de jogo públicos:</strong> obtemos dados de invocadores,
          partidas e estatísticas através das APIs oficiais da Riot Games. Esses
          dados são públicos e fornecidos pela própria Riot.
        </li>
        <li>
          <strong>Dados de uso:</strong> informações técnicas anônimas como tipo
          de navegador, páginas visitadas e tempo de acesso, usadas para melhorar
          o serviço.
        </li>
        <li>
          <strong>Cookies:</strong> utilizamos cookies essenciais para o
          funcionamento do site e, opcionalmente, cookies analíticos.
        </li>
      </ul>

      <h2>2. Como usamos as informações</h2>
      <ul>
        <li>Fornecer estatísticas, perfis e análises de partidas.</li>
        <li>Gerar tier lists e dados agregados de campeões.</li>
        <li>Melhorar o desempenho e a experiência do usuário.</li>
        <li>Manter histórico para análise de tendências ao longo do tempo.</li>
      </ul>

      <h2>3. Compartilhamento de dados</h2>
      <p>
        Não vendemos seus dados pessoais. Os dados de jogo exibidos já são
        públicos por meio da Riot Games. Podemos compartilhar dados agregados e
        anonimizados para fins estatísticos.
      </p>

      <h2>4. Dados da Riot Games</h2>
      <p>
        O uso de dados obtidos pela API da Riot Games está sujeito à{" "}
        <a
          href="https://developer.riotgames.com/policies/general"
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de Desenvolvedor da Riot Games
        </a>
        . Removeremos ou atualizaremos dados conforme exigido pela Riot Games.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais razoáveis para proteger os
        dados armazenados contra acesso não autorizado, alteração ou destruição.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode solicitar a remoção de dados associados ao seu invocador
        entrando em contato conosco. Atenderemos solicitações conforme a
        legislação aplicável (incluindo a LGPD).
      </p>

      <h2>7. Contato</h2>
      <p>
        Para dúvidas sobre esta política, entre em contato pelo e-mail{" "}
        <a href="mailto:maxreneef@gmail.com">maxreneef@gmail.com</a>.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos atualizar esta política periodicamente. A data da última
        atualização é indicada no topo desta página.
      </p>

      <p className="disclaimer">
        Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
        views or opinions of Riot Games or anyone officially involved in
        producing or managing Riot Games properties.
      </p>
    </main>
  );
}
