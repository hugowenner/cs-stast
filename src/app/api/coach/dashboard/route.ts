import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
import { buildDashboardPrompt } from "@/server/coach/builders/dashboard.builder";

const SEASON_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
  new Date(),
);

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    const detail = {
      ...summary,
      seasonLabel: SEASON_LABEL,
    };

    const status = peekCoachReport(detail, "dashboard:season");
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const summary = await getDashboardSummary();
    const detail = {
      ...summary,
      seasonLabel: SEASON_LABEL,
    };

    const report = await getCoachReport(detail, buildDashboardPrompt, "dashboard:season");
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório da dashboard: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
