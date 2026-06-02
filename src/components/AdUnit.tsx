"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface Props {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
}

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export function AdUnit({ slot, format = "auto", className = "", style }: Props) {
  useEffect(() => {
    if (!PUB_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // silently ignore duplicate push errors
    }
  }, []);

  if (!PUB_ID) return null;

  return (
    <div className={`ad-unit-wrap ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={PUB_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** Banner horizontal 728×90 — topo de seções */
export function AdBanner({ className = "" }: { className?: string }) {
  return (
    <AdUnit
      slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER ?? "0000000001"}
      format="horizontal"
      className={className}
      style={{ minHeight: 90, textAlign: "center" }}
    />
  );
}

/** Rectangle 300×250 — entre conteúdos */
export function AdRect({ className = "" }: { className?: string }) {
  return (
    <AdUnit
      slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECT ?? "0000000002"}
      format="rectangle"
      className={className}
      style={{ minHeight: 250 }}
    />
  );
}

/** In-feed auto — para listas longas */
export function AdInFeed({ className = "" }: { className?: string }) {
  return (
    <AdUnit
      slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED ?? "0000000003"}
      format="auto"
      className={className}
    />
  );
}
