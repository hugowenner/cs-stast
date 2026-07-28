import { prisma } from "@/server/db";

export function trackedPlayerWhere() {
  return {
    trackedPlayer: {
      active: true,
    },
  };
}

export function trackedPlayerStatsWhere() {
  return {
    player: trackedPlayerWhere(),
  };
}

export function trackedMatchWhere() {
  return {
    playerStats: {
      some: {
        player: trackedPlayerWhere(),
      },
    },
  };
}

export function trackedSessionWhere() {
  return {
    matches: {
      some: trackedMatchWhere(),
    },
  };
}

export function findPlayerById(id: string) {
  return prisma.player.findFirst({
    where: {
      id,
      ...trackedPlayerWhere(),
    },
  });
}

export function findPlayersByIds(ids: string[]) {
  return prisma.player.findMany({
    where: { id: { in: ids }, ...trackedPlayerWhere() },
  });
}

export function findPlayerBySteamId(steamId: string) {
  return prisma.player.findFirst({
    where: {
      steamId,
      ...trackedPlayerWhere(),
    },
  });
}

export function countPlayers() {
  return prisma.player.count({
    where: trackedPlayerWhere(),
  });
}

/**
 * Conta quantos dos `playerIds` informados são jogadores monitorados ativos. Usado na
 * ingestão de partida para classificar SOLO x COMUNIDADE (ver
 * src/server/domain/matchClassification.ts) — uma única query de contagem, não busca
 * as linhas inteiras.
 */
export function countActiveTrackedPlayersAmong(playerIds: string[]) {
  if (playerIds.length === 0) return Promise.resolve(0);
  return prisma.trackedPlayer.count({
    where: { playerId: { in: playerIds }, active: true },
  });
}

export function findPlayerBasicById(id: string) {
  return prisma.player.findUnique({
    where: { id },
    select: { id: true, nickname: true, avatarUrl: true },
  });
}

export function listPlayers(params: { skip?: number; take?: number } = {}) {
  return prisma.player.findMany({
    where: trackedPlayerWhere(),
    skip: params.skip,
    take: params.take ?? 50,
    orderBy: { nickname: "asc" },
  });
}

export function upsertPlayerBySteamId(data: {
  steamId: string;
  nickname: string;
  avatarUrl?: string | null;
  gamersClubId?: string | null;
}) {
  return prisma.player.upsert({
    where: { steamId: data.steamId },
    create: data,
    update: {
      nickname: data.nickname,
      // Só sobrescreve avatarUrl quando um valor concreto é fornecido.
      // A sincronização da GC nunca envia URL absoluta (paths relativos → undefined → null),
      // então sem esta guarda cada partida apagaria o avatar obtido da Steam.
      ...(data.avatarUrl != null ? { avatarUrl: data.avatarUrl } : {}),
      gamersClubId: data.gamersClubId,
    },
  });
}

export function linkTrackedPlayer(gamersClubId: string, playerId: string) {
  return prisma.trackedPlayer.updateMany({
    where: {
      gamersClubId,
      playerId: null,
    },
    data: {
      playerId,
    },
  });
}

/**
 * Varre todos os TrackedPlayers sem playerId e tenta vinculá-los a um Player
 * existente pelo gamersClubId. Útil quando o seed foi executado depois das partidas.
 * Retorna o número de registros vinculados.
 */
export async function repairTrackedPlayerLinks(): Promise<number> {
  const unlinked = await prisma.trackedPlayer.findMany({
    where: { playerId: null, active: true },
    select: { id: true, gamersClubId: true },
  });

  let fixed = 0;
  for (const tp of unlinked) {
    const player = await prisma.player.findFirst({
      where: { gamersClubId: tp.gamersClubId },
      select: { id: true },
    });
    if (!player) continue;

    await prisma.trackedPlayer.update({
      where: { id: tp.id },
      data: { playerId: player.id },
    });
    fixed++;
  }

  return fixed;
}

export async function listPlayersWithBasicStats() {
  const players = await prisma.player.findMany({
    where: trackedPlayerWhere(),
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      levelGc: true,
    },
    orderBy: { nickname: "asc" },
  });

  const seasonStart = new Date("2026-07-01T00:00:00Z");

  const seasonAverages = await prisma.playerMatchStats.groupBy({
    by: ["playerId"],
    _avg: {
      rating: true,
    },
    where: {
      player: {
        trackedPlayer: {
          active: true,
        },
      },
      match: {
        playedAt: {
          gte: seasonStart,
        },
      },
    },
  });

  const careerAverages = await prisma.playerMatchStats.groupBy({
    by: ["playerId"],
    _avg: {
      rating: true,
    },
    where: {
      player: {
        trackedPlayer: {
          active: true,
        },
      },
    },
  });

  const seasonRatingByPlayer = Object.fromEntries(
    seasonAverages.map((r) => [r.playerId, r._avg.rating])
  );
  const careerRatingByPlayer = Object.fromEntries(
    careerAverages.map((r) => [r.playerId, r._avg.rating])
  );

  return players.map((p) => {
    const seasonRating = seasonRatingByPlayer[p.id];
    const careerRating = careerRatingByPlayer[p.id];
    const finalRating = seasonRating ?? careerRating ?? 1.00;

    return {
      ...p,
      rating: Number(finalRating.toFixed(2)),
    };
  });
}

export async function getPlayersAdminSummary() {
  const [totalPlayers, totalTracked, activeTracked, pausedTracked, totalMatches, latestImport] = await Promise.all([
    prisma.player.count(),
    prisma.trackedPlayer.count(),
    prisma.trackedPlayer.count({ where: { active: true } }),
    prisma.trackedPlayer.count({ where: { active: false } }),
    prisma.match.count(),
    prisma.import.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    }),
  ]);

  return {
    totalPlayers,
    totalTracked,
    activeTracked,
    pausedTracked,
    totalMatches,
    latestSync: latestImport?.finishedAt || null,
  };
}

export async function listPlayersForAdmin(params: {
  search?: string;
  filter?: string;
  skip?: number;
  take?: number;
}) {
  const { search, filter, skip = 0, take = 10 } = params;
  const where: any = {};

  if (search) {
    where.OR = [
      { nickname: { contains: search, mode: "insensitive" } },
      { steamNickname: { contains: search, mode: "insensitive" } },
      { steamId: { contains: search, mode: "insensitive" } },
      { gamersClubId: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filter === "active") {
    where.trackedPlayer = { active: true };
  } else if (filter === "paused") {
    where.OR = [
      { trackedPlayer: { active: false } },
      { trackedPlayer: null },
    ];
  } else if (filter === "never_synced") {
    where.OR = [
      { steamLastSync: null },
      { matchStats: { none: {} } }
    ];
  } else if (filter === "error") {
    where.OR = [
      { steamId: "" },
      { gamersClubId: null },
      { steamLastSync: null },
      { matchStats: { none: {} } }
    ];
  }

  const total = await prisma.player.count({ where });

  const players = await prisma.player.findMany({
    where,
    include: {
      trackedPlayer: true,
      matchStats: {
        orderBy: {
          match: {
            playedAt: "desc",
          },
        },
        take: 1,
        select: {
          match: {
            select: {
              playedAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          matchStats: true,
        },
      },
    },
    orderBy: { nickname: "asc" },
    skip,
    take,
  });

  const playerIds = players.map((p) => p.id);
  const averages = await prisma.playerMatchStats.groupBy({
    by: ["playerId"],
    _avg: {
      rating: true,
    },
    where: {
      playerId: { in: playerIds },
    },
  });

  const ratingByPlayer = Object.fromEntries(
    averages.map((a) => [a.playerId, a._avg.rating || 1.00])
  );

  const mappedPlayers = players.map((p) => {
    const latestMatchDate = p.matchStats[0]?.match.playedAt || null;
    const rating = ratingByPlayer[p.id] || 1.00;
    return {
      id: p.id,
      nickname: p.nickname,
      steamNickname: p.steamNickname,
      avatarUrl: p.avatarUrl,
      steamId: p.steamId,
      gamersClubId: p.gamersClubId,
      levelGc: p.levelGc,
      steamLastSync: p.steamLastSync,
      active: p.trackedPlayer?.active ?? false,
      matchCount: p._count.matchStats,
      latestMatchDate,
      rating: Number(rating.toFixed(2)),
    };
  });

  return {
    players: mappedPlayers,
    total,
  };
}
