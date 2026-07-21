import { NextResponse } from "next/server";
import * as matchService from "@/server/services/match.service";
import { handleRouteError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const match = await matchService.getMatchDetail(id);
    if (!match) return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });
    return NextResponse.json({ match });
  } catch (error) {
    return handleRouteError(error);
  }
}
