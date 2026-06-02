import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Max LoL",
    short_name: "Max LoL",
    description: "Estatísticas de League of Legends — perfis, tier list, histórico e mais.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#c89b3c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
