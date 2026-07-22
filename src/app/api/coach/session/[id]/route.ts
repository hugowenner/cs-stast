import { NextResponse } from "next/server";
import { getSessionSummary } from "@/server/services/session.service";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
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

    const status = peekCoachReport(summary, `session:${id}`);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise da sessão: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const report = await getCoachReport(summary, buildSessionPrompt, `session:${id}`);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da sessão: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
