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

  // One statement, row-level reservation; abandoned downloads become eligible
  // after 30 minutes. PROCESSING receipts belong to the durable normalizer.
  const jobs = await prisma.$queryRaw`
    WITH candidates AS (
      SELECT id FROM sync_jobs WHERE status IN ('PENDING','FAILED')
        OR (status='SENT_TO_WORKER' AND "sentAt"<now()-interval '30 minutes')
      ORDER BY "createdAt",id FOR UPDATE SKIP LOCKED LIMIT 10
    )
    UPDATE sync_jobs j SET status='SENT_TO_WORKER',"sentAt"=now(),"updatedAt"=now()
    FROM candidates c WHERE j.id=c.id
    RETURNING j.id,j."sourceMatchId",j."downloadUrl",j.source,
      j."sentAt"+interval '30 minutes' AS "leaseUntil"`;

  return NextResponse.json({ jobs });
}
