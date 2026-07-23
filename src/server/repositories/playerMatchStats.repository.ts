import { prisma } from "@/server/db";
import { trackedPlayerStatsWhere } from "./player.repository";

export function listStatsForPlayer(playerId: string, take = 50) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    take,
    orderBy: { match: { playedAt: "desc" } },
    include: { match: { include: { map: true, session: true } } },
  });
}

export function getPlayerCareerTotals(playerId: string) {
  return prisma.playerMatchStats.aggregate({
    where: { playerId },
    _sum: { kills: true, deaths: true, assists: true, headshots: true },
    _avg: { rating: true, adr: true, kast: true, impact: true },
    _count: { _all: true },
  });
}

export function getPlayerEloHistory(playerId: string, take = 100) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    take,
    orderBy: { match: { playedAt: "asc" } },
    select: { eloAfter: true, match: { select: { playedAt: true, id: true } } },
  });
}

export function getLatestEloForPlayers(playerIds: string[]) {
  return prisma.playerMatchStats.findMany({
    where: { playerId: { in: playerIds } },
    distinct: ["playerId"],
    orderBy: [{ playerId: "asc" }, { match: { playedAt: "desc" } }],
    select: { playerId: true, eloAfter: true },
  });
}

/**
 * ELO é o valor mais recente por jogador, não uma média — não dá para expressar isso
 * num único groupBy do Prisma. Busca o ELO mais recente de todo mundo e ordena em
 * memória; aceitável na escala de um grupo privado (dezenas de jogadores).
 */
export async function getEloLeaderboard(take = 20) {
  const rows = await prisma.playerMatchStats.findMany({
    where: trackedPlayerStatsWhere(),
    distinct: ["playerId"],
    orderBy: [{ playerId: "asc" }, { match: { playedAt: "desc" } }],
    select: { playerId: true, eloAfter: true },
  });
  return rows.sort((a, b) => b.eloAfter - a.eloAfter).slice(0, take);
}

export type RankingMetric = "rating" | "adr" | "kast" | "impact";

export async function getRankingByMetric(metric: RankingMetric, take = 20) {
  const latestMatch = await prisma.match.findFirst({
    orderBy: { playedAt: "desc" },
  });
  const today = latestMatch ? new Date(latestMatch.playedAt) : new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const whereClause = {
    ...trackedPlayerStatsWhere(),
    match: {
      playedAt: {
        gte: thirtyDaysAgo,
      },
    },
  };

  switch (metric) {
    case "rating":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { rating: true },
        _count: { _all: true },
        orderBy: { _avg: { rating: "desc" } },
        take,
      });
    case "adr":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { adr: true },
        _count: { _all: true },
        orderBy: { _avg: { adr: "desc" } },
        take,
      });
    case "kast":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { kast: true },
        _count: { _all: true },
        orderBy: { _avg: { kast: "desc" } },
        take,
      });
    case "impact":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { impact: true },
        _count: { _all: true },
        orderBy: { _avg: { impact: "desc" } },
        take,
      });
  }
}

export function getMapWinrates() {
  return prisma.playerMatchStats.findMany({
    where: trackedPlayerStatsWhere(),
    select: {
      team: true,
      match: {
        select: {
          id: true,
          mapId: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: { select: { name: true } },
        },
      },
    },
  });
}

export function getPlayerMatchOutcomes(playerId: string) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    select: {
      team: true,
      rating: true,
      eloAfter: true,
      kills: true,
      deaths: true,
      match: {
        select: {
          id: true,
          playedAt: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: { select: { name: true } },
        },
      },
    },
    orderBy: { match: { playedAt: "asc" } },
  });
}
