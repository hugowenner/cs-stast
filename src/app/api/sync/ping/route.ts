import { NextResponse } from "next/server";
import { syncPingSchema } from "@/server/dtos/sync.dto";
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

    const input = await parseJsonBody(request, syncPingSchema);
    return NextResponse.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      receivedVersion: input.version,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
