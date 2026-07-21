import { NextResponse, type NextRequest } from "next/server";
import * as importService from "@/server/services/import.service";
import { paginationSchema } from "@/server/dtos/common.dto";
import { handleRouteError, parseQuery } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const { take } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const imports = await importService.listImports(take);
    return NextResponse.json({ imports });
  } catch (error) {
    return handleRouteError(error);
  }
}
