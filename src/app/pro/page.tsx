import type { Metadata } from "next";
import { Suspense } from "react";
import { ProPlayersClient } from "./ProPlayersClient";
import { PageWithAds } from "@/components/PageWithAds";

export const metadata: Metadata = {
  title: "Pro Players — Max LoL",
  description:
    "Jogadores profissionais de League of Legends de todos os servidores: CBLOL, LCK, LPL, LEC, LCS e mais. Filtre por região, role e campeão.",
};

export default function ProPlayersPage() {
  return (
    <PageWithAds>
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Carregando...</div>}>
        <ProPlayersClient />
      </Suspense>
    </PageWithAds>
  );
}
