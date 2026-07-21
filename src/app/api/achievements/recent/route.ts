import { NextResponse, type NextRequest } from "next/server";
import * as achievementService from "@/server/services/achievement.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const achievements = await achievementService.listRecent(take);
    return NextResponse.json({ achievements });
  } catch (error) {
    return handleRouteError(error);
  }
}
