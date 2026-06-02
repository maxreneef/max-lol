"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface NavGroup {
  label: string;
  items: { href: string; label: string; desc: string }[];
}

const NAV: NavGroup[] = [
  {
    label: "Invocadores",
    items: [
      { href: "/summoner",  label: "Buscar",    desc: "Perfil, elo e histórico" },
      { href: "/compare",   label: "Comparar",  desc: "Dois invocadores lado a lado" },
      { href: "/lobby",     label: "Lobby",     desc: "Analisar até 10 jogadores" },
      { href: "/leaderboard", label: "Ranking", desc: "Challenger, GM e Master" },
    ],
  },
  {
    label: "Campeões",
    items: [
      { href: "/champions", label: "Todos os campeões", desc: "Grid com filtros por role" },
      { href: "/tierlist",  label: "Tier List",         desc: "Ranking por win rate" },
      { href: "/rotation",  label: "Rotação gratuita",  desc: "Campeões grátis esta semana" },
      { href: "/spells",    label: "Buscar habilidade", desc: "Encontre campeões por spell" },
    ],
  },
  {
    label: "Jogo",
    items: [
      { href: "/items",   label: "Itens",        desc: "Banco de dados completo" },
      { href: "/runes",   label: "Runas",        desc: "Todas as árvores de runas" },
      { href: "/patches", label: "Patch Notes",  desc: "Últimas atualizações do jogo" },
      { href: "/about",   label: "Sobre",        desc: "Sobre o Max LoL" },
    ],
  },
];

export function NavMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="nav-menu" ref={menuRef}>
      {NAV.map((group) => (
        <div key={group.label} className="nav-group">
          <button
            className={`nav-group-btn ${open === group.label ? "active" : ""}`}
            onClick={() => setOpen(open === group.label ? null : group.label)}
          >
            {group.label}
            <span className="nav-chevron">{open === group.label ? "▴" : "▾"}</span>
          </button>
          {open === group.label && (
            <div className="nav-dropdown">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-dropdown-item"
                  onClick={() => setOpen(null)}
                >
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-desc">{item.desc}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
