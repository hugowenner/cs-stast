import { prisma } from "@/server/db";
import { trackedPlayerWhere } from "./player.repository";

export function getRivalry(playerAId: string, playerBId: string, seasonId: string | null = null) {
  return prisma.rivalry.findFirst({
    where: { playerAId, playerBId, seasonId },
  });
}

export interface RivalryDelta {
  killsAOnB?: number;
  killsBOnA?: number;
  matchesTogether?: number;
  matchesAgainst?: number;
}

/** playerAId deve ser sempre o menor id (convenção mantida pelo RivalryEngine, não pelo banco). */
export async function applyRivalryDelta(
  playerAId: string,
  playerBId: string,
  delta: RivalryDelta,
  seasonId: string | null = null
) {
  const existing = await prisma.rivalry.findFirst({
    where: { playerAId, playerBId, seasonId },
  });

  if (existing) {
    return prisma.rivalry.update({
      where: { id: existing.id },
      data: {
        killsAOnB: { increment: delta.killsAOnB ?? 0 },
        killsBOnA: { increment: delta.killsBOnA ?? 0 },
        matchesTogether: { increment: delta.matchesTogether ?? 0 },
        matchesAgainst: { increment: delta.matchesAgainst ?? 0 },
      },
    });
  } else {
    return prisma.rivalry.create({
      data: {
        playerAId,
        playerBId,
        seasonId,
        killsAOnB: delta.killsAOnB ?? 0,
        killsBOnA: delta.killsBOnA ?? 0,
        matchesTogether: delta.matchesTogether ?? 0,
        matchesAgainst: delta.matchesAgainst ?? 0,
      },
    });
  }
}

export function listTopRivalries(take = 10, seasonId: string | null = null) {
  return prisma.rivalry.findMany({
    where: {
      playerA: trackedPlayerWhere(),
      playerB: trackedPlayerWhere(),
      seasonId,
    },
    take,
    orderBy: { matchesAgainst: "desc" },
    include: { playerA: true, playerB: true },
  });
}

export function listRivalriesForPlayer(playerId: string, seasonId: string | null = null) {
  return prisma.rivalry.findMany({
    where: {
      seasonId,
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
