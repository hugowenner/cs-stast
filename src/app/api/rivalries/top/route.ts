import { NextResponse, type NextRequest } from "next/server";
import * as rivalryService from "@/server/services/rivalry.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const rivalries = await rivalryService.listTopRivalries(take);
    return NextResponse.json({ rivalries });
  } catch (error) {
    return handleRouteError(error);
  }
}
