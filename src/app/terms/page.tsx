import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Max LoL",
};

export default function Terms() {
  return (
    <main className="container legal">
      <h1>Termos de Uso</h1>
      <p className="updated">Última atualização: 1 de junho de 2026</p>

      <p>
        Ao acessar e utilizar o Max LoL (&quot;serviço&quot;), você concorda com
        estes Termos de Uso. Caso não concorde, não utilize o serviço.
      </p>

      <h2>1. Descrição do serviço</h2>
      <p>
        O Max LoL é uma plataforma gratuita de estatísticas de League of Legends
        que fornece perfis de invocador, histórico de partidas, tier lists,
        builds e análises baseadas em dados públicos da Riot Games.
      </p>

      <h2>2. Uso aceitável</h2>
      <ul>
        <li>
          Você concorda em não usar o serviço para fins ilegais ou não
          autorizados.
        </li>
        <li>
          É proibido tentar sobrecarregar, comprometer ou fazer engenharia
          reversa da plataforma.
        </li>
        <li>
          É proibido coletar dados do site de forma automatizada sem permissão
          expressa.
        </li>
      </ul>

      <h2>3. Propriedade intelectual da Riot Games</h2>
      <p>
        League of Legends e todos os ativos relacionados são marcas registradas
        ou propriedade da Riot Games, Inc. O Max LoL utiliza esses dados sob a{" "}
        <a
          href="https://developer.riotgames.com/policies/general"
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de Desenvolvedor da Riot Games
        </a>
        .
      </p>

      <h2>4. Isenção de garantias</h2>
      <p>
        O serviço é fornecido &quot;como está&quot;. Não garantimos que os dados
        estejam sempre disponíveis, completos ou livres de erros. As estatísticas
        têm caráter informativo.
      </p>

      <h2>5. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida por lei, o Max LoL não se responsabiliza por
        quaisquer danos diretos ou indiretos decorrentes do uso ou da
        impossibilidade de uso do serviço.
      </p>

      <h2>6. Alterações nos termos</h2>
      <p>
        Podemos modificar estes Termos a qualquer momento. O uso continuado do
        serviço após alterações constitui aceitação dos novos termos.
      </p>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre estes Termos podem ser enviadas para o e-mail{" "}
        <a href="mailto:maxreneef@gmail.com">maxreneef@gmail.com</a>.
      </p>

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
