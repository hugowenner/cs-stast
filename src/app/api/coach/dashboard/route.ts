import { NextResponse, type NextRequest } from "next/server";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
import { buildDashboardPrompt } from "@/server/coach/builders/dashboard.builder";
import { prisma } from "@/server/db";
import { resolveSeasonId } from "@/server/services/season.service";

const SEASON_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
  new Date(),
);

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
      const coach = data.dashboard ? data.dashboard.coach : data.coach;
      return NextResponse.json({
        status: "fresh",
        report: coach,
        generatedAt: data.generatedAt,
      });
    }

    const summary = await getDashboardSummary(resolvedSeasonId);
    const detail = {
      ...summary,
      seasonLabel: SEASON_LABEL,
    };

    const status = peekCoachReport(detail, "dashboard:season", resolvedSeasonId);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      const coach = data.dashboard ? data.dashboard.coach : data.coach;
      return NextResponse.json(coach);
    }

    const summary = await getDashboardSummary(resolvedSeasonId);
    const detail = {
      ...summary,
      seasonLabel: SEASON_LABEL,
    };

    const report = await getCoachReport(detail, buildDashboardPrompt, "dashboard:season", resolvedSeasonId);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
