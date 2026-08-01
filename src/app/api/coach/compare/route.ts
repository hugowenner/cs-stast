import { NextResponse, type NextRequest } from "next/server";
import { getPlayerComparison } from "@/server/services/comparison.service";
import { getCoachReport, peekCoachReport } from "@/server/coach/services/coach.service";
import { buildComparisonPrompt } from "@/server/coach/builders/comparison.builder";

function resolveComparisonParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerA = searchParams.get("playerA");
  const playerB = searchParams.get("playerB");
  const season = searchParams.get("season") || undefined;
  return { playerA, playerB, season };
}

function comparisonEntityKey(playerA: string, playerB: string) {
  return `compare:${[playerA, playerB].sort().join(":")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { playerA, playerB, season } = resolveComparisonParams(request);
    const targetSeason = season === "current" ? undefined : season;

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "playerA e playerB são parâmetros obrigatórios." },
        { status: 400 }
      );
    }

    if (playerA === playerB) {
      return NextResponse.json(
        { error: "Selecione dois jogadores diferentes para comparar." },
        { status: 400 }
      );
    }

    const comparison = await getPlayerComparison(playerA, playerB, targetSeason);
    if (!comparison) {
      return NextResponse.json(
        { error: "Um ou ambos os jogadores não foram encontrados." },
        { status: 404 }
      );
    }

    const status = peekCoachReport(comparison, comparisonEntityKey(playerA, playerB), targetSeason);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao verificar análise comparativa: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { playerA, playerB, season } = resolveComparisonParams(request);
    const targetSeason = season === "current" ? undefined : season;

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "playerA e playerB são parâmetros obrigatórios." },
        { status: 400 }
      );
    }

    if (playerA === playerB) {
      return NextResponse.json(
        { error: "Selecione dois jogadores diferentes para comparar." },
        { status: 400 }
      );
    }

    const comparison = await getPlayerComparison(playerA, playerB, targetSeason);
    if (!comparison) {
      return NextResponse.json(
        { error: "Um ou ambos os jogadores não foram encontrados." },
        { status: 404 }
      );
    }

    const report = await getCoachReport(comparison, buildComparisonPrompt, comparisonEntityKey(playerA, playerB), targetSeason);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar relatório comparativo: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
