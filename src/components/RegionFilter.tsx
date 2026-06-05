"use client";

import { PLATFORMS } from "@/lib/types";
import { useRegionFilter } from "@/lib/regionFilter";

const FLAG_EMOJI: Record<string, string> = {
  br: "🇧🇷",
  us: "🇺🇸",
  euw: "🇪🇺",
  eune: "🇪🇺",
  kr: "🇰🇷",
  jp: "🇯🇵",
  oce: "🇦🇺",
  lan: "🇲🇽",
  las: "🇦🇷",
  tr: "🇹🇷",
  ru: "🇷🇺",
  sg: "🇸🇬",
  tw: "🇹🇼",
  vn: "🇻🇳",
  ph: "🇵🇭",
  th: "🇹🇭",
};

interface Props {
  /** Se true, mostra label "Servidores:" antes dos chips */
  showLabel?: boolean;
  /** Se true, oculta chips individuais e mostra só botão "Todas" */
  compact?: boolean;
}

export function RegionFilter({ showLabel = true, compact = false }: Props) {
  const { selected, isAll, toggle, selectAll, allRegions } = useRegionFilter();

  return (
    <div className="region-filter">
      {showLabel && <span className="region-filter-label">Servidores:</span>}

      <button
        className={`region-chip${isAll ? " active" : ""}`}
        onClick={selectAll}
        aria-pressed={isAll}
      >
        🌐 Todas
      </button>

      {!compact &&
        allRegions.map((key) => {
          const p = PLATFORMS[key as keyof typeof PLATFORMS];
          const active = selected.includes(key);
          const emoji = FLAG_EMOJI[p.flag] ?? "🌐";

          return (
            <button
              key={key}
              className={`region-chip${active ? " active" : ""}`}
              onClick={() => toggle(key)}
              aria-pressed={active}
              title={p.label}
            >
              <span className="region-chip-flag">{emoji}</span>
              <span className="region-chip-code">{key.toUpperCase().replace(/[0-9]/g, "")}</span>
            </button>
          );
        })}
    </div>
  );
}
