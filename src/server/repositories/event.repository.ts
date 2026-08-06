import { prisma } from "@/server/db";

export function listRecentNotableEvents(take = 20) {
  return prisma.event.findMany({
    where: { type: { not: "KILL" } },
    orderBy: { match: { playedAt: "desc" } },
    take,
    include: { player: true, match: { include: { map: true } } },
  });
}
