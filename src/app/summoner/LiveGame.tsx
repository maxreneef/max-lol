"use client";

import { useEffect, useState, useCallback } from "react";
import { championIcon, DD_BASE } from "@/lib/ddragon";
import type { LiveGame } from "@/lib/types";

const QUEUE_LABELS: Record<number, string> = {
  420: "Ranqueada Solo/Duo",
  440: "Ranqueada Flex",
  450: "ARAM",
  400: "Normal",
  700: "Clash",
  900: "URF",
};

// Mapa de championId → name. Carregamos em runtime do Data Dragon.
let champMap: Record<number, string> = {};
async function loadChampMap() {
  if (Object.keys(champMap).length) return;
  try {
    const res = await fetch(
      `${DD_BASE}/data/pt_BR/champion.json`
    );
    const json = await res.json();
    champMap = Object.fromEntries(
      Object.values(json.data as Record<string, { key: string; id: string }>).map(
        (c) => [parseInt(c.key), c.id]
      )
    );
  } catch {}
}

function formatElapsed(startTime: number, gameLength: number): string {
  const elapsed = gameLength > 0 ? gameLength : Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

interface Props {
  puuid: string;
  region: string;
}

export function LiveGame({ puuid, region }: Props) {
  const [game, setGame] = useState<LiveGame | null | undefined>(undefined);
  const [elapsed, setElapsed] = useState("");
  const [champNames, setChampNames] = useState<Record<number, string>>({});

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/live?puuid=${encodeURIComponent(puuid)}&region=${region}`);
      const data = await res.json();
      setGame(data.game ?? null);
    } catch {
      setGame(null);
    }
  }, [puuid, region]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 60_000); // re-poll a cada 60s
    return () => clearInterval(interval);
  }, [fetchGame]);

  useEffect(() => {
    if (!game) return;
    loadChampMap().then(() => setChampNames({ ...champMap }));

    const t = setInterval(() => {
      setElapsed(formatElapsed(game.gameStartTime, game.gameLength));
    }, 1000);
    setElapsed(formatElapsed(game.gameStartTime, game.gameLength));
    return () => clearInterval(t);
  }, [game]);

  if (game === undefined) return null; // ainda carregando
  if (game === null) return null;      // não está em partida

  const blue = game.participants.filter((p) => p.teamId === 100);
  const red = game.participants.filter((p) => p.teamId === 200);

  return (
    <div className="live-banner">
      <div className="live-header">
        <span className="live-dot" />
        <strong>AO VIVO</strong>
        <span className="live-queue">
          {QUEUE_LABELS[game.gameQueueConfigId] ?? game.gameMode}
        </span>
        <span className="live-elapsed">{elapsed}</span>
      </div>

      <div className="live-teams">
        <div className="live-team">
          {blue.map((p) => {
            const champ = champNames[p.championId] ?? "Unknown";
            return (
              <div key={p.puuid} className={`live-player ${p.puuid === puuid ? "live-highlight" : ""}`}>
                <img
                  src={championIcon(champ)}
                  alt={champ}
                  width={36}
                  height={36}
                  className="live-champ-icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="live-name">
                  {p.riotId.split("#")[0] || "—"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="live-vs">VS</div>
        <div className="live-team">
          {red.map((p) => {
            const champ = champNames[p.championId] ?? "Unknown";
            return (
              <div key={p.puuid} className={`live-player ${p.puuid === puuid ? "live-highlight" : ""}`}>
                <img
                  src={championIcon(champ)}
                  alt={champ}
                  width={36}
                  height={36}
                  className="live-champ-icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="live-name">
                  {p.riotId.split("#")[0] || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
