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
      avatarUrl: data.avatarUrl,
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
