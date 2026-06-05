"use client";

import { useState, useRef, useEffect } from "react";
import { PLATFORMS } from "@/lib/types";
import { useRegionFilter } from "@/lib/regionFilter";

const FLAG_EMOJI: Record<string, string> = {
  br: "🇧🇷", us: "🇺🇸", euw: "🇪🇺", eune: "🇪🇺", kr: "🇰🇷", jp: "🇯🇵",
  oce: "🇦🇺", lan: "🇲🇽", las: "🇦🇷", tr: "🇹🇷", ru: "🇷🇺", sg: "🇸🇬",
  tw: "🇹🇼", vn: "🇻🇳", ph: "🇵🇭", th: "🇹🇭",
};

interface Props {
  showLabel?: boolean;
  compact?: boolean;
}

export function RegionFilter({ showLabel = true, compact: _compact }: Props) {
  const { selected, isAll, isNone, toggle, selectAll, deselectAll } = useRegionFilter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Texto do botão
  const buttonLabel = isAll
    ? `🌐 Todas as regiões (${selected.length})`
    : isNone
      ? "🚫 Nenhuma região"
      : selected.length <= 3
        ? selected
            .map((k) => {
              const p = PLATFORMS[k as keyof typeof PLATFORMS];
              return `${FLAG_EMOJI[p.flag] ?? ""} ${k.toUpperCase().replace(/[0-9]/g, "")}`;
            })
            .join("  ")
        : `🌐 ${selected.length} regiões selecionadas`;

  return (
    <div className="region-filter" ref={ref}>
      {showLabel && <span className="region-filter-label">Servidores:</span>}

      {/* Botão dropdown */}
      <button
        className="region-dropdown-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{buttonLabel}</span>
        <span className={`region-dropdown-chevron ${open ? "open" : ""}`}>▾</span>
      </button>

      {/* Painel dropdown */}
      {open && (
        <div className="region-dropdown-panel">
          {/* Ações rápidas */}
          <div className="region-dropdown-actions">
            <button className="region-action-btn" onClick={selectAll}>
              ✅ Selecionar todas
            </button>
            <button className="region-action-btn" onClick={deselectAll}>
              ❌ Desselecionar todas
            </button>
          </div>

          {/* Lista de checkboxes */}
          <div className="region-dropdown-list">
            {Object.entries(PLATFORMS).map(([key, p]) => {
              const checked = selected.includes(key);
              const emoji = FLAG_EMOJI[p.flag] ?? "🌐";
              return (
                <label key={key} className="region-dropdown-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="region-checkbox"
                  />
                  <span className="region-item-flag">{emoji}</span>
                  <span className="region-item-code">{key.toUpperCase().replace(/[0-9]/g, "")}</span>
                  <span className="region-item-label">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
