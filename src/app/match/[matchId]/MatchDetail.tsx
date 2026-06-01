"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MatchDTO } from "@/lib/types";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
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

  // Extrai matchId da pathname: /match/[matchId]
  const matchId = pathname.split("/")[2] ?? "";
  const region = searchParams.get("region") ?? "br1";
  const puuid = searchParams.get("puuid") ?? "";

  const [match, setMatch] = useState<MatchDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/matches/${matchId}?region=${region}`
        );
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

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="search-error">{error}</p>;
  if (!match) return <p>Partida não encontrada.</p>;

  const blueTeam = match.info.teams[0];
  const redTeam = match.info.teams[1];
  const blueParticipants = match.info.participants.filter(
    (p) => p.teamId === "100"
  );
  const redParticipants = match.info.participants.filter(
    (p) => p.teamId === "200"
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
        <TeamSection
          participants={blueParticipants}
          teamId="100"
          region={region}
          puuid={puuid}
        />
        <TeamSection
          participants={redParticipants}
          teamId="200"
          region={region}
          puuid={puuid}
        />
      </div>

      {puuid && (
        <div style={{ marginTop: "2rem" }}>
          <Link href={`/summoner?riotId=${puuid}&region=${region}`} className="btn">
            ← Voltar ao perfil
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamSection({
  participants,
  teamId,
  region,
  puuid,
}: {
  participants: any[];
  teamId: string;
  region: string;
  puuid: string;
}) {
  return (
    <div className="team-section">
      {participants.map((p) => (
        <div
          key={p.puuid}
          className={`participant ${p.puuid === puuid ? "highlight" : ""}`}
        >
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/champion/${p.championName}.png`}
            alt={p.championName}
            width={48}
            height={48}
            className="champion-icon"
          />
          <div className="participant-info">
            <p className="name">
              {p.riotIdGameName}
              <span className="tag">#{p.riotIdTagline}</span>
            </p>
            <p className="champion">{p.championName}</p>
            <p className="kda">
              <strong>{p.kills}</strong> / {p.deaths} / <strong>{p.assists}</strong>
            </p>
          </div>
          <div className="participant-stats">
            <p className="gold">{(p.goldEarned / 1000).toFixed(1)}k ouro</p>
            <p className="damage">
              {(p.totalDamageDealtToChampions / 1000).toFixed(1)}k dano
            </p>
            <p className="vision">Vision: {p.visionScore}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
