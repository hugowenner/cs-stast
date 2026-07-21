import { NextResponse, type NextRequest } from "next/server";
import * as playerService from "@/server/services/player.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { skip, take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const players = await playerService.listPlayers({ skip, take });
    return NextResponse.json({ players });
  } catch (error) {
    return handleRouteError(error);
  }
}
