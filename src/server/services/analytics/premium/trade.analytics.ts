import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumTradeDTO {
  tradeKills: number;        // Trade Given (How many times player traded an opponent)
  tradedDeaths: number;      // Trade Received (How many times teammate avenged player's death)
  totalDeaths: number;       // Total deaths of the player in these matches
  tradeEfficiency: number;   // tradedDeaths / totalDeaths * 100
  avgTradeTime: number | null; // Average seconds to complete a trade (null = no valid data)
}

export async function getPlayerTradeStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumTradeDTO> {
  const baseWhere = buildBaseWhere(filter);

  const [tradeKills, tradedDeaths, statsSum, avgResult] = await Promise.all([
    // 1. Count trade kills given (player got the revenge kill)
    prisma.playerTradeEvent.count({
      where: { traderId: filter.playerId, ...baseWhere },
    }),
    // 2. Count traded deaths received (player was the victim, teammate got the revenge kill)
    prisma.playerTradeEvent.count({
      where: { victimId: filter.playerId, ...baseWhere },
    }),
    // 3. Total deaths for trade efficiency denominator
    prisma.playerMatchStats.aggregate({
      where: { playerId: filter.playerId, ...baseWhere },
      _sum: { deaths: true },
    }),
    // 4. Average trade time — only events where timeDiff > 0 (0 = fallback/no valid time data)
    prisma.playerTradeEvent.aggregate({
      where: { traderId: filter.playerId, timeDiff: { gt: 0 }, ...baseWhere },
      _avg: { timeDiff: true },
    }),
  ]);

  const totalDeaths = statsSum._sum.deaths ?? 0;
  const tradeEfficiency =
    totalDeaths > 0 ? Math.round((tradedDeaths / totalDeaths) * 100) : 0;

  const rawAvg = avgResult._avg.timeDiff;
  const avgTradeTime = rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null;

  return {
    tradeKills,
    tradedDeaths,
    totalDeaths,
    tradeEfficiency,
    avgTradeTime,
  };
}
