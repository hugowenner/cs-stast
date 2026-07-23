import { NextRequest, NextResponse } from "next/server";
import { syncAllTrackedPlayers } from "@/server/services/steam-profile.service";
import { prisma } from "@/server/db";

function requireAdminToken(req: NextRequest): NextResponse | null {
  const token = process.env.ADMIN_SYNC_TOKEN;
  if (!token) {
    // Se não configurado, bloqueia com instrução clara
    return NextResponse.json(
      { error: "ADMIN_SYNC_TOKEN não configurado no servidor." },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}

// GET — diagnóstico: quantos jogadores têm avatar Steam e quando foi o último sync
export async function GET(req: NextRequest) {
  const denied = requireAdminToken(req);
  if (denied) return denied;

  const players = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: {
      steamId: true,
      nickname: true,
      avatarUrl: true,
      steamLastSync: true,
      steamNickname: true,
    },
    orderBy: { nickname: "asc" },
  });

  const withAvatar = players.filter((p) => !!p.avatarUrl).length;
  const withSync = players.filter((p) => !!p.steamLastSync).length;
  const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = players.filter((p) => !p.steamLastSync || p.steamLastSync < staleCutoff).length;

  return NextResponse.json({
    total: players.length,
    withAvatar,
    withSync,
    stale,
    players: players.map((p) => ({
      nickname: p.nickname,
      steamId: p.steamId,
      hasAvatar: !!p.avatarUrl,
      steamNickname: p.steamNickname,
      lastSync: p.steamLastSync,
    })),
  });
}

// POST — dispara sync (usa cache de 7 dias por padrão; ?force=true ignora cache)
export async function POST(req: NextRequest) {
  const denied = requireAdminToken(req);
  if (denied) return denied;

  if (!process.env.STEAM_API_KEY) {
    return NextResponse.json(
      { error: "STEAM_API_KEY não configurada. Adicione ao .env e reinicie o servidor." },
      { status: 503 },
    );
  }

  const force = req.nextUrl.searchParams.get("force") === "true";

  try {
    const result = await syncAllTrackedPlayers(force);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
