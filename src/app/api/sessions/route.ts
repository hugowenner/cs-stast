import { NextResponse, type NextRequest } from "next/server";
import * as sessionService from "@/server/services/session.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { skip, take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const sessions = await sessionService.listSessions({ skip, take });
    return NextResponse.json({ sessions });
  } catch (error) {
    return handleRouteError(error);
  }
}
