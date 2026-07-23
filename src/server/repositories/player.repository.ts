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
