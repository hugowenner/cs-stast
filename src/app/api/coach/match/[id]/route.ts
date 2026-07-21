import { NextResponse } from "next/server";
import { getMatchDetail } from "@/server/services/match.service";
import { getCoachReport } from "@/server/coach/services/coach.service";
import { buildMatchPrompt } from "@/server/coach/builders/match.builder";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getMatchDetail(id);
    if (!detail) {
      return NextResponse.json(
        { error: "Partida não encontrada." },
        { status: 404 }
      );
    }

    const report = await getCoachReport(detail, buildMatchPrompt);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da partida: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
