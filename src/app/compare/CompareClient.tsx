"use client";

import { useState } from "react";
import Link from "next/link";
import type { SummonerProfile, LeagueEntryDTO } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";

const TIER_ORDER = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"];
const TIER_COLORS: Record<string, string> = {
  IRON: "#7d6e5e", BRONZE: "#cd7f32", SILVER: "#adb5bd", GOLD: "#c89b3c",
  PLATINUM: "#4db8a8", EMERALD: "#51cf66", DIAMOND: "#6fa8dc",
  MASTER: "#9b59b6", GRANDMASTER: "#ff6b6b", CHALLENGER: "#c89b3c",
};

function tierScore(e: LeagueEntryDTO) {
  const t = TIER_ORDER.indexOf(e.tier);
  const r = { I: 4, II: 3, III: 2, IV: 1 }[e.rank as string] ?? 0;
  return t * 1000 + r * 100 + e.leaguePoints;
}

function wr(wins: number, losses: number) {
  const t = wins + losses;
  return t ? Math.round((wins / t) * 100) : 0;
}

interface Side {
  riotId: string;
  region: string;
  profile: SummonerProfile | null;
  loading: boolean;
  error: string | null;
}

function StatBar({ label, a, b, aVal, bVal, higherIsBetter = true }: {
  label: string; a: number; b: number; aVal: string; bVal: string; higherIsBetter?: boolean;
}) {
  const aWins = higherIsBetter ? a >= b : a <= b;
  const bWins = higherIsBetter ? b > a : b < a;
  const max = Math.max(a, b, 1);
  return (
    <div className="cmp-row">
      <span className={`cmp-val ${aWins ? "cmp-winner" : ""}`}>{aVal}</span>
      <div className="cmp-bar-wrap">
        <div className="cmp-bar-bg">
          <div className="cmp-bar-a" style={{ width: `${(a / max) * 100}%` }} />
        </div>
        <span className="cmp-label">{label}</span>
        <div className="cmp-bar-bg cmp-bar-right">
          <div className="cmp-bar-b" style={{ width: `${(b / max) * 100}%` }} />
        </div>
      </div>
      <span className={`cmp-val ${bWins ? "cmp-winner" : ""}`}>{bVal}</span>
    </div>
  );
}

export function CompareClient() {
  const [sides, setSides] = useState<[Side, Side]>([
    { riotId: "", region: "br1", profile: null, loading: false, error: null },
    { riotId: "", region: "br1", profile: null, loading: false, error: null },
  ]);

  async function fetchSide(idx: 0 | 1) {
    const s = sides[idx];
    if (!s.riotId.includes("#")) return;
    setSides((prev) => {
      const next = [...prev] as [Side, Side];
      next[idx] = { ...next[idx], loading: true, error: null, profile: null };
      return next;
    });
    try {
      const res = await fetch(`/api/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${s.region}`);
      const data = await res.json();
      setSides((prev) => {
        const next = [...prev] as [Side, Side];
        next[idx] = { ...next[idx], loading: false, profile: res.ok ? data : null, error: res.ok ? null : data.error };
        return next;
      });
    } catch {
      setSides((prev) => {
        const next = [...prev] as [Side, Side];
        next[idx] = { ...next[idx], loading: false, error: "Falha de rede." };
        return next;
      });
    }
  }

  function update(idx: 0 | 1, field: keyof Side, value: string) {
    setSides((prev) => {
      const next = [...prev] as [Side, Side];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  const [a, b] = sides;
  const aSolo = a.profile?.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const bSolo = b.profile?.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const canCompare = !!a.profile && !!b.profile;

  return (
    <div>
      {/* Input row */}
      <div className="cmp-inputs">
        {([0, 1] as const).map((idx) => (
          <div key={idx} className="cmp-input-group">
            <input
              type="text"
              placeholder="Nome#TAG"
              value={sides[idx].riotId}
              onChange={(e) => update(idx, "riotId", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSide(idx)}
              className="search-form input"
              style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "0.65rem 0.9rem" }}
              autoComplete="off"
            />
            <select
              value={sides[idx].region}
              onChange={(e) => update(idx, "region", e.target.value)}
              className="tl-sort"
            >
              {Object.entries(PLATFORMS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => fetchSide(idx)} disabled={sides[idx].loading}>
              {sides[idx].loading ? "..." : "Buscar"}
            </button>
            {sides[idx].error && <p style={{ color: "#ff6b6b", fontSize: "0.82rem", marginTop: "0.3rem" }}>{sides[idx].error}</p>}
          </div>
        ))}
      </div>

      {/* Profiles side by side */}
      {(a.profile || b.profile) && (
        <div className="cmp-profiles">
          {([a, b] as Side[]).map((s, i) => (
            <div key={i} className="cmp-profile-card">
              {s.profile ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/15.11.1/img/profileicon/${s.profile.summoner.profileIconId}.png`}
                      width={56} height={56} alt="icon" className="profile-icon"
                    />
                    <div>
                      <Link href={`/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${s.region}`} style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
                        {s.profile.account.gameName}
                        <span style={{ color: "var(--muted)", fontWeight: 400 }}>#{s.profile.account.tagLine}</span>
                      </Link>
                      <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Nível {s.profile.summoner.summonerLevel} · {s.region.toUpperCase()}</p>
                    </div>
                  </div>
                  {s.profile.ranked.map((r) => {
                    const label = r.queueType === "RANKED_SOLO_5x5" ? "Solo/Duo" : r.queueType === "RANKED_FLEX_SR" ? "Flex" : r.queueType;
                    return (
                      <div key={r.leagueId} style={{ marginBottom: "0.4rem" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>{label} </span>
                        <span style={{ color: TIER_COLORS[r.tier] ?? "var(--text)", fontWeight: 700 }}>{r.tier} {r.rank}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}> · {r.leaguePoints} LP · {wr(r.wins, r.losses)}% WR</span>
                      </div>
                    );
                  })}
                  {s.profile.ranked.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Sem ranked.</p>}
                </>
              ) : (
                <p style={{ color: "var(--muted)" }}>—</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comparison bars */}
      {canCompare && aSolo && bSolo && (
        <div className="cmp-bars-section">
          <h3 className="section-title">Solo/Duo — comparação</h3>
          <StatBar
            label="Elo Score"
            a={tierScore(aSolo)} b={tierScore(bSolo)}
            aVal={`${aSolo.tier} ${aSolo.rank} ${aSolo.leaguePoints}LP`}
            bVal={`${bSolo.tier} ${bSolo.rank} ${bSolo.leaguePoints}LP`}
          />
          <StatBar label="Win Rate %" a={wr(aSolo.wins, aSolo.losses)} b={wr(bSolo.wins, bSolo.losses)} aVal={`${wr(aSolo.wins, aSolo.losses)}%`} bVal={`${wr(bSolo.wins, bSolo.losses)}%`} />
          <StatBar label="Partidas jogadas" a={aSolo.wins + aSolo.losses} b={bSolo.wins + bSolo.losses} aVal={`${aSolo.wins + aSolo.losses}`} bVal={`${bSolo.wins + bSolo.losses}`} />
          <StatBar label="Vitórias" a={aSolo.wins} b={bSolo.wins} aVal={`${aSolo.wins}`} bVal={`${bSolo.wins}`} />
          <StatBar label="Nível" a={a.profile!.summoner.summonerLevel} b={b.profile!.summoner.summonerLevel} aVal={`${a.profile!.summoner.summonerLevel}`} bVal={`${b.profile!.summoner.summonerLevel}`} />
        </div>
      )}

      {canCompare && (!aSolo || !bSolo) && (
        <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>
          Um ou ambos os jogadores não têm ranked Solo/Duo para comparar.
        </p>
      )}
    </div>
  );
}
