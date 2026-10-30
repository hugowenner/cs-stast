import "dotenv/config";
import { setTimeout as wait } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { processNextPendingPayload } from "../services/normalizer.service";
import { getIngestQueue } from "./queue";
import { prisma } from "../db";

async function main() {
  if (!process.argv.includes("--run") || process.env.DURABLE_INGEST_ENABLED !== "1") throw new Error("Normalizer requires --run and DURABLE_INGEST_ENABLED=1; no jobs were processed.");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; }); process.on("SIGTERM", () => { stopping = true; });
  const owner = `${hostname()}:${process.pid}:${randomUUID()}`;
  try {
    do {
      try { const result = await processNextPendingPayload(owner); if (!result.processed) await wait(1000); }
      catch (error) { console.error(JSON.stringify({ event: "consumer_error", error: String(error) })); await wait(2000); }
    } while (!stopping && !process.argv.includes("--once"));
  } finally { await getIngestQueue().pool.end(); await prisma.$disconnect(); }
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
