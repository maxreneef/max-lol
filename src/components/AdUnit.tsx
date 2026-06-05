"use client";

import { useEffect, useState } from "react";

const SLOT_BANNER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER;
const SLOT_LEFT   = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEFT;
const SLOT_RIGHT  = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT;
const SLOT_RECT   = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECT;
const SLOT_STICKY = process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY;
const PUB_ID      = "ca-pub-5488213461319588";

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

function pushAd() {
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignore */ }
}

/** Placeholder visual com dimensões corretas enquanto o slot não é configurado */
function AdPlaceholder({
  width,
  height,
  label,
}: {
  width: number;
  height: number;
  label: string;
}) {
  return (
    <div
      className="ad-placeholder"
      style={{ width, height, maxWidth: "100%", margin: "0 auto" }}
    >
      <span className="ad-placeholder-label">
        Publicidade
        <br />
        {label}
      </span>
    </div>
  );
}

/** Hook que chama pushAd quando o componente monta, se houver slot configurado */
function useAdPush(hasSlot: boolean) {
  useEffect(() => {
    if (hasSlot) pushAd();
  }, [hasSlot]);
}

/* ═══════════════════════════════════════════════════
   Sidebar Esquerda — 160×600, sticky, ≥1380px
   ═══════════════════════════════════════════════════ */
export function AdSidebarLeft() {
  useAdPush(!!SLOT_LEFT);

  return (
    <div className="ad-sidebar ad-sidebar-left">
      <span className="ad-label">Publicidade</span>
      {SLOT_LEFT ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: 160, height: 600 }}
          data-ad-client={PUB_ID}
          data-ad-slot={SLOT_LEFT}
          data-ad-format="vertical"
        />
      ) : (
        <AdPlaceholder width={160} height={600} label="160×600" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sidebar Direita — 160×600, sticky, ≥1380px
   ═══════════════════════════════════════════════════ */
export function AdSidebarRight() {
  useAdPush(!!SLOT_RIGHT);

  return (
    <div className="ad-sidebar ad-sidebar-right">
      <span className="ad-label">Publicidade</span>
      {SLOT_RIGHT ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: 160, height: 600 }}
          data-ad-client={PUB_ID}
          data-ad-slot={SLOT_RIGHT}
          data-ad-format="vertical"
        />
      ) : (
        <AdPlaceholder width={160} height={600} label="160×600" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Banner Horizontal — 728×90, dentro do conteúdo
   ═══════════════════════════════════════════════════ */
export function AdBanner() {
  useAdPush(!!SLOT_BANNER);

  return (
    <div className="ad-banner-wrap">
      <span className="ad-label">Publicidade</span>
      {SLOT_BANNER ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90 }}
          data-ad-client={PUB_ID}
          data-ad-slot={SLOT_BANNER}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      ) : (
        <AdPlaceholder width={728} height={90} label="728×90" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Rectangle — 300×250, entre seções
   ═══════════════════════════════════════════════════ */
export function AdRect() {
  useAdPush(!!SLOT_RECT);

  return (
    <div className="ad-rect-wrap">
      <span className="ad-label">Publicidade</span>
      {SLOT_RECT ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: 300, height: 250 }}
          data-ad-client={PUB_ID}
          data-ad-slot={SLOT_RECT}
          data-ad-format="rectangle"
        />
      ) : (
        <AdPlaceholder width={300} height={250} label="300×250" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sticky Bottom — 320×50, mobile apenas
   ═══════════════════════════════════════════════════ */
export function AdStickyBottom() {
  const [dismissed, setDismissed] = useState(false);
  useAdPush(!!SLOT_STICKY);

  if (dismissed) return null;

  return (
    <div className="ad-sticky-bottom">
      <button
        className="ad-sticky-close"
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
      >
        ✕
      </button>
      <span className="ad-label">Publicidade</span>
      {SLOT_STICKY ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 50 }}
          data-ad-client={PUB_ID}
          data-ad-slot={SLOT_STICKY}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      ) : (
        <AdPlaceholder width={320} height={50} label="320×50" />
      )}
    </div>
  );
}
