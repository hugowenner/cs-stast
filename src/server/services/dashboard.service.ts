import { prisma } from "@/server/db";
import * as playerRepo from "@/server/repositories/player.repository";
import * as statsService from "@/server/services/stats.service";
import type { CompetitiveDataset } from "@/server/services/competitive.service";
import { communityMatchWhere, individualMatchWhere } from "@/server/domain/matchClassification";
import { getActiveSeason, resolveSeasonId } from "@/server/services/season.service";

/**
 * Reaproveita dataset.allStats (mesma query já feita por competitive.service, já
 * filtrada para partidas COMUNIDADE) quando disponível, em vez de buscar
 * PlayerMatchStats de novo. Sem dataset (ex: rota do Coach, que chama
 * getDashboardSummary isoladamente), busca com o mesmo shape E o mesmo filtro de
 * comunidade e temporada.
 */
function loadSummaryStats(seasonId?: string, dataset?: CompetitiveDataset) {
  if (dataset) return Promise.resolve(dataset.allStats);
  return prisma.playerMatchStats.findMany({
    where: {
      player: { trackedPlayer: { active: true } },
      match: {
        seasonId: seasonId ?? undefined,
        ...individualMatchWhere(),
      },
    },
    include: { match: { include: { map: true } } },
  });
}

export async function getDashboardSummary(
  seasonIdOrDataset?: string | CompetitiveDataset,
  dataset?: CompetitiveDataset
) {
  let targetSeasonId: string | undefined;
  let targetDataset: CompetitiveDataset | undefined;

  if (seasonIdOrDataset) {
    if (typeof seasonIdOrDataset === "string") {
      targetSeasonId = seasonIdOrDataset;
      targetDataset = dataset;
    } else {
      targetDataset = seasonIdOrDataset;
      targetSeasonId = undefined;
    }
  }

  const resolvedSeasonId = await resolveSeasonId(targetSeasonId);

  const [
    totalMatches,
    totalPlayers,
    totalSessions,
    latestSession,
    allStats,
    allMatchesCount,
    roundsAgg,
  ] = await Promise.all([
    // Contagem de partidas da temporada (apenas comunidade)
    prisma.match.count({
      where: {
        seasonId: resolvedSeasonId,
        ...individualMatchWhere(),
      },
    }),
    // Jogadores monitorados ativos permanecem históricos/globais
    playerRepo.countPlayers(),
    // Sessões que contêm partidas da temporada
    prisma.session.count({
      where: {
        matches: {
          some: {
            seasonId: resolvedSeasonId,
            ...communityMatchWhere(),
          },
        },
      },
    }),
    // Última sessão com atividade na temporada
    prisma.session.findFirst({
      where: {
        matches: {
          some: {
            seasonId: resolvedSeasonId,
            ...communityMatchWhere(),
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    loadSummaryStats(resolvedSeasonId, targetDataset),
    prisma.match.count({
      where: {
        seasonId: resolvedSeasonId,
        ...individualMatchWhere(),
      },
    }),
    prisma.match.aggregate({
      where: {
        seasonId: resolvedSeasonId,
        ...individualMatchWhere(),
      },
      _sum: { scoreTeamA: true, scoreTeamB: true },
    }),
  ]);

  // Aritmética comunitária da temporada
  const totalKills = allStats.reduce((sum, s) => sum + s.kills, 0);
  const totalDeaths = allStats.reduce((sum, s) => sum + s.deaths, 0);
  const totalAdr = allStats.reduce((sum, s) => sum + s.adr, 0);
  const totalHeadshots = allStats.reduce((sum, s) => sum + s.headshots, 0);
  const avgKills = allStats.length > 0 ? totalKills / allStats.length : 0;
  const avgAdr = allStats.length > 0 ? totalAdr / allStats.length : 0;
  const avgKd = totalDeaths > 0 ? totalKills / totalDeaths : 0;
  const avgHsPercent = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;

  let wins = 0;
  for (const s of allStats) {
    const won =
      (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
      (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
    if (won) wins++;
  }
  const avgWinrate = allStats.length > 0 ? (wins / allStats.length) * 100 : 0;
  const totalRounds = (roundsAgg._sum.scoreTeamA ?? 0) + (roundsAgg._sum.scoreTeamB ?? 0);

  // Mapa dominante na temporada — só partidas COMUNIDADE.
  const mapCounts = await prisma.match.groupBy({
    by: ["mapId"],
    where: {
      seasonId: resolvedSeasonId,
      ...individualMatchWhere(),
    },
    _count: { id: true },
  });
  const dominantMapGroup = [...mapCounts].sort((a, b) => b._count.id - a._count.id)[0];
  let dominantMap = null;
  if (dominantMapGroup) {
    const mapObj = await prisma.map.findUnique({ where: { id: dominantMapGroup.mapId } });
    if (mapObj) {
      dominantMap = {
        name: mapObj.name,
        count: dominantMapGroup._count.id,
        percentage: allMatchesCount > 0 ? Math.round((dominantMapGroup._count.id / allMatchesCount) * 100) : 0,
      };
    }
  }

  // Melhor jogador da temporada — piso mínimo de partidas
  const MIN_MATCHES_FOR_MVP = 10;
  const ratingLeaderboard = await statsService.getRanking("rating", resolvedSeasonId, 50);
  const bestPlayerEntry = ratingLeaderboard.find(
    (entry) => entry.player && entry.matchesPlayed >= MIN_MATCHES_FOR_MVP,
  );
  const bestPlayer = bestPlayerEntry?.player
    ? {
        nickname: bestPlayerEntry.player.nickname,
        rating: bestPlayerEntry.value,
        avatarUrl: bestPlayerEntry.player.avatarUrl,
      }
    : null;

  return {
    totalMatches,
    totalPlayers,
    totalSessions,
    latestSession,
    community: {
      avgWinrate: Math.round(avgWinrate),
      avgKills: Number(avgKills.toFixed(1)),
      avgAdr: Math.round(avgAdr),
      avgKd: Number(avgKd.toFixed(2)),
      avgHsPercent: Math.round(avgHsPercent),
      totalKills,
      totalRounds,
    },
    dominantMap,
    bestPlayer,
  };
}
