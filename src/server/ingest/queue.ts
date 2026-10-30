import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

export const NORMALIZER_VERSION = "durable-1";
export type IngestBody = { schema_version: string; parser_version: string; match: { id: string }; [key: string]: unknown };
export type Job = { id: string; revision_id: string; source: string; source_match_id: string;
  normalizer_version: string; status: string; attempts: number; max_attempts: number;
  lease_token: string; lease_until: Date | null; last_error: { retryable?: boolean; message?: string } | null;
  payload_id: string; payload_hash: string; payload: IngestBody; created_at: Date };

export function receipt(job: Job) {
  const state = ({ PENDING: "ACCEPTED", RETRY: "ACCEPTED", PROCESSING: "NORMALIZING",
    COMPLETED: "COMPLETED", FAILED: "FAILED", SUPERSEDED: "SUPERSEDED" } as Record<string, string>)[job.status];
  return { protocolVersion: 2, accepted: true, receiptId: job.id, payloadId: job.payload_id,
    payloadHash: job.payload_hash, source: job.source, sourceMatchId: job.source_match_id,
    state, status: state === "COMPLETED" ? "processed" : state?.toLowerCase(),
    normalizerVersion: job.normalizer_version, attempts: job.attempts,
    error: job.last_error, statusUrl: `/api/internal/ingest/status/${job.id}` };
}
export const logIngest = (event: string, fields: Record<string, unknown>) =>
  console.log(JSON.stringify({ subsystem: "ingest", event, at: new Date().toISOString(), ...fields }));

export class DurableIngestQueue {
  constructor(public readonly pool: Pool) {}

  async accept(source: string, matchId: string, body: IngestBody, bytes: Buffer) {
    const hash = createHash("sha256").update(bytes).digest("hex");
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [source + ":" + matchId]);
      let latest = (await c.query(`SELECT * FROM match_payloads WHERE source=$1 AND "sourceMatchId"=$2 FOR UPDATE`, [source, matchId])).rows[0];
      if (!latest) {
        latest = (await c.query(`INSERT INTO match_payloads(id,source,"sourceMatchId","schemaVersion","parserVersion",payload,"payloadHash",status,"createdAt","updatedAt")
          VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,'STORED',now(),now()) RETURNING *`,
        [randomUUID(), source, matchId, body.schema_version, body.parser_version, JSON.stringify(body), hash])).rows[0];
      } else {
        // Archive the previous JSON before replacing the latest compatibility view.
        await c.query(`INSERT INTO ingest_payload_revisions(id,payload_id,payload_hash,payload,parser_version,schema_version,created_at)
          VALUES($1,$2,$3,$4::jsonb,$5,$6,$7) ON CONFLICT(payload_id,payload_hash) DO NOTHING`,
        [randomUUID(), latest.id, latest.payloadHash, JSON.stringify(latest.payload), latest.parserVersion, latest.schemaVersion, latest.createdAt]);
      }
      const knownRevision = (await c.query(`SELECT id FROM ingest_payload_revisions WHERE payload_id=$1 AND payload_hash=$2`, [latest.id, hash])).rowCount;
      const revision = (await c.query(`INSERT INTO ingest_payload_revisions(id,payload_id,payload_hash,payload,parser_version,schema_version)
        VALUES($1,$2,$3,$4::jsonb,$5,$6) ON CONFLICT(payload_id,payload_hash) DO UPDATE SET payload_hash=EXCLUDED.payload_hash RETURNING id`,
      [randomUUID(), latest.id, hash, JSON.stringify(body), body.parser_version, body.schema_version])).rows[0];
      const job = (await c.query(`INSERT INTO normalization_jobs(id,revision_id,source,source_match_id,normalizer_version)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(revision_id,normalizer_version) DO UPDATE SET
        status=CASE WHEN normalization_jobs.status='FAILED' AND coalesce((normalization_jobs.last_error->>'retryable')::boolean,false) THEN 'PENDING' ELSE normalization_jobs.status END,
        max_attempts=CASE WHEN normalization_jobs.status='FAILED' AND coalesce((normalization_jobs.last_error->>'retryable')::boolean,false) THEN normalization_jobs.attempts+5 ELSE normalization_jobs.max_attempts END,
        available_at=CASE WHEN normalization_jobs.status='FAILED' THEN now() ELSE normalization_jobs.available_at END,
        updated_at=now() RETURNING *`, [randomUUID(), revision.id, source, matchId, NORMALIZER_VERSION])).rows[0];
      // Reposting an older revision must not silently replace a newer submission.
      if (latest.payloadHash !== hash && knownRevision) {
        await c.query("COMMIT");
        return receipt({ ...job, payload_id: latest.id, payload_hash: hash });
      }
      const status = job.status === "COMPLETED" ? "PROCESSED" : job.status === "FAILED" ? "FAILED" : "STORED";
      await c.query(`UPDATE match_payloads SET payload=$2::jsonb,"payloadHash"=$3,"parserVersion"=$4,"schemaVersion"=$5,
        status=$6,"updatedAt"=now(),"processedAt"=CASE WHEN $6='PROCESSED' THEN "processedAt" ELSE NULL END,
        "errorMessage"=CASE WHEN $6='FAILED' THEN $7 ELSE NULL END WHERE id=$1`,
      [latest.id, JSON.stringify(body), hash, body.parser_version, body.schema_version, status, job.last_error?.message ?? null]);
      await c.query(`UPDATE sync_jobs SET status=$3::text::"SyncJobStatus",
        "completedAt"=CASE WHEN $3::text='COMPLETED' THEN coalesce("completedAt",now()) ELSE NULL END,
        "errorMessage"=CASE WHEN $3::text='FAILED' THEN $4 ELSE NULL END,"updatedAt"=now()
        WHERE source=$1 AND "sourceMatchId"=$2`, [source, matchId,
        job.status === "COMPLETED" ? "COMPLETED" : job.status === "FAILED" ? "FAILED" : "PROCESSING", job.last_error?.message ?? null]);
      await c.query("COMMIT");
      logIngest("accepted", { receiptId: job.id, matchId, hash, state: job.status });
      return receipt({ ...job, payload_id: latest.id, payload_hash: hash });
    } catch (error) { await c.query("ROLLBACK"); throw error; }
    finally { c.release(); }
  }

  async status(id: string) {
    return (await this.pool.query<Job>(`SELECT j.*,r.payload_id,r.payload_hash FROM normalization_jobs j
      JOIN ingest_payload_revisions r ON r.id=j.revision_id WHERE j.id=$1::uuid`, [id])).rows[0];
  }
  async lookup(source: string, matchId: string, hash: string) {
    return (await this.pool.query<Job>(`SELECT j.*,r.payload_id,r.payload_hash FROM normalization_jobs j
      JOIN ingest_payload_revisions r ON r.id=j.revision_id WHERE j.source=$1 AND j.source_match_id=$2
      AND r.payload_hash=$3 AND j.normalizer_version=$4`, [source, matchId, hash, NORMALIZER_VERSION])).rows[0];
  }

  async claim(owner: string, leaseSeconds = 120): Promise<Job | undefined> {
    const token = randomUUID();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const exhausted = (await c.query(`WITH expired AS (SELECT id FROM normalization_jobs WHERE status='PROCESSING'
        AND lease_until<now() AND attempts>=max_attempts FOR UPDATE SKIP LOCKED)
        UPDATE normalization_jobs SET status='FAILED',finished_at=now(),
        last_error=jsonb_build_object('message','Lease expired at retry limit','retryable',true,'stage','lease'),updated_at=now()
        WHERE id IN (SELECT id FROM expired) RETURNING id,lease_token,last_error`)).rows;
      for (const failed of exhausted) {
        await c.query(`UPDATE normalization_attempts SET finished_at=now(),outcome='FAILED',error=$2::jsonb
          WHERE lease_token=$1 AND finished_at IS NULL`, [failed.lease_token, JSON.stringify(failed.last_error)]);
        logIngest("lease_exhausted", { receiptId: failed.id });
      }
      const row = (await c.query(`WITH candidate AS (
        SELECT id,lease_token FROM normalization_jobs WHERE normalizer_version=$1 AND attempts<max_attempts AND
        ((status IN ('PENDING','RETRY') AND available_at<=now()) OR (status='PROCESSING' AND lease_until<now()))
        ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE normalization_jobs j SET status='PROCESSING',attempts=attempts+1,lease_token=$2::uuid,
        lease_until=now()+($3*interval '1 second'),owner=$4,started_at=now(),finished_at=NULL,updated_at=now()
        FROM candidate c WHERE j.id=c.id RETURNING j.*,c.lease_token AS previous_lease`, [NORMALIZER_VERSION, token, leaseSeconds, owner])).rows[0];
      if (!row) { await c.query("COMMIT"); await this.reconcileFailedViews(c); return undefined; }
      if (row.previous_lease) await c.query(`UPDATE normalization_attempts SET finished_at=now(),outcome='LEASE_EXPIRED'
        WHERE lease_token=$1 AND finished_at IS NULL`, [row.previous_lease]);
      await c.query(`INSERT INTO normalization_attempts(id,job_id,lease_token,attempt,owner) VALUES($1,$2,$3,$4,$5)`,
      [randomUUID(), row.id, token, row.attempts, owner]);
      const revision = (await c.query(`SELECT payload_id,payload_hash,payload,created_at FROM ingest_payload_revisions WHERE id=$1`, [row.revision_id])).rows[0];
      await c.query("COMMIT");
      await this.reconcileFailedViews(c);
      logIngest("claimed", { receiptId: row.id, attempt: row.attempts, owner });
      return { ...revision, ...row };
    } catch (error) { await c.query("ROLLBACK"); throw error; } finally { c.release(); }
  }

  async fail(job: Job, error: unknown) {
    const code = String((error as { code?: string })?.code ?? "");
    const message = error instanceof Error ? error.message : String(error);
    const retryable = !message.startsWith("Contrato de demo violado:") && !["P2002", "P2003", "22P02", "23503", "23505"].includes(code);
    const retry = retryable && job.attempts < job.max_attempts;
    const delay = Math.random() * Math.min(300, 2 ** job.attempts);
    const detail = { message: message.slice(0, 2000), code, retryable, stage: "normalization", at: new Date().toISOString() };
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [job.source + ":" + job.source_match_id]);
      const changed = await c.query(`UPDATE normalization_jobs SET status=$3,last_error=$4::jsonb,
        available_at=now()+($5*interval '1 second'),lease_until=NULL,lease_token=NULL,finished_at=now(),updated_at=now()
        WHERE id=$1 AND lease_token=$2 AND status='PROCESSING' RETURNING id`,
      [job.id, job.lease_token, retry ? "RETRY" : "FAILED", JSON.stringify(detail), delay]);
      if (changed.rowCount) {
        await c.query(`UPDATE normalization_attempts SET outcome=$2,error=$3::jsonb,finished_at=now() WHERE lease_token=$1`, [job.lease_token, retry ? "RETRY" : "FAILED", JSON.stringify(detail)]);
        const latest = await c.query(`UPDATE match_payloads SET status=$4,"errorMessage"=$3,"updatedAt"=now()
          WHERE id=$1 AND "payloadHash"=$2`, [job.payload_id, job.payload_hash, message.slice(0, 2000), retry ? "STORED" : "FAILED"]);
        if (!retry && latest.rowCount) await c.query(`UPDATE sync_jobs SET status='FAILED',"errorMessage"=$3,"updatedAt"=now()
          WHERE source=$1 AND "sourceMatchId"=$2`, [job.source, job.source_match_id, message.slice(0, 2000)]);
      }
      await c.query("COMMIT");
      logIngest(changed.rowCount ? "failed" : "stale_failure_ignored", { receiptId: job.id, attempt: job.attempts, retry, ...detail });
    } catch (failure) { await c.query("ROLLBACK"); throw failure; } finally { c.release(); }
  }

  // A killed last attempt has no live owner to finalize the legacy views. Repair
  // only new-queue failures, fenced by the same match lock used at acceptance.
  private async reconcileFailedViews(c: PoolClient) {
    try {
      const pending = (await c.query(`SELECT j.id,j.source,j.source_match_id FROM normalization_jobs j
        JOIN ingest_payload_revisions r ON r.id=j.revision_id
        JOIN match_payloads p ON p.id=r.payload_id AND p."payloadHash"=r.payload_hash
        WHERE j.status='FAILED' AND j.normalizer_version=$1 AND p.status<>'FAILED' LIMIT 20`, [NORMALIZER_VERSION])).rows;
      for (const job of pending) {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [job.source + ":" + job.source_match_id]);
        const changed = await c.query(`UPDATE match_payloads p SET status='FAILED',
          "errorMessage"=j.last_error->>'message',"updatedAt"=now()
          FROM ingest_payload_revisions r JOIN normalization_jobs j ON j.revision_id=r.id
          WHERE j.id=$1 AND j.status='FAILED' AND p.id=r.payload_id AND p."payloadHash"=r.payload_hash
          RETURNING p."errorMessage"`, [job.id]);
        if (changed.rowCount) await c.query(`UPDATE sync_jobs SET status='FAILED',"completedAt"=NULL,
          "errorMessage"=$3,"updatedAt"=now() WHERE source=$1 AND "sourceMatchId"=$2`,
        [job.source, job.source_match_id, changed.rows[0].errorMessage]);
        await c.query("COMMIT");
      }
    } catch (error) {
      await c.query("ROLLBACK");
      logIngest("compatibility_repair_failed", { message: String(error) });
    }
  }

  async metrics() {
    return (await this.pool.query(`SELECT status,count(*)::int jobs,min(created_at) oldest,
      avg(extract(epoch FROM (finished_at-started_at))) duration_seconds,sum(attempts)::int attempts,
      count(*) FILTER(WHERE status='PROCESSING' AND lease_until<now())::int expired_leases
      FROM normalization_jobs GROUP BY status ORDER BY status`)).rows;
  }
}
let queue: DurableIngestQueue | undefined;
export function getIngestQueue() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  return queue ??= new DurableIngestQueue(new Pool({ connectionString: process.env.DATABASE_URL, max: 4, application_name: "durable-ingest" }));
}
