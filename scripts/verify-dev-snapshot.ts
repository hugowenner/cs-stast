import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { assertDevTarget, verifySnapshotManifest } from "../src/server/operations/snapshot-copy";
import { assertSnapshotIntegrity, inspectSnapshotIntegrity } from "../src/server/operations/snapshot-integrity";

async function main() {
  const file = process.argv[process.argv.indexOf("--manifest") + 1];
  if (!process.argv.includes("--manifest") || !file || !process.env.DATABASE_URL) throw new Error("Provide --manifest <file> and the local DEV DATABASE_URL.");
  assertDevTarget(process.env.DATABASE_URL);
  const report = JSON.parse(await readFile(file, "utf8"));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const database = (await client.query("SELECT current_database() db")).rows[0].db;
    if (database !== report.stagingDatabase) throw new Error("Manifest belongs to another DEV database.");
    const verified = await verifySnapshotManifest(client, report.manifest);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const integrity = await inspectSnapshotIntegrity(client); assertSnapshotIntegrity(integrity);
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ database, snapshot: report.manifest.snapshot, capturedAt: report.manifest.capturedAt,
      verifiedTables: verified.length, foreignKeys: integrity.foreignKeys.length,
      duplicates: integrity.duplicates, orphans: integrity.logicalOrphans,
      historicalAnomalies: integrity.historicalAnomalies, fixtures: integrity.fixtures }, null, 2));
  } finally { await client.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
