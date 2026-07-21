import { NextResponse } from "next/server";
import * as achievementService from "@/server/services/achievement.service";
import { handleRouteError } from "@/server/http";

export async function GET() {
  try {
    const achievements = await achievementService.listCatalog();
    return NextResponse.json({ achievements });
  } catch (error) {
    return handleRouteError(error);
  }
}
