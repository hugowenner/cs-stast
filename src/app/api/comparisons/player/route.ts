import { NextResponse } from "next/server";
import { getPlayerComparison } from "@/server/services/comparison.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerA = searchParams.get("playerA");
  const playerB = searchParams.get("playerB");

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

  const comparison = await getPlayerComparison(playerA, playerB);
  if (!comparison) {
    return NextResponse.json(
      { error: "Um ou ambos os jogadores não foram encontrados." },
      { status: 404 }
    );
  }

  return NextResponse.json(comparison);
}
