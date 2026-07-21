import { NextResponse } from "next/server";
import { syncPingSchema } from "@/server/dtos/sync.dto";
import { handleRouteError, parseJsonBody } from "@/server/http";

export async function POST(request: Request) {
  try {
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
