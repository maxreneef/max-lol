"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

function pushAd() {
  if (!PUB_ID) return;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // ignore duplicate push
  }
}

interface UnitProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  style?: React.CSSProperties;
  className?: string;
}

function AdUnit({ slot, format = "auto", style, className = "" }: UnitProps) {
  useEffect(() => { pushAd(); }, []);
  if (!PUB_ID) return null;
  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block", ...style }}
      data-ad-client={PUB_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

// ── Slots (configurar no Vercel após aprovação do AdSense) ────────────────────
const SLOT_BANNER  = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER  ?? "0000000001";
const SLOT_RECT    = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECT    ?? "0000000002";
const SLOT_LEFT    = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEFT    ?? "0000000004";
const SLOT_RIGHT   = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT   ?? "0000000005";
const SLOT_STICKY  = process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY  ?? "0000000006";

// ── Placeholder visível mesmo sem AdSense aprovado ───────────────────────────
function AdPlaceholder({ w, h, label }: { w: number | string; h: number; label: string }) {
  return (
    <div className="ad-placeholder" style={{ width: w, height: h, minHeight: h }}>
      <span className="ad-placeholder-label">{label}</span>
    </div>
  );
}

// ── Banner horizontal (728×90) — dentro do conteúdo ──────────────────────────
export function AdBanner() {
  return (
    <div className="ad-banner-wrap">
      <span className="ad-label">Publicidade</span>
      {PUB_ID
        ? <AdUnit slot={SLOT_BANNER} format="horizontal" style={{ minHeight: 90 }} />
        : <AdPlaceholder w="100%" h={90} label="Espaço publicitário — 728×90" />}
    </div>
  );
}

// ── Rectangle (300×250) — entre seções de conteúdo ───────────────────────────
export function AdRect() {
  return (
    <div className="ad-rect-wrap">
      <span className="ad-label">Publicidade</span>
      {PUB_ID
        ? <AdUnit slot={SLOT_RECT} format="rectangle" style={{ minHeight: 250, width: 300 }} />
        : <AdPlaceholder w={300} h={250} label="Espaço publicitário — 300×250" />}
    </div>
  );
}

// ── Sidebar esquerda / direita (160×600) ──────────────────────────────────────
function AdSidebarUnit({ slot, side }: { slot: string; side: "left" | "right" }) {
  return (
    <div className={`ad-sidebar ad-sidebar-${side}`}>
      <span className="ad-label">Publicidade</span>
      {PUB_ID
        ? <AdUnit slot={slot} format="vertical" style={{ width: 160, minHeight: 600 }} />
        : <AdPlaceholder w={160} h={600} label="160×600" />}
    </div>
  );
}

export function AdSidebarLeft()  { return <AdSidebarUnit slot={SLOT_LEFT}  side="left"  />; }
export function AdSidebarRight() { return <AdSidebarUnit slot={SLOT_RIGHT} side="right" />; }

// ── Sticky bottom (mobile) — 320×50 ──────────────────────────────────────────
export function AdStickyBottom() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="ad-sticky-bottom">
      <button className="ad-sticky-close" onClick={() => setDismissed(true)} aria-label="Fechar">✕</button>
      <span className="ad-label">Publicidade</span>
      {PUB_ID
        ? <AdUnit slot={SLOT_STICKY} format="horizontal" style={{ minHeight: 50 }} />
        : <AdPlaceholder w="100%" h={50} label="320×50 — mobile sticky" />}
    </div>
  );
}
