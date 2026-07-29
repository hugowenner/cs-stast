import { NextResponse } from "next/server";
import * as sessionService from "@/server/services/session.service";
import { syncSessionSchema } from "@/server/dtos/sync.dto";
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

    const input = await parseJsonBody(request, syncSessionSchema);
    const session = await sessionService.syncSession(input);
    return NextResponse.json({ session });
  } catch (error) {
    return handleRouteError(error);
  }
}
