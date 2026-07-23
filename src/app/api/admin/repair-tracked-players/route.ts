import { NextResponse } from "next/server";
import { repairTrackedPlayerLinks } from "@/server/repositories/player.repository";
import { prisma } from "@/server/db";

export async function POST() {
  const fixed = await repairTrackedPlayerLinks();

  // Diagnóstico pós-reparo: quantas partidas agora aparecem no dashboard vs total
  const [totalMatches, visibleMatches, stillUnlinked] = await Promise.all([
    prisma.match.count(),
    prisma.match.count({
      where: {
        playerStats: {
          some: {
            player: { trackedPlayer: { active: true } },
          },
        },
      },
    }),
    prisma.trackedPlayer.count({
      where: { playerId: null, active: true },
    }),
  ]);

  return NextResponse.json({
    fixed,
    diagnosis: {
      totalMatchesInDb: totalMatches,
      matchesVisibleInDashboard: visibleMatches,
      hiddenMatches: totalMatches - visibleMatches,
      trackedPlayersStillUnlinked: stillUnlinked,
    },
  });
}
