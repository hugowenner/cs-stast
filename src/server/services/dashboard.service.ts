import * as matchRepo from "@/server/repositories/match.repository";
import * as playerRepo from "@/server/repositories/player.repository";
import * as sessionRepo from "@/server/repositories/session.repository";

export async function getDashboardSummary() {
  const [totalMatches, totalPlayers, totalSessions, latestSession] = await Promise.all([
    matchRepo.countMatches(),
    playerRepo.countPlayers(),
    sessionRepo.countSessions(),
    sessionRepo.getLatestSession(),
  ]);

  return { totalMatches, totalPlayers, totalSessions, latestSession };
}
