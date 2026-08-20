import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminAuth } from "@/lib/admin/auth";
import * as playerService from "@/server/services/player.service";

const updatePlayerSchema = z.object({
  nickname: z.string().min(1, "O apelido personalizado é obrigatório."),
  gamersClubId: z.string().min(1, "O ID da Gamers Club é obrigatório."),
  active: z.boolean(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, message: "Acesso administrativo negado. Sessão inválida ou expirada." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updatePlayerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const updated = await playerService.updatePlayerForAdmin(id, parsed.data);

    return NextResponse.json({
      success: true,
      message: `Jogador '${updated.nickname}' atualizado com sucesso.`,
      player: updated,
    });
  } catch (error) {
    console.error("[API Admin Edit Player Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Erro interno ao atualizar jogador.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, message: "Acesso administrativo negado. Sessão inválida ou expirada." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "full" ? "full" : "untrack";

  try {
    await playerService.deletePlayerForAdmin(id, mode);
    
    const msg = mode === "full" 
      ? "Jogador e todos os registros relacionados excluídos definitivamente do banco."
      : "Jogador removido com sucesso do painel de monitoramento.";

    return NextResponse.json({
      success: true,
      message: msg,
    });
  } catch (error) {
    console.error("[API Admin Delete Player Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Erro interno ao remover jogador.",
      },
      { status: 500 }
    );
  }
}
