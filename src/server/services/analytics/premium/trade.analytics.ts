import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumTradeDTO {
  tradeKills: number;      // Trade Given (How many times player traded an opponent)
  tradedDeaths: number;    // Trade Received (How many times teammate avenged player's death)
  totalDeaths: number;     // Total deaths of the player in these matches
  tradeEfficiency: number; // tradedDeaths / totalDeaths * 100
}

export async function getPlayerTradeStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumTradeDTO> {
  const baseWhere = buildBaseWhere(filter);

  // 1. Count trade kills given (player got the revenge kill)
  const tradeKills = await prisma.playerTradeEvent.count({
    where: {
      traderId: filter.playerId,
      ...baseWhere,
    },
  });

  // 2. Count traded deaths received (player was the victim, teammate got the revenge kill)
  const tradedDeaths = await prisma.playerTradeEvent.count({
    where: {
      victimId: filter.playerId,
      ...baseWhere,
    },
  });

  // 3. Count total deaths from PlayerMatchStats to calculate trade efficiency
  const statsSum = await prisma.playerMatchStats.aggregate({
    where: {
      playerId: filter.playerId,
      ...baseWhere,
    },
    _sum: {
      deaths: true,
    },
  });

  const totalDeaths = statsSum._sum.deaths ?? 0;
  const tradeEfficiency =
    totalDeaths > 0 ? Math.round((tradedDeaths / totalDeaths) * 100) : 0;

  return {
    tradeKills,
    tradedDeaths,
    totalDeaths,
    tradeEfficiency,
  };
}
