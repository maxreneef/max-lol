import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Max LoL — Estatísticas de League of Legends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0e14",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          gap: 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: "#0a0e14",
              border: "2px solid #c89b3c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#c89b3c",
            }}
          >
            M
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 64, fontWeight: 800, color: "#e6edf3", lineHeight: 1 }}>
              Max{" "}
              <span style={{ color: "#c89b3c" }}>LoL</span>
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 28, color: "#8b98a8", textAlign: "center", maxWidth: 800, margin: 0 }}>
          Estatísticas de League of Legends — Perfis, Tier List, Histórico e muito mais
        </p>

        {/* Features */}
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {["Busca de invocadores", "Tier List", "Histórico de partidas", "Leaderboard"].map((f) => (
            <div
              key={f}
              style={{
                background: "#111722",
                border: "1px solid #1e2733",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 18,
                color: "#0ac8b9",
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <p style={{ fontSize: 20, color: "#8b98a8", marginTop: 8 }}>
          max-lol.vercel.app
        </p>
      </div>
    ),
    { ...size }
  );
}
