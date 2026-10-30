import { getIngestQueue } from "@/server/ingest/queue";
import { processClaim } from "@/server/ingest/processor";

// Only explicitly submitted durable jobs are eligible. Never scan the 480 legacy payloads.
export async function processNextPendingPayload(owner = `normalizer-${process.pid}`) {
  const queue = getIngestQueue();
  const job = await queue.claim(owner);
  if (!job) return { processed: false };
  const outcome = await processClaim(queue, job);
  return { processed: true, success: outcome === "COMPLETED", outcome, receiptId: job.id };
}
