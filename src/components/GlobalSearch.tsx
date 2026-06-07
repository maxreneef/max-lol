"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

const DD_IMG = `${DD_BASE}/img`;
let cachedChampions: Array<{ id: string; name: string; image: string }> | null = null;

async function loadChampions() {
  if (cachedChampions) return cachedChampions;
  const res = await fetch(`${DD_BASE}/data/pt_BR/champion.json`);
  const data = await res.json();
  cachedChampions = Object.values(data.data as Record<string, { id: string; name: string; image: { full: string } }>).map((c) => ({
    id: c.id,
    name: c.name,
    image: `${DD_IMG}/champion/${c.image.full}`,
  }));
  return cachedChampions;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [champs, setChamps] = useState<Array<{ id: string; name: string; image: string }>>([]);
  const [highlight, setHighlight] = useState(-1);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  useEffect(() => { loadChampions().then(setChamps); }, []);

  // Sugestoes de campeao
  const suggestions = useMemo(() => {
    if (!query.trim() || query.includes("#")) return [];
    const q = query.toLowerCase();
    return champs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, champs]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (q.includes("#")) {
      router.push(`/summoner?riotId=${encodeURIComponent(q)}&region=br1`);
    } else {
      router.push(`/champion/${encodeURIComponent(q)}`);
    }
    setOpen(false);
    setQuery("");
  }

  function selectChamp(id: string) {
    router.push(`/champion/${id}`);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, -1)); }
    else if (e.key === "Enter" && highlight >= 0 && suggestions[highlight]) {
      e.preventDefault();
      selectChamp(suggestions[highlight].id);
    }
  }

  return (
    <div className="global-search" ref={ref}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Campeão ou Nome#TAG..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(-1); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="global-search-input"
          autoComplete="off"
        />
        <button type="submit" className="global-search-btn" aria-label="Buscar">🔍</button>
      </form>
      {open && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((c, i) => (
            <button
              key={c.id}
              className={`search-suggestion ${i === highlight ? "highlight" : ""}`}
              onClick={() => selectChamp(c.id)}
              onMouseEnter={() => setHighlight(i)}
            >
              <img src={c.image} alt={c.name} width={28} height={28} style={{ borderRadius: "50%" }} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
