import { prisma, withDatabaseTransaction } from "@/server/db";
import { enrichMatchWithDemo } from "@/server/services/enrichment/demo-enrichment.service";
import { normalizeParserMatch } from "@/server/adapters/parser/normalize";
import { DurableIngestQueue, type Job, logIngest } from "./queue";

export async function processClaim(queue: DurableIngestQueue, job: Job,
  afterProjection?: () => Promise<void>) {
  const started = Date.now();
  try {
    const outcome = await withDatabaseTransaction(async () => {
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${job.source + ":" + job.source_match_id},0))`;
      const owned = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM normalization_jobs
        WHERE id=${job.id}::uuid AND status='PROCESSING' AND lease_token=${job.lease_token}::uuid
        AND lease_until>now() FOR UPDATE`;
      if (!owned.length) return "LOST_LEASE";
      const latest = await prisma.matchPayload.findUnique({ where: { id: job.payload_id } });
      if (!latest || latest.payloadHash !== job.payload_hash) {
        await prisma.$executeRaw`UPDATE normalization_jobs SET status='SUPERSEDED',finished_at=now(),
          lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${job.id}::uuid`;
        await prisma.$executeRaw`UPDATE normalization_attempts SET outcome='SUPERSEDED',finished_at=now()
          WHERE lease_token=${job.lease_token}::uuid`;
        return "SUPERSEDED";
      }
      // GC owns match identity, dates, teams and official aggregates. Preserve the
      // receipt if its metadata has not arrived; never manufacture a GC match.
      const gcMatch = await prisma.match.findUnique({ where: { gamersClubMatchId: job.source_match_id } });
      if (!gcMatch) throw new Error("GC metadata unavailable; payload retained for retry");
      const result = await enrichMatchWithDemo(job.payload, job.source_match_id, gcMatch.playedAt, { preserveGcData: true });
      if (!result.success) throw new Error(result.error || "Normalization failed");
      const match = await prisma.match.findUniqueOrThrow({ where: { gamersClubMatchId: job.source_match_id } });
      const normalized = JSON.stringify(normalizeParserMatch(job.payload, job.source_match_id, match.playedAt));
      await prisma.$executeRaw`INSERT INTO demo_match_projections(job_id,match_id,normalizer_version,normalized)
        VALUES(${job.id}::uuid,${match.id},${job.normalizer_version},${normalized}::jsonb)
        ON CONFLICT(job_id) DO UPDATE SET normalized=EXCLUDED.normalized`;
      await afterProjection?.();
      await prisma.matchPayload.update({ where: { id: job.payload_id }, data: {
        status: "PROCESSED", processedAt: new Date(), errorMessage: null,
      } });
      await prisma.syncJob.updateMany({ where: { source: job.source, sourceMatchId: job.source_match_id },
        data: { status: "COMPLETED", completedAt: new Date(), errorMessage: null } });
      await prisma.$executeRaw`UPDATE normalization_jobs SET status='COMPLETED',finished_at=now(),last_error=NULL,
        lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${job.id}::uuid`;
      await prisma.$executeRaw`UPDATE normalization_attempts SET outcome='COMPLETED',finished_at=now()
        WHERE lease_token=${job.lease_token}::uuid`;
      return "COMPLETED";
    });
    logIngest("processed", { receiptId: job.id, outcome, durationMs: Date.now() - started });
    return outcome;
  } catch (error) {
    await queue.fail(job, error);
    return "FAILED";
  }
}
