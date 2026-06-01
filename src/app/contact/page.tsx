import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato — Max LoL",
  description: "Entre em contato com a equipe do Max LoL.",
};

export default function Contact() {
  return (
    <main className="container legal">
      <h1>Contato</h1>
      <p className="updated">Estamos aqui para ajudar</p>

      <p>
        Para dúvidas, sugestões, relatos de problemas ou solicitações
        relacionadas a dados, entre em contato pelo e-mail abaixo. Respondemos o
        mais breve possível.
      </p>

      <h2>E-mail</h2>
      <p>
        <a href="mailto:maxreneef@gmail.com">maxreneef@gmail.com</a>
      </p>

      <h2>Solicitações de dados</h2>
      <p>
        Caso queira solicitar a remoção dos dados associados ao seu invocador,
        envie um e-mail informando seu Riot ID (Nome#TAG) e a região. Trataremos
        a solicitação conforme nossa{" "}
        <a href="/privacy">Política de Privacidade</a>.
      </p>

      <p className="disclaimer">
        Max LoL isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
        views or opinions of Riot Games or anyone officially involved in
        producing or managing Riot Games properties.
      </p>
    </main>
  );
}
