"use client";

import { useEffect, useState } from "react";
import type { SummonerProfile } from "@/lib/types";

export function ApiKeyBanner({ profile }: { profile: SummonerProfile }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (profile.source === "mock") {
      setShow(true);
    }
  }, [profile.source]);

  if (!show) return null;

  return (
    <div className="api-banner">
      <span>⚠️ API Key não configurada — mostrando dados de demonstração.</span>
      <a
        href="https://developer.riotgames.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)", marginLeft: "0.5rem", fontWeight: 600 }}
      >
        Obter chave →
      </a>
      <button onClick={() => setShow(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>✕</button>
    </div>
  );
}
