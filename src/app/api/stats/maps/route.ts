import { NextResponse } from "next/server";
import * as statsService from "@/server/services/stats.service";
import { handleRouteError } from "@/server/http";

export async function GET() {
  try {
    const maps = await statsService.getMapWinrates();
    return NextResponse.json({ maps });
  } catch (error) {
    return handleRouteError(error);
  }
}
