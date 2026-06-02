import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Patch Notes — Max LoL",
  description: "Últimas atualizações de League of Legends — notas de patch oficiais da Riot Games.",
};

export const revalidate = 3600;

// Riot disponibiliza a lista de versões via Data Dragon
async function fetchVersions(): Promise<string[]> {
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", { next: { revalidate: 3600 } });
    return res.json();
  } catch {
    return [];
  }
}

function versionToDate(version: string): string {
  // Versões seguem o padrão YEAR.PATCH (ex: 15.11.1 = 2025, patch 11)
  const [year, patch] = version.split(".");
  return `Temporada ${year} · Patch ${patch}`;
}

export default async function PatchesPage() {
  const versions = await fetchVersions();
  const recent = versions.slice(0, 20);
  const current = versions[0];

  return (
    <main className="container">
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Patch Notes</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Versão atual: <strong style={{ color: "var(--accent)" }}>{current}</strong>
      </p>

      {/* Destaque da versão atual */}
      <a
        href={`https://www.leagueoflegends.com/pt-br/news/game-updates/patch-${current.split(".").slice(0, 2).join("-")}-notes/`}
        target="_blank"
        rel="noopener noreferrer"
        className="patch-featured"
      >
        <div className="patch-featured-content">
          <span className="patch-badge">Atual</span>
          <h2>Patch {current.split(".").slice(0, 2).join(".")}</h2>
          <p style={{ color: "var(--muted)" }}>{versionToDate(current)}</p>
          <p style={{ color: "var(--accent-2)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Ver notas oficiais na Riot Games →
          </p>
        </div>
      </a>

      {/* Lista de patches anteriores */}
      <h2 style={{ fontSize: "1.1rem", margin: "2rem 0 1rem", color: "var(--muted)" }}>Patches anteriores</h2>
      <div className="patch-list">
        {recent.slice(1).map((v) => {
          const [year, patch] = v.split(".");
          const patchSlug = v.split(".").slice(0, 2).join("-");
          return (
            <a
              key={v}
              href={`https://www.leagueoflegends.com/pt-br/news/game-updates/patch-${patchSlug}-notes/`}
              target="_blank"
              rel="noopener noreferrer"
              className="patch-row"
            >
              <span className="patch-version">{v.split(".").slice(0, 2).join(".")}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Temporada {year} · Patch {patch}
              </span>
              <span className="patch-link">Ver notas →</span>
            </a>
          );
        })}
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "1.5rem" }}>
        Links direcionam para as notas oficiais no site da Riot Games.
      </p>
    </main>
  );
}
