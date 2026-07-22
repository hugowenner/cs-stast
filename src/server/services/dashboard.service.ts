import { prisma } from "@/server/db";
import * as matchRepo from "@/server/repositories/match.repository";
import * as playerRepo from "@/server/repositories/player.repository";
import * as sessionRepo from "@/server/repositories/session.repository";
import * as statsService from "@/server/services/stats.service";

export async function getDashboardSummary() {
  const [totalMatches, totalPlayers, totalSessions, latestSession, allStats, allMatches] = await Promise.all([
    matchRepo.countMatches(),
    playerRepo.countPlayers(),
    sessionRepo.countSessions(),
    sessionRepo.getLatestSession(),
    prisma.playerMatchStats.findMany({
      where: { player: { trackedPlayer: { active: true } } },
      include: { match: true },
    }),
    prisma.match.findMany(),
  ]);

  // Aritmética comunitária
  const totalKills = allStats.reduce((sum, s) => sum + s.kills, 0);
  const totalHeadshots = allStats.reduce((sum, s) => sum + s.headshots, 0);
  const avgKills = allStats.length > 0 ? totalKills / allStats.length : 0;
  const avgHsPercent = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;

  let wins = 0;
  for (const s of allStats) {
    const won =
      (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
      (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
    if (won) wins++;
  }
  const avgWinrate = allStats.length > 0 ? (wins / allStats.length) * 100 : 0;
  const totalRounds = allMatches.reduce((sum, m) => sum + m.scoreTeamA + m.scoreTeamB, 0);

  // Mapa dominante
  const mapCounts = await prisma.match.groupBy({
    by: ["mapId"],
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
        percentage: allMatches.length > 0 ? Math.round((dominantMapGroup._count.id / allMatches.length) * 100) : 0,
      };
    }
  }

  // Melhor jogador — piso mínimo de partidas para não eleger MVP com amostra pequena
  const MIN_MATCHES_FOR_MVP = 10;
  const ratingLeaderboard = await statsService.getRanking("rating", 50);
  const bestPlayerEntry = ratingLeaderboard.find(
    (entry) => entry.player && entry.matchesPlayed >= MIN_MATCHES_FOR_MVP,
  );
  const bestPlayer = bestPlayerEntry?.player
    ? {
        nickname: bestPlayerEntry.player.nickname,
        rating: bestPlayerEntry.value,
      }
    : null;

  // Nota: recordes individuais (maior kills/clutch/streak) não são recalculados aqui —
  // esse resultado nunca era exibido na Dashboard; getHallOfFameRecords() (competitive.service.ts)
  // já calcula os mesmos recordes de forma independente e é o que realmente é renderizado.

  return {
    totalMatches,
    totalPlayers,
    totalSessions,
    latestSession,
    community: {
      avgWinrate: Math.round(avgWinrate),
      avgKills: Number(avgKills.toFixed(1)),
      avgHsPercent: Math.round(avgHsPercent),
      totalRounds,
    },
    dominantMap,
    bestPlayer,
  };
}
