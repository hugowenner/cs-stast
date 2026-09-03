import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { timingSafeEqualStrings } from "@/lib/sync-auth";

/**
 * GET /api/internal/jobs/pending
 *
 * Retorna jobs PENDING ou FAILED e os marca atomicamente como SENT_TO_WORKER,
 * evitando que o Worker os busque duas vezes no mesmo ciclo de polling.
 * Autenticado com o mesmo Bearer token do ingest endpoint.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7).trim();
  const workerToken =
    process.env.SYNC_SERVICE_TOKEN ||
    process.env.WORKER_INGEST_TOKEN ||
    process.env.ADMIN_SYNC_TOKEN;

  if (!workerToken || !timingSafeEqualStrings(token, workerToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.$transaction(async (tx) => {
    const pending = await tx.syncJob.findMany({
      where: { status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { id: true, sourceMatchId: true, downloadUrl: true },
    });

    if (pending.length === 0) return [];

    await tx.syncJob.updateMany({
      where: { id: { in: pending.map((j) => j.id) } },
      data: { status: "SENT_TO_WORKER", sentAt: new Date() },
    });

    return pending;
  });

  return NextResponse.json({ jobs });
}
