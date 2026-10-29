import { NextResponse, type NextRequest } from "next/server";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
import { buildDashboardPrompt, loadDashboardCoachPayload } from "@/server/coach/builders/dashboard.builder";
import { prisma } from "@/server/db";
import { getActiveSeason } from "@/server/services/season.service";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Resolução estrita de temporada para o Coach da Dashboard:
 * 1. season="all" -> Erro 400 (o Coach requer uma temporada específica ou a ativa).
 * 2. season="current" ou omitido -> Busca a temporada ACTIVE atual.
 * 3. season="<id>" -> Busca a temporada pelo ID especificado no banco.
 * Se o ID informado não existir ou não houver temporada ativa, retorna Erro 404 explícito (sem fallback silencioso).
 */
async function resolveSeasonRecordForCoach(searchParams: URLSearchParams) {
  const seasonParam = searchParams.get("season") || undefined;

  if (seasonParam === "all") {
    return {
      errorResponse: NextResponse.json(
        { error: "A análise do Coach requer uma temporada específica ou a temporada ativa." },
        { status: 400 }
      ),
    };
  }

  if (seasonParam && seasonParam !== "current") {
    const seasonRecord = await prisma.season.findUnique({
      where: { id: seasonParam },
    });
    if (!seasonRecord) {
      return {
        errorResponse: NextResponse.json(
          { error: `Temporada com ID '${seasonParam}' não encontrada.` },
          { status: 404 }
        ),
      };
    }
    return { season: seasonRecord };
  }

  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return {
      errorResponse: NextResponse.json(
        { error: "Nenhuma temporada ativa encontrada no sistema." },
        { status: 404 }
      ),
    };
  }
  return { season: activeSeason };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolution = await resolveSeasonRecordForCoach(searchParams);
    if (resolution.errorResponse) {
      return resolution.errorResponse;
    }
    const season = resolution.season;

    // Se a temporada possui um snapshot salvo e está FECHADA, carrega dele diretamente em O(1)
    const snapshot = await prisma.seasonSnapshot.findUnique({
      where: { seasonId: season.id },
    });

    if (snapshot && season.status === "CLOSED") {
      const data = snapshot.dashboard as any;
      const coach = data.dashboard ? data.dashboard.coach : data.coach;
      return NextResponse.json({
        status: "fresh",
        report: coach,
        generatedAt: data.generatedAt,
      });
    }

    const detail = await loadDashboardCoachPayload(season.id, season.name);

    const status = peekCoachReport(detail, "dashboard:season", season.id);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rateLimitError = checkRateLimit(request, "coach-ai", 10, 60 * 1000);
  if (rateLimitError) return rateLimitError;

  try {
    const { searchParams } = new URL(request.url);
    const resolution = await resolveSeasonRecordForCoach(searchParams);
    if (resolution.errorResponse) {
      return resolution.errorResponse;
    }
    const season = resolution.season;

    // Se a temporada possui um snapshot salvo e está FECHADA, carrega dele diretamente em O(1)
    const snapshot = await prisma.seasonSnapshot.findUnique({
      where: { seasonId: season.id },
    });

    if (snapshot && season.status === "CLOSED") {
      const data = snapshot.dashboard as any;
      const coach = data.dashboard ? data.dashboard.coach : data.coach;
      return NextResponse.json(coach);
    }

    const detail = await loadDashboardCoachPayload(season.id, season.name);

    const report = await getCoachReport(detail, buildDashboardPrompt, "dashboard:season", season.id);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
