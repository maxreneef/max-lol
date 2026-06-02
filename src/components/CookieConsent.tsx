"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const KEY = "maxlol_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <div className="cookie-text">
        <strong>Usamos cookies</strong> para anúncios personalizados (Google AdSense) e para melhorar sua experiência.
        Ao continuar, você concorda com nossa{" "}
        <Link href="/privacy">Política de Privacidade</Link>.
      </div>
      <div className="cookie-actions">
        <button className="cookie-btn-reject" onClick={reject}>Rejeitar</button>
        <button className="cookie-btn-accept" onClick={accept}>Aceitar</button>
      </div>
    </div>
  );
}
