import { NextResponse } from "next/server";
import * as matchService from "@/server/services/match.service";
import { syncMatchSchema } from "@/server/dtos/sync.dto";
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
    const input = await parseJsonBody(request, syncMatchSchema);
    const result = await matchService.ingestMatchSync(input);
    return NextResponse.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
