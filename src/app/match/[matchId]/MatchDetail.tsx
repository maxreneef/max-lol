"use client";

import { DD_BASE } from "@/lib/ddragon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MatchDTO } from "@/lib/types";
import { PostGameAnalysis } from "./PostGameAnalysis";

// gameDuration vem em SEGUNDOS na API v5
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchDetail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const matchId = pathname.split("/")[2] ?? "";
  const region = searchParams.get("region") ?? "br1";
  const puuid = searchParams.get("puuid") ?? "";

  const [match, setMatch] = useState<MatchDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/matches/${matchId}?region=${region}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erro ao carregar partida.");
        } else {
          setMatch(data as MatchDTO);
        }
      } catch {
        setError("Falha de rede.");
      } finally {
        setLoading(false);
      }
    }
    if (matchId) load();
  }, [matchId, region]);

  if (loading) return <p style={{ color: "var(--muted)", padding: "2rem 0" }}>Carregando partida...</p>;
  if (error) return <p className="search-error">{error}</p>;
  if (!match) return <p>Partida não encontrada.</p>;

  // teamId vem como número (100 / 200) na API v5
  const blueTeam = match.info.teams.find((t) => Number(t.teamId) === 100) ?? match.info.teams[0];
  const redTeam = match.info.teams.find((t) => Number(t.teamId) === 200) ?? match.info.teams[1];
  const blueParticipants = match.info.participants.filter(
    (p) => Number(p.teamId) === 100
  );
  const redParticipants = match.info.participants.filter(
    (p) => Number(p.teamId) === 200
  );

  return (
    <div className="match-detail">
      <div className="match-header">
        <div className={`team-summary ${blueTeam.win ? "winner" : ""}`}>
          <h2>Time Azul</h2>
          <p className="result">{blueTeam.win ? "VITÓRIA" : "DERROTA"}</p>
        </div>
        <div className="match-info">
          <p>
            <strong>{formatDuration(match.info.gameDuration)}</strong>
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {formatDate(match.info.gameCreation)}
          </p>
        </div>
        <div className={`team-summary ${redTeam.win ? "winner" : ""}`}>
          <h2>Time Vermelho</h2>
          <p className="result">{redTeam.win ? "VITÓRIA" : "DERROTA"}</p>
        </div>
      </div>

      <div className="teams-container">
        <TeamSection participants={blueParticipants} puuid={puuid} />
        <TeamSection participants={redParticipants} puuid={puuid} />
      </div>

      {puuid && <PostGameAnalysis match={match} puuid={puuid} />}

      <div style={{ marginTop: "2rem" }}>
        <Link href="/summoner" className="btn">
          ← Voltar à busca
        </Link>
      </div>
    </div>
  );
}

const DD = DD_BASE;

function ItemSlot({ itemId }: { itemId: number }) {
  if (!itemId) return <div className="item-slot empty" />;
  return (
    <img
      src={`${DD}/img/item/${itemId}.png`}
      alt={`Item ${itemId}`}
      width={24}
      height={24}
      className="item-slot"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function TeamSection({
  participants,
  puuid,
}: {
  participants: any[];
  puuid: string;
}) {
  return (
    <div className="team-section">
      {participants.map((p) => {
        const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
        return (
          <div
            key={p.puuid}
            className={`participant ${p.puuid === puuid ? "highlight" : ""}`}
          >
            <img
              src={`${DD}/img/champion/${p.championName}.png`}
              alt={p.championName}
              width={48}
              height={48}
              className="champion-icon"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="participant-info">
              <p className="name">
                {p.riotIdGameName || p.summonerName}
                {p.riotIdTagline && <span className="tag">#{p.riotIdTagline}</span>}
              </p>
              <p className="champion">{p.championName}</p>
              <p className="kda">
                <strong>{p.kills}</strong> / {p.deaths} / <strong>{p.assists}</strong>
              </p>
              <div className="items-row">
                {items.map((id, idx) => <ItemSlot key={idx} itemId={id} />)}
              </div>
            </div>
            <div className="participant-stats">
              <p className="gold">{(p.goldEarned / 1000).toFixed(1)}k ouro</p>
              <p className="damage">{(p.totalDamageDealtToChampions / 1000).toFixed(1)}k dano</p>
              <p className="vision">Vision: {p.visionScore}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
