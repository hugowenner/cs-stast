import { NextResponse } from "next/server";
import { getSessionSummary } from "@/server/services/session.service";
import { getCoachReport } from "@/server/coach/services/coach.service";
import { buildSessionPrompt } from "@/server/coach/builders/session.builder";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = await getSessionSummary(id);
    if (!summary) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    const report = await getCoachReport(summary, buildSessionPrompt);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da sessão: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
