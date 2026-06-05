"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type DataSource = "onetrick" | "all";

interface Props {
  /** Valor atual (vem do searchParams ou estado) */
  value?: DataSource;
  /** Label opcional acima do toggle */
  label?: string;
}

export function DataSourceToggle({ value, label = "Fonte dos dados" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = (value ?? (searchParams.get("source") || "onetrick")) as DataSource;

  const setSource = useCallback(
    (source: DataSource) => {
      const params = new URLSearchParams(searchParams.toString());
      if (source === "onetrick") {
        params.delete("source"); // default é onetrick, não precisa na URL
      } else {
        params.set("source", source);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const isOneTrick = current === "onetrick";

  return (
    <div className="data-source-toggle">
      {label && <span className="data-source-toggle-label">{label}</span>}

      <div className="data-source-toggle-switch" role="radiogroup" aria-label={label}>
        <button
          className={`data-source-option${isOneTrick ? " active" : ""}`}
          onClick={() => setSource("onetrick")}
          role="radio"
          aria-checked={isOneTrick}
        >
          <span className="data-source-icon">☝️</span>
          <span className="data-source-text">
            <strong>Monochampions</strong>
            <small>Dados de one-tricks (50+ partidas)</small>
          </span>
        </button>

        <button
          className={`data-source-option${!isOneTrick ? " active" : ""}`}
          onClick={() => setSource("all")}
          role="radio"
          aria-checked={!isOneTrick}
        >
          <span className="data-source-icon">🌐</span>
          <span className="data-source-text">
            <strong>Todos os Jogadores</strong>
            <small>Dados gerais da base inteira</small>
          </span>
        </button>
      </div>
    </div>
  );
}
