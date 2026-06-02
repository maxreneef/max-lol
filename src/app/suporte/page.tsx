import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apoiar o Max LoL — Mantenha a plataforma no ar",
  description:
    "O Max LoL é gratuito. Se ele te ajuda nas ranked, considere apoiar com um café ou comprando seu setup gamer pelos nossos links.",
};

const KOFI = process.env.NEXT_PUBLIC_KOFI_USERNAME;
const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "maxlol-20";

/* Produtos afiliados — substitua os ASINs/URLs pelos seus links reais após
   entrar no programa Amazon Associates Brasil (associados.amazon.com.br) */
const PRODUCTS = [
  {
    name: "Mouse Logitech G Pro X Superlight 2",
    desc: "O mouse preferido dos pros do cenário competitivo. Ultra-leve e sem fio.",
    price: "R$ 699",
    img: "https://m.media-amazon.com/images/I/51LBEGCg5ZL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=logitech+g+pro+x+superlight&tag=${AMAZON_TAG}`,
    category: "Mouse",
  },
  {
    name: "Headset HyperX Cloud II",
    desc: "Áudio de qualidade para ouvir os passos inimigos com precisão.",
    price: "R$ 399",
    img: "https://m.media-amazon.com/images/I/71FRQrUCKHL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=hyperx+cloud+ii&tag=${AMAZON_TAG}`,
    category: "Headset",
  },
  {
    name: "Teclado Mecânico Redragon K552",
    desc: "Mecânico com switches vermelho. Cliques precisos, resposta rápida.",
    price: "R$ 199",
    img: "https://m.media-amazon.com/images/I/71e5GDhXroL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=redragon+k552&tag=${AMAZON_TAG}`,
    category: "Teclado",
  },
  {
    name: "Monitor 24\" 144Hz IPS",
    desc: "144Hz é o mínimo para jogar LoL de forma competitiva. Diferença visível.",
    price: "R$ 899",
    img: "https://m.media-amazon.com/images/I/81wAiFyQ8cL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=monitor+144hz+24+polegadas+gamer&tag=${AMAZON_TAG}`,
    category: "Monitor",
  },
  {
    name: "Mousepad XL Gamer",
    desc: "Base grande para movimentos amplos. Superfície otimizada para gaming.",
    price: "R$ 89",
    img: "https://m.media-amazon.com/images/I/71vx38j6OxL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=mousepad+xl+gamer&tag=${AMAZON_TAG}`,
    category: "Mousepad",
  },
  {
    name: "Cadeira Gamer ThunderX3",
    desc: "Ergonomia para longas sessões de ranked sem dor nas costas.",
    price: "R$ 799",
    img: "https://m.media-amazon.com/images/I/71rj3J3RXZL._AC_SL500_.jpg",
    url: `https://www.amazon.com.br/s?k=cadeira+gamer+thunderx3&tag=${AMAZON_TAG}`,
    category: "Cadeira",
  },
];

export default function Suporte() {
  return (
    <main className="container" style={{ maxWidth: 900, padding: "2rem 1.5rem" }}>

      {/* Hero */}
      <div className="suporte-hero">
        <h1 className="suporte-title">Manter o Max LoL no ar custa dinheiro ☕</h1>
        <p className="suporte-subtitle">
          O site é <strong>100% gratuito</strong> — sem paywalls, sem filas de espera.
          Se ele te ajuda a subir de elo, considere apoiar de uma das formas abaixo.
          Você mantém o acesso a tudo sem pagar nada.
        </p>
      </div>

      {/* Formas de apoiar */}
      <div className="suporte-cards">

        {/* Ko-fi */}
        <div className="suporte-card featured">
          <div className="suporte-card-icon">☕</div>
          <h2>Ko-fi — Pague um café</h2>
          <p>Contribuição única a partir de R$ 15. Sem assinatura, sem compromisso. Cada café paga uma hora de servidor.</p>
          {KOFI ? (
            <a
              href={`https://ko-fi.com/${KOFI}`}
              target="_blank"
              rel="noopener noreferrer"
              className="suporte-btn primary"
            >
              ☕ Pagar um café
            </a>
          ) : (
            <span className="suporte-btn disabled">Em breve</span>
          )}
        </div>

        {/* Anúncios */}
        <div className="suporte-card">
          <div className="suporte-card-icon">📢</div>
          <h2>Não bloqueie os anúncios</h2>
          <p>
            Usamos apenas anúncios do Google (sem popups, sem redirecionamentos).
            Desativar o AdBlocker no Max LoL nos ajuda muito sem custar nada pra você.
          </p>
          <div className="suporte-btn secondary">Já está ativo — obrigado!</div>
        </div>

        {/* Amazon */}
        <div className="suporte-card">
          <div className="suporte-card-icon">🛒</div>
          <h2>Compre pelo nosso link</h2>
          <p>
            Se precisar de periféricos, compre pelos links abaixo. O preço é o mesmo e
            recebemos uma pequena comissão da Amazon.
          </p>
          <a href="#perifericos" className="suporte-btn secondary">Ver periféricos ↓</a>
        </div>

      </div>

      {/* Periféricos afiliados */}
      <div id="perifericos" style={{ scrollMarginTop: "80px" }}>
        <h2 className="suporte-section-title">
          Setup Recomendado para Subir de Elo
        </h2>
        <p className="affiliate-disclosure">
          * Links de afiliado Amazon Associates. Você paga o mesmo preço; nós recebemos uma comissão de até 8%.{" "}
          <Link href="/privacy">Saiba mais</Link>
        </p>

        <div className="product-grid">
          {PRODUCTS.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="product-card"
            >
              <div className="product-category">{p.category}</div>
              <div className="product-img-wrap">
                <img src={p.img} alt={p.name} className="product-img" loading="lazy" />
              </div>
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-desc">{p.desc}</div>
                <div className="product-price">{p.price}</div>
                <div className="product-cta">Ver na Amazon →</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="suporte-faq">
        <h2 className="suporte-section-title">Perguntas Frequentes</h2>
        <div className="faq-list">
          {[
            ["O site vai virar pago?", "Não. Todas as funcionalidades atuais permanecerão gratuitas para sempre."],
            ["Os anúncios abrem sites ao clicar?", "Sim, como qualquer anúncio normal de internet — mas abre em aba nova, nunca redireciona a página atual ou mostra popups."],
            ["Como os links da Amazon funcionam?", "Quando você clica e compra qualquer coisa (não precisa ser o produto do link), recebemos uma comissão de até 8% sem custo adicional para você."],
            ["Onde o dinheiro vai?", "100% reinvestido no site: servidor Vercel, custos de API, domínio, e desenvolvimento de novas funcionalidades."],
          ].map(([q, a]) => (
            <div key={q} className="faq-item">
              <div className="faq-q">{q}</div>
              <div className="faq-a">{a}</div>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}
