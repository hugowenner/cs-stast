import { calculateEloUpdates, DEFAULT_ELO } from "@/server/domain/elo";
import { getEloKFactor } from "@/server/services/configuration.service";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import type { MatchTeam } from "@/generated/prisma";

export interface EloPlayerMatchInput {
  playerId: string;
  team: MatchTeam;
  rating: number;
}

export async function calculateEloForMatch(
  players: EloPlayerMatchInput[],
  outcome: { scoreTeamA: number; scoreTeamB: number }
) {
  const kFactor = await getEloKFactor();
  const eloBeforeRows = await statsRepo.getLatestEloForPlayers(players.map((p) => p.playerId));
  const eloBeforeByPlayerId = new Map(eloBeforeRows.map((r) => [r.playerId, r.eloAfter]));

  const eloInputs = players.map((p) => ({
    playerId: p.playerId,
    team: p.team as "A" | "B",
    eloBefore: eloBeforeByPlayerId.get(p.playerId) ?? DEFAULT_ELO,
    rating: p.rating,
  }));

  return calculateEloUpdates(eloInputs, outcome, kFactor);
}
