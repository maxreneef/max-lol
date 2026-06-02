"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/types";

export function HomeSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("br1");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (riotId.includes("#")) {
      router.push(`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="home-search-form">
      <div style={{ position: "relative", flex: "1 1 260px" }}>
        <input
          type="text"
          placeholder="Riot ID — Ex: KierDock#13116"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          className="home-search-input"
          autoComplete="off"
        />
      </div>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="home-search-select"
      >
        {Object.entries(PLATFORMS).map(([v, { label }]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary btn-lg">
        Buscar →
      </button>
    </form>
  );
}
