import { NextRequest, NextResponse } from "next/server";
import { rolloverSeason } from "@/server/services/season.service";
import { checkAdminAuth } from "@/lib/admin/auth";
import { timingSafeEqualStrings } from "@/lib/sync-auth";

async function authenticate(request: NextRequest): Promise<boolean> {
  // 1. Check admin session cookie
  const isSessionValid = await checkAdminAuth();
  if (isSessionValid) return true;

  // 2. Check Bearer token (ADMIN_SYNC_TOKEN or SYNC_SERVICE_TOKEN)
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const validToken = process.env.ADMIN_SYNC_TOKEN || process.env.SYNC_SERVICE_TOKEN;

  if (validToken && token) {
    return timingSafeEqualStrings(token, validToken);
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!(await authenticate(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await rolloverSeason();

    if (result.status === "skipped") {
      return NextResponse.json({ status: "skipped", reason: result.reason });
    }

    return NextResponse.json({
      status: "success",
      previousSeason: (result as any).closed?.name ?? null,
      newSeason: (result as any).opened?.name ?? null,
    });
  } catch (error) {
    console.error("[Admin] Falha no rollover de temporada:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET não executa rollover — apenas documenta o endpoint
export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to trigger a season rollover." },
    { status: 405 },
  );
}
