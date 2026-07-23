import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as playerRepo from "@/server/repositories/player.repository";
import type { RankingMetric } from "@/server/repositories/playerMatchStats.repository";
import { prisma } from "@/server/db";

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

const MIN_MATCHES_FOR_EXTRA_RANKINGS = 3;

// K/D ranking — kills/deaths não é um campo diretamente agregável, calcula em memória
export async function getKdRanking(take = 20) {
  const rows = await prisma.playerMatchStats.findMany({
    where: { player: { trackedPlayer: { active: true } } },
    select: { playerId: true, kills: true, deaths: true },
  });

  const byPlayer = new Map<string, { kills: number; deaths: number; count: number }>();
  for (const s of rows) {
    const cur = byPlayer.get(s.playerId) ?? { kills: 0, deaths: 0, count: 0 };
    cur.kills += s.kills;
    cur.deaths += s.deaths;
    cur.count++;
    byPlayer.set(s.playerId, cur);
  }

  const playerIds = Array.from(byPlayer.keys());
  const players = await playerRepo.findPlayersByIds(playerIds);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return Array.from(byPlayer.entries())
    .filter(([, s]) => s.count >= MIN_MATCHES_FOR_EXTRA_RANKINGS && s.deaths > 0)
    .map(([playerId, s]) => ({
      player: playerById.get(playerId) ?? null,
      matchesPlayed: s.count,
      value: Math.round((s.kills / s.deaths) * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
}

// Consistência — % de partidas com rating >= 1.0, mínimo de partidas
export async function getConsistencyRanking(take = 20) {
  const rows = await prisma.playerMatchStats.findMany({
    where: { player: { trackedPlayer: { active: true } } },
    select: { playerId: true, rating: true },
  });

  const byPlayer = new Map<string, { total: number; above: number }>();
  for (const s of rows) {
    const cur = byPlayer.get(s.playerId) ?? { total: 0, above: 0 };
    cur.total++;
    if (s.rating >= 1.0) cur.above++;
    byPlayer.set(s.playerId, cur);
  }

  const playerIds = Array.from(byPlayer.keys());
  const players = await playerRepo.findPlayersByIds(playerIds);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return Array.from(byPlayer.entries())
    .filter(([, s]) => s.total >= MIN_MATCHES_FOR_EXTRA_RANKINGS)
    .map(([playerId, s]) => ({
      player: playerById.get(playerId) ?? null,
      matchesPlayed: s.total,
      value: Math.round((s.above / s.total) * 1000) / 10, // ex: 72.3%
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
}

// Evolução — compara rating das últimas 5 partidas vs média geral (mín 5 partidas)
export async function getEvolutionRanking(take = 20) {
  const rows = await prisma.playerMatchStats.findMany({
    where: { player: { trackedPlayer: { active: true } } },
    select: { playerId: true, rating: true },
    orderBy: { match: { playedAt: "desc" } },
  });

  const byPlayer = new Map<string, number[]>();
  for (const s of rows) {
    if (!byPlayer.has(s.playerId)) byPlayer.set(s.playerId, []);
    byPlayer.get(s.playerId)!.push(s.rating);
  }

  const playerIds = Array.from(byPlayer.keys());
  const players = await playerRepo.findPlayersByIds(playerIds);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return Array.from(byPlayer.entries())
    .filter(([, ratings]) => ratings.length >= 5)
    .map(([playerId, ratings]) => {
      const seasonAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const recent = ratings.slice(0, 5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const diff = seasonAvg > 0 ? ((recentAvg - seasonAvg) / seasonAvg) * 100 : 0;
      return {
        player: playerById.get(playerId) ?? null,
        matchesPlayed: ratings.length,
        value: Math.round(diff * 10) / 10, // ex: +14.2 ou -6.8
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
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
