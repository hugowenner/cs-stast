import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { DurableIngestQueue, getIngestQueue, receipt, type IngestBody } from "./queue";

const enabled = Boolean(process.env.CS2_PIPELINE_TEST_ADMIN_URL);
const suite = enabled ? describe.sequential : describe.skip;
suite("durable pipeline — disposable PostgreSQL only", () => {
  const name = `cs2_stats_test_pipeline_${randomUUID().replaceAll("-", "")}`;
  let admin: Client, client: Client, pool: Pool, queue: DurableIngestQueue;
  let processClaim: typeof import("./processor").processClaim;
  let db: typeof import("@/server/db");
  let body: IngestBody, bytes: Buffer;
  let gcBaseline: unknown;
  let matchBaseline: unknown;
  let identityBaseline: unknown;
  let trackedBaseline: unknown;
  beforeAll(async () => {
    const adminUrl = new URL(process.env.CS2_PIPELINE_TEST_ADMIN_URL!);
    if (!["localhost", "127.0.0.1"].includes(adminUrl.hostname) || adminUrl.pathname !== "/postgres") throw new Error("Disposable test admin must be local /postgres");
    const devUrl = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(devUrl.hostname) || !devUrl.pathname.startsWith("/cs2_stats_dev_")) throw new Error("Fixture source must be local DEV");
    const source = new Client({ connectionString: devUrl.href }); await source.connect();
    await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const match = (await source.query(`SELECT m.* FROM "Match" m WHERE "gamersClubMatchId"='28120889'`)).rows[0];
    const data: Record<string, unknown[]> = {};
    for (const [table, filter, values] of [
      ["Map", 'id=$1', [match.mapId]], ["Season", 'id=$1', [match.seasonId]],
      ["Session", 'id=$1', [match.sessionId]],
      ["Player", 'id IN (SELECT "playerId" FROM "PlayerMatchStats" WHERE "matchId"=$1)', [match.id]],
      ["tracked_players", 'player_id IN (SELECT "playerId" FROM "PlayerMatchStats" WHERE "matchId"=$1)', [match.id]],
      ["Match", 'id=$1', [match.id]], ["PlayerMatchStats", '"matchId"=$1', [match.id]],
    ] as [string, string, string[]][]) data[table] = (await source.query(`SELECT to_jsonb(t) row FROM "${table}" t WHERE ${filter}`, values)).rows.map(r => r.row);
    await source.query("ROLLBACK"); await source.end();
    admin = new Client({ connectionString: adminUrl.href }); await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`);
    const schema = execFileSync("docker", ["exec", "cs2-stats-postgres-dev", "pg_dump", "-U", devUrl.username, "-d", devUrl.pathname.slice(1), "--schema-only", "--no-owner", "--no-privileges"], { maxBuffer: 5_000_000, windowsHide: true });
    execFileSync("docker", ["exec", "-i", "cs2-stats-postgres-dev", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", devUrl.username, "-d", name], { input: schema, stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
    adminUrl.pathname = "/" + name;
    process.env.DATABASE_URL = adminUrl.href;
    process.env.SYNC_WORKER_URL = "";
    process.env.DURABLE_INGEST_ENABLED = "1";
    process.env.SYNC_SERVICE_TOKEN = "isolated-test-token";
    client = new Client({ connectionString: adminUrl.href }); await client.connect();
    await client.query(readFileSync("prisma/migrations/20261030150000_durable_ingest/migration.sql", "utf8"));
    for (const [table, rows] of Object.entries(data)) for (const row of rows) {
      await client.query(`INSERT INTO "${table}" SELECT * FROM jsonb_populate_record(NULL::"${table}",$1::jsonb)`, [JSON.stringify(row)]);
    }
    await client.query(`INSERT INTO "SeasonSnapshot"(id,"seasonId",dashboard,"createdAt") VALUES('official-snapshot',$1,'{"keep":true}',now())`, [match.seasonId]);
    pool = new Pool({ connectionString: adminUrl.href, max: 6 }); queue = new DurableIngestQueue(pool);
    db = await import("@/server/db"); ({ processClaim } = await import("./processor"));
    body = JSON.parse(readFileSync("C:/Users/ramobh/Documents/CS2 Sync Worker/storage/json/28120889_parsed.json", "utf8"));
    bytes = Buffer.from(JSON.stringify(body));
    gcBaseline = (await client.query(`SELECT to_jsonb(s) row FROM "PlayerMatchStats" s ORDER BY id`)).rows;
    matchBaseline = (await client.query(`SELECT to_jsonb(m) row FROM "Match" m ORDER BY id`)).rows;
    identityBaseline = (await client.query(`SELECT to_jsonb(p) row FROM "Player" p ORDER BY id`)).rows;
    trackedBaseline = (await client.query(`SELECT to_jsonb(t) row FROM tracked_players t ORDER BY id`)).rows;
  }, 30_000);
  beforeEach(async () => {
    await client.query(`DELETE FROM demo_match_projections; DELETE FROM normalization_attempts; DELETE FROM normalization_jobs;
      DELETE FROM ingest_payload_revisions; DELETE FROM match_payloads; DELETE FROM "Event"; DELETE FROM "PlayerMatchup";
      DELETE FROM "PlayerClutch"; DELETE FROM "PlayerEntryDuel"; DELETE FROM "PlayerTradeEvent";`);
  });
  afterAll(async () => {
    await Promise.allSettled([db?.prisma.$disconnect(), pool?.end(), client?.end(), getIngestQueue().pool.end()]);
    if (admin) { if (!/^cs2_stats_test_pipeline_[a-f0-9]{32}$/.test(name)) throw new Error("Unsafe test cleanup");
      await admin.query(`DROP DATABASE "${name}"`); await admin.end(); }
  });
  const accept = () => queue.accept("gamersclub", "28120889", body, bytes);
  it("accepts once concurrently, completes transactionally, replays without duplicate effects", async () => {
    const results = await Promise.all([accept(), accept(), accept()]);
    expect(new Set(results.map(r => r.receiptId)).size).toBe(1);
    expect(results[0].state).toBe("ACCEPTED");
    const claims = await Promise.all([queue.claim("one"), queue.claim("two")]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await processClaim(queue, claims.find(Boolean)!)).toBe("COMPLETED");
    const before = (await client.query(`SELECT count(*)::int n FROM "Event"`)).rows;
    expect((await accept()).state).toBe("COMPLETED");
    expect(await queue.claim("again")).toBeUndefined();
    expect((await client.query(`SELECT count(*)::int n FROM "Event"`)).rows).toEqual(before);
    expect((await client.query(`SELECT to_jsonb(s) row FROM "PlayerMatchStats" s ORDER BY id`)).rows).toEqual(gcBaseline);
    expect((await client.query(`SELECT to_jsonb(m) row FROM "Match" m ORDER BY id`)).rows).toEqual(matchBaseline);
    expect((await client.query(`SELECT to_jsonb(p) row FROM "Player" p ORDER BY id`)).rows).toEqual(identityBaseline);
    expect((await client.query(`SELECT to_jsonb(t) row FROM tracked_players t ORDER BY id`)).rows).toEqual(trackedBaseline);
    expect((await client.query(`SELECT dashboard FROM "SeasonSnapshot"`)).rows[0].dashboard).toEqual({ keep: true });
  });
  it("rolls back relational changes after a late failure and retries an identical failed payload", async () => {
    await accept(); const job = (await queue.claim("crashing"))!;
    await client.query(`UPDATE normalization_jobs SET max_attempts=1 WHERE id=$1`, [job.id]); job.max_attempts = 1;
    expect(await processClaim(queue, job, async () => { throw new Error("injected late crash"); })).toBe("FAILED");
    expect((await client.query(`SELECT count(*)::int n FROM "Event"`)).rows[0].n).toBe(0);
    expect((await client.query(`SELECT count(*)::int n FROM demo_match_projections`)).rows[0].n).toBe(0);
    expect(receipt((await queue.status(job.id))!).state).toBe("FAILED");
    expect((await accept()).state).toBe("ACCEPTED");
    expect(await processClaim(queue, (await queue.claim("recovered"))!)).toBe("COMPLETED");
    expect((await client.query("SELECT outcome FROM normalization_attempts ORDER BY attempt")).rows.map(r => r.outcome)).toEqual(["FAILED", "COMPLETED"]);
  });
  it("recovers an expired lease and fences the old owner", async () => {
    await accept(); const old = (await queue.claim("dead"))!;
    await client.query(`UPDATE normalization_jobs SET lease_until=now()-interval '1 second' WHERE id=$1`, [old.id]);
    const next = (await queue.claim("restart"))!;
    expect(next.lease_token).not.toBe(old.lease_token);
    expect(await processClaim(queue, old)).toBe("LOST_LEASE");
    expect(await processClaim(queue, next)).toBe("COMPLETED");
  });
  it("preserves old JSON revisions and prevents a stale repost from rolling back latest", async () => {
    const first = await accept(); const old = (await queue.claim("old"))!;
    const changed = { ...body, audit_revision: 2 };
    const second = await queue.accept("gamersclub", "28120889", changed, Buffer.from(JSON.stringify(changed)));
    expect(second.receiptId).not.toBe(first.receiptId);
    await accept();
    expect((await client.query(`SELECT "payloadHash" FROM match_payloads`)).rows[0].payloadHash).toBe(second.payloadHash);
    expect(await processClaim(queue, old)).toBe("SUPERSEDED");
    expect(await processClaim(queue, (await queue.claim("new"))!)).toBe("COMPLETED");
    expect((await client.query("SELECT count(*)::int n FROM ingest_payload_revisions")).rows[0].n).toBe(2);
  });
  it("rejects unauthenticated status and binds status lookup to exact source/id/hash", async () => {
    const result = await accept();
    const { GET } = await import("@/app/api/internal/ingest/status/[id]/route");
    expect((await GET(new Request("http://local/status"), { params: Promise.resolve({ id: result.receiptId }) })).status).toBe(401);
    const response = await GET(new Request("http://local/status", { headers: { authorization: "Bearer isolated-test-token" } }), { params: Promise.resolve({ id: result.receiptId }) });
    expect((await response.json()).state).toBe("ACCEPTED");
    expect(await queue.lookup("gamersclub", "28120889", "0".repeat(64))).toBeUndefined();
    expect((await queue.lookup("gamersclub", "28120889", result.payloadHash))!.id).toBe(result.receiptId);
  });
  it("HTTP 202 is not final; a lost response is recovered by authenticated lookup", async () => {
    const { POST } = await import("@/app/api/internal/ingest/match/route");
    const response = await POST(new Request("http://local/api/internal/ingest/match", { method: "POST", body: bytes.toString("utf8"),
      headers: { authorization: "Bearer isolated-test-token", "x-match-source": "gamersclub", "x-match-source-id": "28120889" } }));
    expect(response.status).toBe(202);
    const received = await response.json(); expect(received.state).toBe("ACCEPTED");
    const { GET } = await import("@/app/api/internal/ingest/status/route");
    const status = await GET(new Request(`http://local/status?source=gamersclub&sourceMatchId=28120889&payloadHash=${received.payloadHash}`,
      { headers: { authorization: "Bearer isolated-test-token" } }));
    expect((await status.json()).receiptId).toBe(received.receiptId);
    expect(await processClaim(queue, (await queue.claim("http-consumer"))!)).toBe("COMPLETED");
  });
  it("a legacy PENDING payload is explicitly submitted without any bulk enqueue", async () => {
    await client.query(`INSERT INTO match_payloads(id,source,"sourceMatchId","schemaVersion","parserVersion",payload,"payloadHash",status,"createdAt","updatedAt")
      VALUES('legacy','gamersclub','28120889','1.0.0','0.41.4',$1::jsonb,'legacy-hash','PENDING',now(),now())`, [JSON.stringify(body)]);
    const result = await accept();
    expect(result.state).toBe("ACCEPTED");
    expect((await client.query("SELECT count(*)::int n FROM normalization_jobs")).rows[0].n).toBe(1);
    expect(await processClaim(queue, (await queue.claim("legacy-retry"))!)).toBe("COMPLETED");
    expect((await client.query("SELECT count(*)::int n FROM ingest_payload_revisions")).rows[0].n).toBe(2);
  });
  it("an exhausted crashed attempt becomes a terminal failure and never claims completion", async () => {
    await accept(); const job = (await queue.claim("dead-at-limit"))!;
    await client.query(`UPDATE normalization_jobs SET max_attempts=attempts,lease_until=now()-interval '1 second' WHERE id=$1`, [job.id]);
    expect(await queue.claim("recovery" )).toBeUndefined();
    const status = receipt((await queue.status(job.id))!);
    expect(status.state).toBe("FAILED");
    expect((await client.query(`SELECT status FROM match_payloads`)).rows[0].status).toBe("FAILED");
    expect((await client.query("SELECT outcome FROM normalization_attempts")).rows[0].outcome).toBe("FAILED");
  });
  it("permanent invalid parser payloads fail without retry or partial effects", async () => {
    const invalid = { ...body, players: [{ steamid: "", name: "invalid", team: "CT" }] };
    const result = await queue.accept("gamersclub", "28120889", invalid, Buffer.from(JSON.stringify(invalid)));
    await processClaim(queue, (await queue.claim("invalid"))!);
    expect(receipt((await queue.status(result.receiptId))!).state).toBe("FAILED");
    expect((await queue.accept("gamersclub", "28120889", invalid, Buffer.from(JSON.stringify(invalid)))).state).toBe("FAILED");
    expect((await client.query(`SELECT count(*)::int n FROM "Event"`)).rows[0].n).toBe(0);
  });
  it("download jobs are claimed exclusively and only abandoned leases recover", async () => {
    await client.query(`DELETE FROM sync_jobs`);
    await client.query(`INSERT INTO sync_jobs(id,"sourceMatchId",source,"downloadUrl",status,"createdAt","updatedAt")
      SELECT 'download-'||n,n::text,'gamersclub','http://invalid.local/'||n||'.dem','PENDING',now(),now() FROM generate_series(1,12) n`);
    const { GET } = await import("@/app/api/internal/jobs/pending/route");
    const request = () => new Request("http://local/jobs", { headers: { authorization: "Bearer isolated-test-token" } });
    const results = await Promise.all([GET(request()), GET(request())]);
    const jobs = (await Promise.all(results.map(r => r.json()))).flatMap(r => r.jobs);
    expect(jobs).toHaveLength(12);
    expect(new Set(jobs.map(j => j.id)).size).toBe(12);
    expect((await (await GET(request())).json()).jobs).toHaveLength(0);
    await client.query(`UPDATE sync_jobs SET "sentAt"=now()-interval '31 minutes' WHERE id='download-1'`);
    expect((await (await GET(request())).json()).jobs).toHaveLength(1);
    await client.query(`DELETE FROM sync_jobs`);
  });
  it("repository-created players also roll back with late failure", async () => {
    const extraSteam = "76561198099999999";
    const augmented = { ...body, players: [...body.players as object[], { steamid: extraSteam, name: "rollback-only", team: "CT" }] };
    await queue.accept("gamersclub", "28120889", augmented, Buffer.from(JSON.stringify(augmented)));
    await processClaim(queue, (await queue.claim("player-rollback"))!, async () => { throw new Error("late rollback"); });
    expect((await client.query(`SELECT count(*)::int n FROM "Player" WHERE "steamId"=$1`, [extraSteam])).rows[0].n).toBe(0);
  });
  it("retains receipts while awaiting GC metadata and never creates a fabricated match", async () => {
    const result = await queue.accept("gamersclub", "99999999", body, bytes);
    await processClaim(queue, (await queue.claim("waiting-for-gc"))!);
    expect((await client.query(`SELECT count(*)::int n FROM "Match" WHERE "gamersClubMatchId"='99999999'`)).rows[0].n).toBe(0);
    expect((await queue.status(result.receiptId))!.status).toBe("RETRY");
    expect((await client.query(`SELECT count(*)::int n FROM ingest_payload_revisions`)).rows[0].n).toBe(1);
  });
  it("the bundled standalone consumer processes one job and exits cleanly", async () => {
    await accept();
    execFileSync(process.execPath, ["src/server/ingest/build-consumer.mjs"], { windowsHide: true });
    const output = execFileSync(process.execPath, ["normalizer.cjs", "--run", "--once"], {
      env: { ...process.env }, encoding: "utf8", windowsHide: true, timeout: 20_000,
    });
    expect(output).toContain('"outcome":"COMPLETED"');
    expect((await client.query("SELECT status FROM normalization_jobs")).rows[0].status).toBe("COMPLETED");
  }, 25_000);
  it("Python uploader and real route handlers agree over isolated loopback HTTP", async () => {
    const { POST } = await import("@/app/api/internal/ingest/match/route");
    const lookup = (await import("@/app/api/internal/ingest/status/route")).GET;
    const status = (await import("@/app/api/internal/ingest/status/[id]/route")).GET;
    const capabilities = (await import("@/app/api/internal/ingest/capabilities/route")).GET;
    let consumer: Promise<void> | undefined;
    const server = createServer(async (incoming, outgoing) => {
      try {
        const chunks: Buffer[] = []; for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
        const url = `http://127.0.0.1${incoming.url}`;
        const headers = new Headers(); for (const [key, value] of Object.entries(incoming.headers)) if (typeof value === "string") headers.set(key, value);
        const request = new Request(url, { method: incoming.method, headers,
          ...(incoming.method === "POST" ? { body: Buffer.concat(chunks) } : {}) });
        const pathname = new URL(url).pathname;
        const result = incoming.method === "POST" ? await POST(request)
          : pathname.endsWith("capabilities") ? await capabilities(request)
          : pathname.endsWith("/status") ? await lookup(request)
          : await status(request, { params: Promise.resolve({ id: pathname.split("/").at(-1)! }) });
        outgoing.writeHead(result.status, Object.fromEntries(result.headers)); outgoing.end(await result.text());
        if (incoming.method === "POST" && result.status === 202 && !consumer) consumer = (async () => {
          const claimed = await queue.claim("loopback-consumer"); if (claimed) await processClaim(queue, claimed);
        })();
      } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing test listener");
    const temp = mkdtempSync(join(tmpdir(), "cs2-protocol-test-"));
    writeFileSync(join(temp, "28120889_parsed.json"), JSON.stringify(body));
    const python = "C:/Users/ramobh/Documents/CS2 Sync Worker/.venv/Scripts/python.exe";
    const code = `import time\nfrom app.services.uploader import UploaderService, payload_bytes\nUploaderService.check_capabilities()\nr=UploaderService.upload_match_payload('28120889','28120889_parsed.json')\nassert r['accepted'] and not r['success'], r\nprint('PYTHON_ACCEPTED',flush=True)\nfor _ in range(100):\n s=UploaderService.query_status('28120889',r['payloadHash'],r['receiptId'])\n if s and s.get('success'):\n  print('PYTHON_CONFIRMED',flush=True)\n  break\n time.sleep(.1)\nelse: raise AssertionError('No final confirmation')\n`;
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(python, ["-B", "-c", code], { cwd: "C:/Users/ramobh/Documents/CS2 Sync Worker", windowsHide: true,
          env: { ...process.env, DATABASE_URL: "sqlite:///" + join(temp, "unused.db"), JSON_DIR: temp, LOGS_DIR: join(temp, "logs"),
            DEMOS_DIR: join(temp, "demos"), HUB_API_URL: `http://127.0.0.1:${address.port}/api/internal/ingest/match`, SYNC_SERVICE_TOKEN: "isolated-test-token" } });
        let out = "", err = ""; child.stdout.on("data", d => { out += d; }); child.stderr.on("data", d => { err += d; });
        child.on("error", reject); child.on("close", code => code === 0 ? resolve(out) : reject(new Error(err)));
      });
      expect(output).toContain("PYTHON_ACCEPTED"); expect(output).toContain("PYTHON_CONFIRMED");
      await consumer;
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  }, 25_000);
});
