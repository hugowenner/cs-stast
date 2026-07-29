import { NextRequest, NextResponse } from "next/server";
import { rolloverSeason } from "@/server/services/season.service";

function authenticate(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret = process.env.ADMIN_SECRET_KEY;
  return !!secret && token === secret;
}

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
