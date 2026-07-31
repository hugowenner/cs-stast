import { NextResponse, type NextRequest } from "next/server";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { handleRouteError } from "@/server/http";
import { prisma } from "@/server/db";
import { resolveSeasonId } from "@/server/services/season.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || undefined;
    const targetSeason = season === "current" ? undefined : season;

    const resolvedSeasonId = await resolveSeasonId(targetSeason);

    // Se a temporada possui um snapshot salvo e está FECHADA, carrega dele diretamente em O(1)
    const snapshot = await prisma.seasonSnapshot.findUnique({
      where: { seasonId: resolvedSeasonId },
    });

    const seasonRecord = await prisma.season.findUnique({
      where: { id: resolvedSeasonId },
    });

    if (snapshot && seasonRecord?.status === "CLOSED") {
      const data = snapshot.dashboard as any;
      const summary = data.dashboard ? data.dashboard.summary : data.summary;
      return NextResponse.json(summary);
    }

    const summary = await getDashboardSummary(resolvedSeasonId);
    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
