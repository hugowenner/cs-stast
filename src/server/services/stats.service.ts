import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as playerRepo from "@/server/repositories/player.repository";
import type { RankingMetric } from "@/server/repositories/playerMatchStats.repository";

export async function getRanking(metric: RankingMetric, take?: number) {
  const rows = await statsRepo.getRankingByMetric(metric, take);

  // 1 findMany com todos os IDs de uma vez, em vez de 1 findPlayerById por linha do ranking.
  const players = await playerRepo.findPlayersByIds(rows.map((row) => row.playerId));
  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.map((row) => {
    const avgValue = (row._avg as Record<string, number | null>)[metric] ?? 0;
    return {
      player: playerById.get(row.playerId) ?? null,
      matchesPlayed: row._count._all,
      value: Math.round(avgValue * 100) / 100,
    };
  });
}

export async function getEloRanking(take?: number) {
  const rows = await statsRepo.getEloLeaderboard(take);
  const players = await playerRepo.findPlayersByIds(rows.map((row) => row.playerId));
  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.map((row) => ({
    player: playerById.get(row.playerId) ?? null,
    value: row.eloAfter,
  }));
}

export async function getMapWinrates() {
  const rows = await statsRepo.getMapWinrates();

  const byMap = new Map<
    string,
    { mapName: string; wins: number; appearances: number; matchIds: Set<string> }
  >();

  for (const row of rows) {
    const entry = byMap.get(row.match.mapId) ?? {
      mapName: row.match.map.name,
      wins: 0,
      appearances: 0,
      matchIds: new Set<string>(),
    };
    const won =
      (row.team === "A" && row.match.scoreTeamA > row.match.scoreTeamB) ||
      (row.team === "B" && row.match.scoreTeamB > row.match.scoreTeamA);
    entry.appearances += 1;
    if (won) entry.wins += 1;
    entry.matchIds.add(row.match.id);
    byMap.set(row.match.mapId, entry);
  }

  return Array.from(byMap.values()).map((entry) => ({
    map: entry.mapName,
    matchesPlayed: entry.matchIds.size,
    winrate: entry.appearances > 0 ? Math.round((entry.wins / entry.appearances) * 1000) / 10 : 0,
  }));
}

export async function getPlayerEloTimeline(playerId: string) {
  const rows = await statsRepo.getPlayerEloHistory(playerId);
  return rows.map((row) => ({
    matchId: row.match.id,
    playedAt: row.match.playedAt,
    elo: row.eloAfter,
  }));
}
