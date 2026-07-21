import { NextResponse } from "next/server";
import { buildPlayerPrompt } from "@/server/coach/builders/player.builder";
import { buildMatchPrompt } from "@/server/coach/builders/match.builder";
import { buildComparisonPrompt } from "@/server/coach/builders/comparison.builder";
import { buildSessionPrompt } from "@/server/coach/builders/session.builder";
import { calculateCacheKey } from "@/server/coach/services/coach.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, dto } = body;

    if (!type || !dto) {
      return NextResponse.json(
        { error: "type e dto são obrigatórios no corpo da requisição." },
        { status: 400 }
      );
    }

    let prompt = "";
    switch (type) {
      case "player":
        prompt = buildPlayerPrompt(dto);
        break;
      case "match":
        prompt = buildMatchPrompt(dto);
        break;
      case "comparison":
        prompt = buildComparisonPrompt(dto);
        break;
      case "session":
        prompt = buildSessionPrompt(dto);
        break;
      default:
        return NextResponse.json(
          { error: `Tipo desconhecido: ${type}. Suportados: player, match, comparison, session.` },
          { status: 400 }
        );
    }

    const length = prompt.length;
    const estimatedTokens = Math.round(length / 4);
    const cacheKey = calculateCacheKey(dto);

    return NextResponse.json({
      prompt,
      length,
      estimatedTokens,
      cacheKey,
      dto,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao processar visualização do prompt: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
