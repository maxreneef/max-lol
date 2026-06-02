import type { Metadata } from "next";
import { LeaderboardClient } from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard — Max LoL",
  description: "Os melhores jogadores de League of Legends — Challenger, Grandmaster e Master.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
