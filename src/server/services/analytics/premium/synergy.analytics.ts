import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumSynergyDTO {
  partnerId: string;
  partnerNickname: string;
  partnerAvatarUrl: string | null;
  sharedMatchesCount: number;
  tradesTogether: number; // trades given + received between player and partner
  combinedRating: number;  // average rating of both players in shared matches
  duoSurvivalRate: string; // Documented as FUTURE_METRIC
}

export async function getPlayerSynergyStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumSynergyDTO[]> {
  const baseWhere = buildBaseWhere(filter);

  // 1. Get all matches where the target player participated
  const playerStats = await prisma.playerMatchStats.findMany({
    where: {
      playerId: filter.playerId,
      ...baseWhere,
    },
    select: {
      matchId: true,
      rating: true,
    },
  });

  if (playerStats.length === 0) {
    return [];
  }

  const matchIds = playerStats.map((ps) => ps.matchId);
  const playerRatingByMatchId = new Map(playerStats.map((ps) => [ps.matchId, ps.rating]));

  // 2. Fetch all other players' stats in those matches
  const partnerStats = await prisma.playerMatchStats.findMany({
    where: {
      matchId: { in: matchIds },
      playerId: { not: filter.playerId },
    },
    include: {
      player: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Group stats by partner ID
  const partnerGroups = new Map<string, {
    player: typeof partnerStats[0]["player"];
    matches: { matchId: string; partnerRating: number }[];
  }>();

  for (const ps of partnerStats) {
    const partnerId = ps.playerId;
    let group = partnerGroups.get(partnerId);
    if (!group) {
      group = { player: ps.player, matches: [] };
      partnerGroups.set(partnerId, group);
    }
    group.matches.push({ matchId: ps.matchId, partnerRating: ps.rating });
  }

  // 3. Fetch trade events involving the player in these matches
  const trades = await prisma.playerTradeEvent.findMany({
    where: {
      matchId: { in: matchIds },
      OR: [
        { victimId: filter.playerId },
        { traderId: filter.playerId },
      ],
    },
  });

  const synergyList: PremiumSynergyDTO[] = [];

  for (const [partnerId, group] of partnerGroups.entries()) {
    const sharedMatchesCount = group.matches.length;

    // Trades between player and partner: (player avenged partner) OR (partner avenged player)
    const tradesTogether = trades.filter(
      (t) =>
        (t.traderId === filter.playerId && t.victimId === partnerId) ||
        (t.traderId === partnerId && t.victimId === filter.playerId)
    ).length;

    // Combined rating: average of (player rating + partner rating) / 2 in all shared matches
    let sumCombinedRating = 0;
    for (const m of group.matches) {
      const playerRating = playerRatingByMatchId.get(m.matchId) ?? 1.0;
      sumCombinedRating += (playerRating + m.partnerRating) / 2;
    }
    const combinedRating = sharedMatchesCount > 0 ? Number((sumCombinedRating / sharedMatchesCount).toFixed(2)) : 0;

    synergyList.push({
      partnerId,
      partnerNickname: group.player.nickname,
      partnerAvatarUrl: group.player.avatarUrl,
      sharedMatchesCount,
      tradesTogether,
      combinedRating,
      duoSurvivalRate: "FUTURE_METRIC (Requer telemetria de sobrevivência round-a-round do parser)",
    });
  }

  // Sort by shared matches count or combined rating desc
  return synergyList.sort((a, b) => b.sharedMatchesCount - a.sharedMatchesCount);
}
