import { NextResponse, type NextRequest } from "next/server";
import * as statsService from "@/server/services/stats.service";
import { rankingQuerySchema } from "@/server/dtos/stats.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { metric, take } = parseQuery(request.nextUrl.searchParams, rankingQuerySchema);
    const ranking =
      metric === "elo"
        ? await statsService.getEloRanking(take)
        : await statsService.getRanking(metric, take);
    return NextResponse.json({ metric, ranking });
  } catch (error) {
    return handleRouteError(error);
  }
}
