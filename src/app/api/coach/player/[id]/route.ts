import { NextResponse, type NextRequest } from "next/server";
import { getPlayerDetail } from "@/server/services/player.service";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
import { buildPlayerPrompt } from "@/server/coach/builders/player.builder";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || undefined;
    const targetSeason = season === "current" ? undefined : season;

    const detail = await getPlayerDetail(id, targetSeason);
    if (!detail) {
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 }
      );
    }

    const status = peekCoachReport(detail, `player:${id}`, targetSeason);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise do jogador: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || undefined;
    const targetSeason = season === "current" ? undefined : season;

    const detail = await getPlayerDetail(id, targetSeason);
    if (!detail) {
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 }
      );
    }

    const report = await getCoachReport(detail, buildPlayerPrompt, `player:${id}`, targetSeason);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório do jogador: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
