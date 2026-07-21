import { NextResponse, type NextRequest } from "next/server";
import * as statsService from "@/server/services/stats.service";
import * as playerService from "@/server/services/player.service";
import { timelineQuerySchema } from "@/server/dtos/stats.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { playerId } = parseQuery(request.nextUrl.searchParams, timelineQuerySchema);
    const detail = await playerService.getPlayerDetail(playerId);
    if (!detail) return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });
    const timeline = await statsService.getPlayerEloTimeline(playerId);
    return NextResponse.json({ timeline });
  } catch (error) {
    return handleRouteError(error);
  }
}
