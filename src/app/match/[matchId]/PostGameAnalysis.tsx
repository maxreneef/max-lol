"use client";

import type { MatchDTO } from "@/lib/types";

interface Props {
  match: MatchDTO;
  puuid: string;
}

interface Insight {
  type: "good" | "warn" | "tip";
  title: string;
  detail: string;
}

function analyze(match: MatchDTO, puuid: string): Insight[] {
  const p = match.info.participants.find((x) => x.puuid === puuid);
  if (!p) return [];

  const insights: Insight[] = [];
  const kda = (p.kills + p.assists) / Math.max(p.deaths, 1);
  const durationMin = match.info.gameDuration / 60;
  const csPerMin = ((p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0)) / durationMin;
  const allies = match.info.participants.filter(
    (x) => Number(x.teamId) === Number(p.teamId)
  );
  const totalTeamDmg = allies.reduce((a, b) => a + b.totalDamageDealtToChampions, 0);
  const dmgShare = totalTeamDmg > 0 ? (p.totalDamageDealtToChampions / totalTeamDmg) * 100 : 0;
  const goldPerMin = p.goldEarned / durationMin;

  // KDA
  if (kda >= 5) {
    insights.push({ type: "good", title: "KDA excelente 🏆", detail: `${kda.toFixed(1)} KDA — você ficou vivo e gerou impacto consistente.` });
  } else if (p.deaths >= 8) {
    insights.push({ type: "warn", title: "Muitas mortes", detail: `${p.deaths} mortes em ${durationMin.toFixed(0)} minutos. Tente recuar quando estiver em desvantagem numérica.` });
  } else if (kda >= 3) {
    insights.push({ type: "good", title: "Bom KDA", detail: `${kda.toFixed(1)} KDA — desempenho sólido.` });
  }

  // CS
  if (csPerMin >= 8) {
    insights.push({ type: "good", title: "CS excelente", detail: `${csPerMin.toFixed(1)} CS/min — farm de alto nível.` });
  } else if (csPerMin < 5 && durationMin > 15) {
    insights.push({ type: "warn", title: "CS abaixo do ideal", detail: `${csPerMin.toFixed(1)} CS/min. Tente completar ondas durante tempos mortos no mapa.` });
  } else if (csPerMin >= 6) {
    insights.push({ type: "tip", title: "CS razoável", detail: `${csPerMin.toFixed(1)} CS/min. Com 7+ CS/min você estará no nível de Diamond+.` });
  }

  // Dano
  if (dmgShare >= 30) {
    insights.push({ type: "good", title: "Maior dano do time", detail: `${dmgShare.toFixed(0)}% do dano total do time — você foi o carry.` });
  } else if (dmgShare < 10 && p.lane !== "UTILITY") {
    insights.push({ type: "warn", title: "Participação no dano baixa", detail: `${dmgShare.toFixed(0)}% do dano do time. Procure mais teamfights.` });
  }

  // Ouro
  if (goldPerMin >= 450) {
    insights.push({ type: "good", title: "Eficiência de ouro alta", detail: `${goldPerMin.toFixed(0)} ouro/min — excelente economia.` });
  } else if (goldPerMin < 300 && durationMin > 20) {
    insights.push({ type: "tip", title: "Ouro por minuto baixo", detail: `${goldPerMin.toFixed(0)} ouro/min. Foque em torres e objetivos além de abates.` });
  }

  // Vision
  if (p.visionScore >= 60) {
    insights.push({ type: "good", title: "Controle de visão exemplar", detail: `${p.visionScore} vision score — você deu suporte informacional ao time.` });
  } else if (p.visionScore < 15 && p.lane !== "UTILITY") {
    insights.push({ type: "tip", title: "Visão pode melhorar", detail: `${p.visionScore} vision score. Compre control wards e place wards antes dos objetivos.` });
  }

  // Participação em kills
  const teamKills = allies.reduce((a, b) => a + b.kills, 0);
  const participation = teamKills > 0 ? ((p.kills + p.assists) / teamKills) * 100 : 0;
  if (participation >= 65) {
    insights.push({ type: "good", title: "Alta participação em abates", detail: `${participation.toFixed(0)}% de participação — você esteve nos momentos decisivos.` });
  } else if (participation < 30 && durationMin > 20) {
    insights.push({ type: "warn", title: "Baixa participação", detail: `${participation.toFixed(0)}% de participação em kills. Procure jogar mais com o time.` });
  }

  // Resultado
  if (!p.win && p.kills >= 10) {
    insights.push({ type: "tip", title: "Bom desempenho individual na derrota", detail: `Você jogou bem (${p.kills}/${p.deaths}/${p.assists}), mas o time não converteu. Continue assim.` });
  }

  return insights.slice(0, 5); // máx 5 insights
}

const TYPE_STYLE: Record<string, { border: string; bg: string; icon: string }> = {
  good: { border: "rgba(81,207,102,0.35)", bg: "rgba(81,207,102,0.06)", icon: "✅" },
  warn: { border: "rgba(255,107,107,0.35)", bg: "rgba(255,107,107,0.06)", icon: "⚠️" },
  tip:  { border: "rgba(200,155,60,0.35)",  bg: "rgba(200,155,60,0.06)",  icon: "💡" },
};

export function PostGameAnalysis({ match, puuid }: Props) {
  const insights = analyze(match, puuid);
  if (!insights.length || !puuid) return null;

  return (
    <div className="post-analysis">
      <h3 className="section-title" style={{ marginTop: 0 }}>Análise pós-partida</h3>
      <div className="insights-grid">
        {insights.map((ins, i) => {
          const s = TYPE_STYLE[ins.type];
          return (
            <div
              key={i}
              className="insight-card"
              style={{ borderColor: s.border, background: s.bg }}
            >
              <p className="insight-title">{s.icon} {ins.title}</p>
              <p className="insight-detail">{ins.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
