import { NextResponse, type NextRequest } from "next/server";
import * as matchService from "@/server/services/match.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const matches = await matchService.listRecentMatches(take);
    return NextResponse.json({ matches });
  } catch (error) {
    return handleRouteError(error);
  }
}
