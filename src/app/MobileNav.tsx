"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/summoner", label: "Buscar" },
  { href: "/tierlist", label: "Tier List" },
  { href: "/leaderboard", label: "Ranking" },
  { href: "/lobby", label: "Lobby" },
  { href: "/compare", label: "Comparar" },
  { href: "/rotation", label: "Rotação" },
  { href: "/items", label: "Itens" },
  { href: "/privacy", label: "Privacidade" },
  { href: "/terms", label: "Termos" },
  { href: "/contact", label: "Contato" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <nav className="mobile-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
