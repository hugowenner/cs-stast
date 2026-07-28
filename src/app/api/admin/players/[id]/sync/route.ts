import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import * as playerService from "@/server/services/player.service";

export async function POST(
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
    await playerService.syncPlayerForAdmin(id);

    return NextResponse.json({
      success: true,
      message: "Dados da Steam sincronizados com sucesso.",
    });
  } catch (error) {
    console.error("[API Admin Sync Player Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao sincronizar perfil do jogador.",
      },
      { status: 500 }
    );
  }
}
