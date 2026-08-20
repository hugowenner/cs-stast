import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminAuth } from "@/lib/admin/auth";
import * as playerService from "@/server/services/player.service";

const createPlayerSchema = z.object({
  input: z.string().min(1, "A entrada do Steam ou Gamers Club é obrigatória."),
  gamersClubId: z.string().optional(),
});

export async function POST(request: Request) {
  // 1. Enforce admin authentication
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, message: "Acesso administrativo negado. Sessão inválida ou expirada." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createPlayerSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { input, gamersClubId } = parsed.data;
    const player = await playerService.addPlayerForAdmin(input, gamersClubId);

    return NextResponse.json({
      success: true,
      message: `Jogador '${player.nickname}' adicionado ao monitoramento com sucesso.`,
      player,
    });
  } catch (error) {
    console.error("[API Admin Add Player Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Erro interno ao cadastrar jogador.",
      },
      { status: 500 }
    );
  }
}
