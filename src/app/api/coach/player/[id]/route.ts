import { NextResponse } from "next/server";
import { getPlayerDetail } from "@/server/services/player.service";
import { getCoachReport } from "@/server/coach/services/coach.service";
import { buildPlayerPrompt } from "@/server/coach/builders/player.builder";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getPlayerDetail(id);
    if (!detail) {
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 }
      );
    }

    const report = await getCoachReport(detail, buildPlayerPrompt);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório do jogador: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
