import { NextResponse } from "next/server";
import * as configService from "@/server/services/configuration.service";
import { setConfigSchema } from "@/server/dtos/config.dto";
import { handleRouteError, parseJsonBody } from "@/server/http";
import type { Prisma } from "@/generated/prisma";

export async function GET() {
  try {
    const config = await configService.listConfig();
    return NextResponse.json({ config });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { key, value } = await parseJsonBody(request, setConfigSchema);
    const updated = await configService.setConfig(key, value as Prisma.InputJsonValue);
    return NextResponse.json({ config: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
