"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

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

  return (
    <div className="global-search" ref={ref}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Buscar campeão ou jogador..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="global-search-input"
          autoComplete="off"
        />
        <button type="submit" className="global-search-btn" aria-label="Buscar">🔍</button>
      </form>
    </div>
  );
}
