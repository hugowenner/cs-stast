import { NextResponse } from "next/server";
import * as sessionService from "@/server/services/session.service";
import { syncSessionSchema } from "@/server/dtos/sync.dto";
import { handleRouteError, parseJsonBody } from "@/server/http";

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, syncSessionSchema);
    const session = await sessionService.syncSession(input);
    return NextResponse.json({ session });
  } catch (error) {
    return handleRouteError(error);
  }
}
