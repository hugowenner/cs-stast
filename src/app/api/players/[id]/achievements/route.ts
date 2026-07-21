import { NextResponse } from "next/server";
import * as playerService from "@/server/services/player.service";
import { handleRouteError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const detail = await playerService.getPlayerDetail(id);
    if (!detail) return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });
    const achievements = await playerService.getPlayerAchievements(id);
    return NextResponse.json({ achievements });
  } catch (error) {
    return handleRouteError(error);
  }
}
