import * as teamBalanceService from "@/server/services/team-balance.service";
import { TeamBalanceClient } from "./team-balance-client";
import { safeQuery } from "@/server/safeQuery";
import { getActiveSeason } from "@/server/services/season.service";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function TeamBalancePage() {
  // Carrega a lista inicial de jogadores consolidados no servidor para evitar waterfall/loading-state
  const initialPlayers = await safeQuery(() => teamBalanceService.getAvailablePlayers(), []);
  
  const activeSeason = await safeQuery(() => getActiveSeason(), null);
  let seasonName = "Temporada Atual";
  let matchesCount = 0;

  if (activeSeason) {
    seasonName = activeSeason.name;
    matchesCount = await safeQuery(
      () =>
        prisma.match.count({
          where: {
            seasonId: activeSeason.id,
            trackedPlayersCount: { gte: 2 },
          },
        }),
      0
    );
  }

  return (
    <TeamBalanceClient
      initialPlayers={initialPlayers}
      activeSeasonName={seasonName}
      activeSeasonMatches={matchesCount}
    />
  );
}
