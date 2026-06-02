import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Max LoL",
};

export default function Privacy() {
  return (
    <main className="container legal">
      <h1>Política de Privacidade</h1>
      <p className="updated">Última atualização: 2 de junho de 2026</p>

      <p>
        Esta Política descreve como o Max LoL coleta, usa e protege informações dos usuários,
        incluindo o uso de publicidade e links de afiliados.
      </p>

      <h2>1. Informações que coletamos</h2>
      <ul>
        <li><strong>Dados de jogo públicos:</strong> obtidos via APIs oficiais da Riot Games.</li>
        <li><strong>Dados de uso anônimos:</strong> tipo de navegador, páginas visitadas, tempo de acesso.</li>
        <li><strong>Cookies:</strong> essenciais para funcionamento e cookies de publicidade/análise (veja seção 4).</li>
      </ul>

      <h2>2. Google AdSense e Publicidade</h2>
      <p>
        Utilizamos o <strong>Google AdSense</strong> para exibir anúncios no site. O Google e seus parceiros
        podem usar cookies para exibir anúncios baseados em suas visitas anteriores a este e outros sites.
        Os anúncios exibidos são do tipo <em>display</em> — nunca popups, redirecionamentos ou vídeos
        com reprodução automática com som.
      </p>
      <p>
        Você pode optar por não receber anúncios personalizados visitando{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
          Configurações de Anúncios do Google
        </a>{" "}
        ou{" "}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          aboutads.info/choices
        </a>.
      </p>

      <h2>3. Links de Afiliados (Amazon Associates)</h2>
      <p>
        O Max LoL participa do programa <strong>Amazon Associates Brasil</strong>. Isso significa que
        alguns links para produtos na Amazon são links de afiliado: quando você compra um produto após
        clicar em um desses links, recebemos uma comissão de até 8% sem custo adicional para você.
        Os produtos recomendados são selecionados editorialmente e a comissão não influencia nossa avaliação.
      </p>

      <h2>4. Cookies</h2>
      <ul>
        <li><strong>Cookies essenciais:</strong> necessários para o funcionamento básico do site.</li>
        <li><strong>Cookies de publicidade:</strong> usados pelo Google AdSense para personalizar anúncios.</li>
        <li><strong>Preferências do usuário:</strong> tema claro/escuro, consentimento de cookies.</li>
      </ul>
      <p>
        Ao clicar em "Aceitar" no banner de cookies, você consente com o uso de cookies de publicidade.
        Você pode revogar este consentimento a qualquer momento limpando os dados do site no seu navegador.
      </p>

      <h2>5. Compartilhamento de dados</h2>
      <p>
        Não vendemos dados pessoais. Os dados de jogo exibidos já são públicos via Riot Games.
        Compartilhamos dados técnicos com o Google (AdSense/Analytics) conforme suas políticas.
      </p>

      <h2>6. Dados da Riot Games</h2>
      <p>
        O uso de dados obtidos pela API da Riot Games está sujeito à{" "}
        <a href="https://developer.riotgames.com/policies/general" target="_blank" rel="noopener noreferrer">
          Política de Desenvolvedor da Riot Games
        </a>.
      </p>

      <h2>7. Seus direitos (LGPD)</h2>
      <p>
        Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a acessar,
        corrigir e solicitar exclusão de dados associados ao seu invocador.
        Entre em contato: <a href="mailto:maxreneef@gmail.com">maxreneef@gmail.com</a>.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas razoáveis para proteger os dados contra acesso não autorizado.
      </p>

      <h2>9. Alterações</h2>
      <p>Podemos atualizar esta política periodicamente. A data de atualização é indicada no topo.</p>

      <p className="disclaimer">
        Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions
        of Riot Games or anyone officially involved in producing or managing Riot Games properties.
      </p>
    </main>
  );
}
