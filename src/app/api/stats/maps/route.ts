import { NextResponse, type NextRequest } from "next/server";
import * as statsService from "@/server/services/stats.service";
import { handleRouteError } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || undefined;
    const targetSeason = season === "current" ? undefined : season;

    const maps = await statsService.getMapWinrates(targetSeason);
    return NextResponse.json({ maps });
  } catch (error) {
    return handleRouteError(error);
  }
}
