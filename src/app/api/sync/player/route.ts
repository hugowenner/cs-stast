import { NextResponse } from "next/server";
import * as playerService from "@/server/services/player.service";
import { syncPlayerSchema } from "@/server/dtos/sync.dto";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { isMaintenanceMode } from "@/server/services/season.service";

export async function POST(request: Request) {
  try {
    if (await isMaintenanceMode()) {
      return NextResponse.json(
        { error: "O sistema está passando por manutenção para virada de temporada. Por favor, tente novamente mais tarde." },
        { status: 503 }
      );
    }

    const input = await parseJsonBody(request, syncPlayerSchema);
    const player = await playerService.upsertPlayer({
      steamId: input.steamId,
      nickname: input.nickname,
      avatarUrl: input.avatarUrl ?? null,
      gamersClubId: input.gamersClubId ?? null,
    });
    return NextResponse.json({ player });
  } catch (error) {
    return handleRouteError(error);
  }
}
