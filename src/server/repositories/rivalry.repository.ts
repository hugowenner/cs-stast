import { prisma } from "@/server/db";
import { trackedPlayerWhere } from "./player.repository";

export function getRivalry(playerAId: string, playerBId: string) {
  return prisma.rivalry.findUnique({
    where: { playerAId_playerBId: { playerAId, playerBId } },
  });
}

export interface RivalryDelta {
  killsAOnB?: number;
  killsBOnA?: number;
  matchesTogether?: number;
  matchesAgainst?: number;
}

/** playerAId deve ser sempre o menor id (convenção mantida pelo RivalryEngine, não pelo banco). */
export function applyRivalryDelta(playerAId: string, playerBId: string, delta: RivalryDelta) {
  return prisma.rivalry.upsert({
    where: { playerAId_playerBId: { playerAId, playerBId } },
    create: {
      playerAId,
      playerBId,
      killsAOnB: delta.killsAOnB ?? 0,
      killsBOnA: delta.killsBOnA ?? 0,
      matchesTogether: delta.matchesTogether ?? 0,
      matchesAgainst: delta.matchesAgainst ?? 0,
    },
    update: {
      killsAOnB: { increment: delta.killsAOnB ?? 0 },
      killsBOnA: { increment: delta.killsBOnA ?? 0 },
      matchesTogether: { increment: delta.matchesTogether ?? 0 },
      matchesAgainst: { increment: delta.matchesAgainst ?? 0 },
    },
  });
}

export function listTopRivalries(take = 10) {
  return prisma.rivalry.findMany({
    where: {
      playerA: trackedPlayerWhere(),
      playerB: trackedPlayerWhere(),
    },
    take,
    orderBy: { matchesAgainst: "desc" },
    include: { playerA: true, playerB: true },
  });
}

export function listRivalriesForPlayer(playerId: string) {
  return prisma.rivalry.findMany({
    where: {
      OR: [
        {
          playerAId: playerId,
          playerB: trackedPlayerWhere(),
        },
        {
          playerBId: playerId,
          playerA: trackedPlayerWhere(),
        },
      ],
    },
    include: { playerA: true, playerB: true },
    orderBy: { matchesAgainst: "desc" },
  });
}
