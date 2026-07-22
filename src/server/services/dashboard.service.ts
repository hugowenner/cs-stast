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
  const totalDeaths = allStats.reduce((sum, s) => sum + s.deaths, 0);
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

  // Melhor jogador
  const leaderboard = await statsService.getRanking("rating", 1);
  const bestPlayer = leaderboard[0] && leaderboard[0].player
    ? {
        nickname: leaderboard[0].player.nickname,
        rating: leaderboard[0].value,
      }
    : null;

  // Destaques da Temporada (Recordes)
  const maxKillsRow = await prisma.playerMatchStats.findFirst({
    where: { player: { trackedPlayer: { active: true } } },
    orderBy: { kills: "desc" },
    include: { player: true, match: { include: { map: true } } },
  });
  const recordKills = maxKillsRow
    ? {
        player: maxKillsRow.player.nickname,
        value: maxKillsRow.kills,
        mapName: maxKillsRow.match.map.name,
      }
    : null;

  const maxClutchRow = await prisma.playerMatchStats.findFirst({
    where: {
      OR: [
        { clutch1v5Wins: { gt: 0 } },
        { clutch1v4Wins: { gt: 0 } },
        { clutch1v3Wins: { gt: 0 } },
      ],
      player: { trackedPlayer: { active: true } },
    },
    orderBy: [{ clutch1v5Wins: "desc" }, { clutch1v4Wins: "desc" }, { clutch1v3Wins: "desc" }],
    include: { player: true, match: { include: { map: true } } },
  });
  let recordClutch = null;
  if (maxClutchRow) {
    let type = "1v3";
    if (maxClutchRow.clutch1v5Wins > 0) type = "1v5";
    else if (maxClutchRow.clutch1v4Wins > 0) type = "1v4";
    recordClutch = {
      player: maxClutchRow.player.nickname,
      type,
      mapName: maxClutchRow.match.map.name,
    };
  }

  // Maior sequência de vitórias consecutivas (Win Streak)
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });
  let maxStreak = 0;
  let maxStreakPlayer = "";
  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      orderBy: { match: { playedAt: "asc" } },
      include: { match: true },
    });
    let currentStreak = 0;
    let playerMaxStreak = 0;
    for (const stat of stats) {
      const won =
        (stat.team === "A" && stat.match.scoreTeamA > stat.match.scoreTeamB) ||
        (stat.team === "B" && stat.match.scoreTeamB > stat.match.scoreTeamA);
      if (won) {
        currentStreak++;
        if (currentStreak > playerMaxStreak) playerMaxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
    if (playerMaxStreak > maxStreak) {
      maxStreak = playerMaxStreak;
      maxStreakPlayer = player.nickname;
    }
  }
  const recordStreak =
    maxStreak > 0
      ? {
          player: maxStreakPlayer,
          value: maxStreak,
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
      avgHsPercent: Math.round(avgHsPercent),
      totalRounds,
    },
    dominantMap,
    bestPlayer,
    highlights: {
      streak: recordStreak,
      kills: recordKills,
      clutch: recordClutch,
    },
  };
}
