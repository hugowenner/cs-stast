import "dotenv/config";
import { Client } from "pg";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { assertDevTarget, copyConsistentSnapshot, quoteIdentifier } from "../src/server/operations/snapshot-copy";
import { assertSnapshotIntegrity, inspectSnapshotIntegrity } from "../src/server/operations/snapshot-integrity";

const container = "cs2-stats-postgres-dev";
const log = (stage: string, data: unknown = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), stage, data }));
async function docker(args: string[], inputFile?: string, outputFile?: string) {
  const child = spawn("docker", ["exec", ...(inputFile ? ["-i"] : []), container, ...args], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", d => { stderr += d.toString(); });
  const closed = new Promise<void>((ok, reject) => {
    child.on("error", reject);
    child.on("close", code => code === 0 ? ok() : reject(new Error(`docker ${args[0]} exited ${code}: ${stderr}`)));
  });
  const tasks: Promise<unknown>[] = [closed];
  if (inputFile) tasks.push(pipeline(createReadStream(inputFile), child.stdin).catch(error => {
    // --list reads only the archive catalogue and legitimately closes stdin
    // before the compressed data section. The child exit code is still checked.
    if (args.includes("--list") && ["EPIPE", "EOF"].includes((error as NodeJS.ErrnoException).code ?? "")) return;
    throw error;
  })); else child.stdin.end();
  if (outputFile) tasks.push(pipeline(child.stdout, createWriteStream(outputFile, { flags: "wx" })));
  else child.stdout.resume();
  await Promise.all(tasks);
}
async function sha256(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function promote(url: string, stamp: string, folder: string) {
  const files = [resolve(".env"), resolve(".env.local")];
  const originals = new Map<string, string>();
  for (const file of files) {
    const original = await readFile(file, "utf8"); originals.set(file, original);
    await writeFile(resolve(folder, `${file.endsWith(".env.local") ? "env.local" : "env"}-before-${stamp}`), original, { flag: "wx", mode: 0o600 });
  }
  try {
    for (const file of files) {
      const original = originals.get(file)!;
      const line = `DATABASE_URL="${url}"`;
      const content = /^DATABASE_URL\s*=/m.test(original) ? original.replace(/^DATABASE_URL\s*=.*$/m, () => line) : original + "\n" + line + "\n";
      const temporary = `${file}.sync-${stamp}.tmp`;
      await writeFile(temporary, content, { flag: "wx", mode: 0o600 }); await rename(temporary, file);
    }
  } catch (error) {
    for (const [file, original] of originals) await writeFile(file, original, { mode: 0o600 });
    throw error;
  }
}

async function main() {
  if (!process.argv.includes("--execute")) throw new Error("Use --execute after reviewing the snapshot procedure. No database was changed.");
  const sourceUrl = process.env.VPS_DATABASE_URL, targetUrl = process.env.DATABASE_URL;
  if (!sourceUrl || !targetUrl) throw new Error("VPS_DATABASE_URL and DATABASE_URL are required.");
  assertDevTarget(targetUrl);
  const src = new URL(sourceUrl), old = new URL(targetUrl);
  if (!["postgres:", "postgresql:"].includes(src.protocol) || !["localhost", "127.0.0.1"].includes(src.hostname) || src.port !== "5433" || src.pathname !== "/cs2stats") throw new Error("Source must be cs2stats through the local SSH tunnel on 5433.");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const stagingName = `cs2_stats_dev_snapshot_${stamp}`;
  const newUrl = new URL(old); newUrl.pathname = "/" + stagingName;
  const folder = resolve("backups"); await mkdir(folder, { recursive: true });
  const backup = resolve(folder, `dev_backup_before_vps_sync_${stamp}.dump`);
  const reportFile = resolve(folder, `sync-manifest-${stamp}.json`);
  const source = new Client({ connectionString: sourceUrl, application_name: "cs2-snapshot-source-readonly" });
  const current = new Client({ connectionString: targetUrl, application_name: "cs2-snapshot-backup-validation" });
  const adminUrl = new URL(old); adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.href });
  const staging = new Client({ connectionString: newUrl.href });
  let manifest: Awaited<ReturnType<typeof copyConsistentSnapshot>> | undefined;
  let sourceIntegrity: Awaited<ReturnType<typeof inspectSnapshotIntegrity>> | undefined;
  try {
    await Promise.all([source.connect(), current.connect(), admin.connect()]);
    const identity = (await current.query("SELECT current_database() db,current_user usr,inet_server_port() port")).rows[0];
    if (identity.db !== decodeURIComponent(old.pathname.slice(1)) || identity.usr !== decodeURIComponent(old.username) || identity.port !== 5432) throw new Error("Local target identity mismatch.");
    await source.query("BEGIN READ ONLY; SET LOCAL ROLE pg_read_all_data");
    const origin = (await source.query("SELECT current_database() db,current_user usr,current_setting('transaction_read_only') ro")).rows[0];
    if (origin.db !== "cs2stats" || origin.usr !== "pg_read_all_data" || origin.ro !== "on") throw new Error("Source read-only identity mismatch.");
    const localeSQL = "SELECT pg_encoding_to_char(encoding) encoding,datcollate,datctype FROM pg_database WHERE datname=current_database()";
    if (JSON.stringify((await source.query(localeSQL)).rows) !== JSON.stringify((await current.query(localeSQL)).rows)) throw new Error("Source/DEV encoding or collation differs.");
    await source.query("ROLLBACK");
    log("identities-confirmed", { sourceDatabase: origin.db, effectiveRole: origin.usr, destinationDatabase: identity.db, stagingName });
    await docker(["pg_dump", "-U", identity.usr, "-d", identity.db, "-Fc"], undefined, backup);
    if ((await stat(backup)).size === 0) throw new Error("Backup is empty.");
    await docker(["pg_restore", "--list"], backup);
    const backupHash = await sha256(backup);
    log("backup-archive-verified", { backup, sha256: backupHash, bytes: (await stat(backup)).size });
    await admin.query(`CREATE DATABASE ${quoteIdentifier(stagingName)} TEMPLATE template0`);
    await docker(["pg_restore", "-U", identity.usr, "-d", stagingName, "--single-transaction", "--exit-on-error", "--no-owner", "--no-privileges"], backup);
    await staging.connect();
    await staging.query("BEGIN READ ONLY");
    const backupIntegrity = await inspectSnapshotIntegrity(staging); assertSnapshotIntegrity(backupIntegrity);
    await staging.query("ROLLBACK");
    log("backup-restored-and-validated", { stagingName, foreignKeys: backupIntegrity.foreignKeys.length });
    manifest = await copyConsistentSnapshot(source, staging, {
      afterTable: async table => log("table-verified", { table }),
      verify: async (srcConnection, dstConnection) => {
        sourceIntegrity = await inspectSnapshotIntegrity(srcConnection);
        const destinationIntegrity = await inspectSnapshotIntegrity(dstConnection);
        assertSnapshotIntegrity(sourceIntegrity); assertSnapshotIntegrity(destinationIntegrity);
        for (const key of ["fixtures", "states", "versions", "historicalAnomalies"] as const) {
          if (JSON.stringify(sourceIntegrity[key]) !== JSON.stringify(destinationIntegrity[key])) throw new Error(`Same-snapshot verification failed: ${key}`);
        }
      },
    });
    await staging.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const integrity = await inspectSnapshotIntegrity(staging); assertSnapshotIntegrity(integrity);
    await staging.query("ROLLBACK");
    const report = { manifest, backup: { file: backup, sha256: backupHash, restoredSuccessfully: true },
      previousDevDatabase: identity.db, stagingDatabase: stagingName, integrity, sourceIntegrity,
      scope: "20 application tables; Configuration/User/Import/Log/migration history retained from verified DEV backup", promoted: false };
    await writeFile(reportFile, JSON.stringify(report, null, 2), { flag: "wx" });
    if (process.argv.includes("--promote-dev")) {
      await promote(newUrl.href, stamp, folder);
      report.promoted = true; await writeFile(reportFile, JSON.stringify(report, null, 2));
      log("dev-promoted", { database: stagingName, previousDatabasePreserved: identity.db, reportFile, restartLocalAppRequired: true });
    } else log("validated-not-promoted", { database: stagingName, reportFile });
  } catch (error) {
    log("failed", { error: error instanceof Error ? error.message : String(error), previousDatabaseUntouched: true, stagingName,
      manifestAvailable: Boolean(manifest), backup, reportFile });
    throw error;
  } finally { await Promise.allSettled([source.end(), current.end(), staging.end(), admin.end()]); }
}
if (process.argv[1]?.match(/sync-from-vps-to-pg\.(ts|js)$/)) main().catch(error => {
  console.error(error instanceof Error ? error.message : error); process.exitCode = 1;
});
