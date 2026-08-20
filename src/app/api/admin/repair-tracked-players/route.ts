import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { repairTrackedPlayerLinks } from "@/server/repositories/player.repository";
import { prisma } from "@/server/db";

export async function POST() {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: "Acesso negado. Autenticação administrativa necessária." },
      { status: 401 }
    );
  }

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
