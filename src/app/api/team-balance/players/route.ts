import { NextResponse } from "next/server";
import * as teamBalanceService from "@/server/services/team-balance.service";
import { handleRouteError } from "@/server/http";

// GET /api/team-balance/players - Listar todos os jogadores do Hub e suas estatísticas consolidadas
export async function GET() {
  try {
    const players = await teamBalanceService.getAvailablePlayers();
    return NextResponse.json({
      success: true,
      players,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
