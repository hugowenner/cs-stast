import { NextResponse } from "next/server";
import * as teamBalanceService from "@/server/services/team-balance.service";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { z } from "zod";

import { checkAdminAuth } from "@/lib/admin/auth";

const patchWinnerSchema = z.object({
  winner: z.enum(["CT", "TR", "DRAW"]).nullable(),
});

// PATCH /api/team-balance/matches/[id] - Atualizar o vencedor da partida
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { winner } = await parseJsonBody(request, patchWinnerSchema);
    
    const updated = await teamBalanceService.updateMatchWinner(id, winner);
    
    return NextResponse.json({
      success: true,
      match: updated,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// DELETE /api/team-balance/matches/[id] - Excluir registro do histórico
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Acesso negado: Apenas administradores podem excluir registros." },
        { status: 403 }
      );
    }

    const { id } = await params;
    await teamBalanceService.deleteBalance(id);
    return NextResponse.json({
      success: true,
      message: "Registro excluído com sucesso",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
