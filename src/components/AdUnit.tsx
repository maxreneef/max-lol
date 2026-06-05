"use client";

import { useState } from "react";

// Com Auto Ads ativo, o Google injeta anúncios automaticamente.
// Os componentes abaixo ficam disponíveis para quando o usuário
// quiser criar unidades manuais no futuro (basta adicionar o slot ID).

const SLOT_BANNER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER;
const SLOT_STICKY = process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY;
const PUB_ID      = "ca-pub-5488213461319588";

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

function pushAd() {
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignore */ }
}

/** Banner horizontal manual — só renderiza se o slot estiver configurado */
export function AdBanner() {
  if (!SLOT_BANNER) return null; // Auto Ads cobre esta posição automaticamente
  return (
    <div style={{ textAlign: "center", margin: "1rem 0" }}>
      <span style={{ fontSize: "0.6rem", color: "var(--muted)", display: "block", marginBottom: 2 }}>Publicidade</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={PUB_ID}
        data-ad-slot={SLOT_BANNER}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** Sidebar esquerda — só renderiza se o slot estiver configurado */
export function AdSidebarLeft()  { return null; }
/** Sidebar direita — só renderiza se o slot estiver configurado */
export function AdSidebarRight() { return null; }

/** Sticky bottom mobile com botão de fechar */
export function AdStickyBottom() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !SLOT_STICKY) return null;
  return (
    <div className="ad-sticky-bottom">
      <button className="ad-sticky-close" onClick={() => setDismissed(true)} aria-label="Fechar">✕</button>
      <span className="ad-label">Publicidade</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 50 }}
        data-ad-client={PUB_ID}
        data-ad-slot={SLOT_STICKY}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** Rectangle 300×250 — só renderiza se o slot estiver configurado */
export function AdRect() { return null; }
