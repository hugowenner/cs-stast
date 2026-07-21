import { NextResponse } from "next/server";
import { getSessionSummary } from "@/server/services/session.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = await getSessionSummary(id);

  if (!summary) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json(summary);
}
