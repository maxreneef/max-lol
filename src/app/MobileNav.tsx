"use client";

import { useState } from "react";
import Link from "next/link";

const GROUPS = [
  {
    label: "Invocadores",
    items: [
      { href: "/summoner",    label: "Buscar invocador" },
      { href: "/compare",     label: "Comparar" },
      { href: "/lobby",       label: "Análise de Lobby" },
      { href: "/leaderboard", label: "Ranking" },
      { href: "/pro",         label: "Pro Players" },
    ],
  },
  {
    label: "Campeões",
    items: [
      { href: "/champions", label: "Todos os campeões" },
      { href: "/tierlist",  label: "Tier List" },
      { href: "/rotation",  label: "Rotação gratuita" },
    ],
  },
  {
    label: "Jogo",
    items: [
      { href: "/items", label: "Itens" },
      { href: "/runes", label: "Runas" },
    ],
  },
  {
    label: "Info",
    items: [
      { href: "/about",   label: "Sobre" },
      { href: "/privacy", label: "Privacidade" },
      { href: "/terms",   label: "Termos" },
      { href: "/contact", label: "Contato" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        <span /><span /><span />
      </button>
      {open && (
        <nav className="mobile-nav">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p style={{ color: "var(--muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0.5rem 0 0.25rem" }}>
                {g.label}
              </p>
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
