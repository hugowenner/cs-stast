import { createHash } from "node:crypto";
import type { Client } from "pg";

export const SNAPSHOT_TABLES = [
  "Map", "Achievement", "Player", "tracked_players", "Season", "Session", "Match",
  "PlayerMatchStats", "PlayerAchievement", "Rivalry", "Event", "PlayerClutch",
  "PlayerEntryDuel", "PlayerMatchup", "PlayerTradeEvent", "sync_jobs", "match_payloads",
  "SeasonSnapshot", "TeamBalanceMatch", "team_balance_players",
] as const;
export const quoteIdentifier = (s: string) => `"${s.replaceAll('"', '""')}"`;
type Column = { name: string; type: string; generated: string; primary: boolean };
export type SnapshotManifest = {
  version: 1; snapshot: string; capturedAt: string; sourceDatabase: string;
  effectiveRole: string; readOnly: boolean;
  tables: Record<string, { count: number; sha256: string }>;
};

export function assertDevTarget(url: string) {
  const u = new URL(url);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
      (u.port || "5432") !== "5432" ||
      !["cs2stats_dev", "postgres"].includes(decodeURIComponent(u.username)) ||
      !/^cs2_stats_(dev|test|staging)(_[a-zA-Z0-9_]+)?$/.test(decodeURIComponent(u.pathname.slice(1)))) {
    throw new Error("Destination must be an allowlisted local DEV/test/staging PostgreSQL database and DEV user.");
  }
}

async function columns(c: Client, table: string): Promise<Column[]> {
  return (await c.query<Column>(`SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type,
    a.attgenerated AS generated, EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=a.attrelid
    AND i.indisprimary AND a.attnum=ANY(i.indkey)) AS "primary"
    FROM pg_attribute a WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY a.attnum`, [`public.${quoteIdentifier(table)}`])).rows;
}

async function* batches(c: Client, table: string, cols: Column[]) {
  const keys = cols.filter(col => col.primary);
  if (!keys.length) throw new Error(`Missing primary key: ${table}`);
  const names = cols.map(col => quoteIdentifier(col.name));
  // JSONB payloads can be megabytes each; bound memory independently of row counts.
  const size = table === "match_payloads" ? 10 : 500;
  for (let offset = 0;; offset += size) {
    // Text casts preserve microseconds, bigints, SQL NULL and JSONB literal null.
    const result = await c.query({ text: `SELECT ${names.map(n => `${n}::text`).join(",")}
      FROM public.${quoteIdentifier(table)} ORDER BY ${keys.map(k => quoteIdentifier(k.name)).join(",")}
      LIMIT ${size} OFFSET $1`, values: [offset], rowMode: "array" });
    yield result.rows as (string | null)[][];
    if (result.rows.length < size) break;
  }
}

async function tableManifest(c: Client, table: string, cols: Column[]) {
  const hash = createHash("sha256"); let count = 0;
  for await (const rows of batches(c, table, cols)) for (const row of rows) {
    hash.update(JSON.stringify(row) + "\n"); count++;
  }
  return { count, sha256: hash.digest("hex") };
}

/** Independent, read-only verification against the frozen manifest (not live PRD). */
export async function verifySnapshotManifest(client: Client, manifest: SnapshotManifest) {
  const entries = Object.entries(manifest.tables);
  if (manifest.version !== 1 || !entries.length) throw new Error("Unsupported or empty snapshot manifest.");
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL timezone = 'UTC'");
    await client.query("SET LOCAL datestyle = 'ISO, YMD'");
    const verified: string[] = [];
    for (const [table, expected] of entries) {
      const actual = await tableManifest(client, table, await columns(client, table));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Manifest mismatch: ${table}`);
      verified.push(table);
    }
    return verified;
  } finally { await client.query("ROLLBACK"); }
}

/** Dedicated connections only. Every source query uses one pinned read-only snapshot. */
export async function copyConsistentSnapshot(source: Client, target: Client, options: {
  tables?: readonly string[]; beforeCopy?: () => Promise<void>;
  afterTable?: (table: string) => Promise<void>;
  verify?: (source: Client, target: Client) => Promise<void>;
} = {}): Promise<SnapshotManifest> {
  const tables = options.tables ?? SNAPSHOT_TABLES;
  let sourceOpen = false, targetOpen = false;
  try {
    await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); sourceOpen = true;
    await source.query("SET LOCAL ROLE pg_read_all_data");
    await source.query("SET LOCAL timezone = 'UTC'");
    await source.query("SET LOCAL datestyle = 'ISO, YMD'");
    const meta = (await source.query(`SELECT pg_current_snapshot()::text snapshot,
      transaction_timestamp()::text "capturedAt", current_database() "sourceDatabase",
      current_user "effectiveRole", current_setting('transaction_read_only')='on' "readOnly"`)).rows[0];
    if (meta.effectiveRole !== "pg_read_all_data" || !meta.readOnly) throw new Error("Read-only source guard failed.");
    const manifest: SnapshotManifest = { version: 1, ...meta, tables: {} };
    const schema = new Map<string, Column[]>();
    for (const table of tables) {
      const permissions = (await source.query(`SELECT has_table_privilege(current_user,$1,'SELECT') sel,
        has_table_privilege(current_user,$1,'INSERT,UPDATE,DELETE,TRUNCATE') writes,
        relrowsecurity rls FROM pg_class WHERE oid=$1::regclass`, [`public.${quoteIdentifier(table)}`])).rows[0];
      if (!permissions?.sel || permissions.writes || permissions.rls) throw new Error(`Unsafe source privileges or RLS: ${table}`);
      const [src, dst] = await Promise.all([columns(source, table), columns(target, table)]);
      if (!src.length || JSON.stringify(src) !== JSON.stringify(dst)) throw new Error(`Schema mismatch: ${table}`);
      if (src.some(c => c.generated)) throw new Error(`Generated columns require an explicit copy policy: ${table}`);
      schema.set(table, src);
      manifest.tables[table] = await tableManifest(source, table, src);
    }
    if (tables.includes("Match") && (!manifest.tables.Match.count || !manifest.tables.Player?.count || !manifest.tables.Map?.count)) {
      throw new Error("Production application snapshot unexpectedly empty; promotion forbidden.");
    }
    await options.beforeCopy?.();
    await target.query("BEGIN ISOLATION LEVEL SERIALIZABLE"); targetOpen = true;
    await target.query("SET LOCAL timezone = 'UTC'");
    await target.query("SET LOCAL datestyle = 'ISO, YMD'");
    await target.query("SET LOCAL lock_timeout = '10s'");
    await target.query("SELECT pg_advisory_xact_lock(721984109)");
    await target.query(`LOCK TABLE ${tables.map(t => `public.${quoteIdentifier(t)}`).join(",")} IN ACCESS EXCLUSIVE MODE`);
    for (const table of [...tables].reverse()) await target.query(`DELETE FROM public.${quoteIdentifier(table)}`);
    for (const table of tables) {
      const cols = schema.get(table)!;
      for await (const rows of batches(source, table, cols)) if (rows.length) {
        const values: unknown[] = [];
        const tuples = rows.map(row => `(${row.map((v, i) => { values.push(v); return `$${values.length}::${cols[i].type}`; }).join(",")})`);
        await target.query(`INSERT INTO public.${quoteIdentifier(table)} (${cols.map(c => quoteIdentifier(c.name)).join(",")}) VALUES ${tuples.join(",")}`, values);
      }
      const actual = await tableManifest(target, table, cols);
      if (JSON.stringify(actual) !== JSON.stringify(manifest.tables[table])) throw new Error(`Manifest mismatch: ${table}`);
      await options.afterTable?.(table);
    }
    await options.verify?.(source, target);
    await target.query("COMMIT"); targetOpen = false;
    await source.query("ROLLBACK"); sourceOpen = false;
    return manifest;
  } catch (error) {
    const rollbacks = await Promise.allSettled([
      targetOpen ? target.query("ROLLBACK") : Promise.resolve(),
      sourceOpen ? source.query("ROLLBACK") : Promise.resolve(),
    ]);
    const failures = rollbacks.filter(r => r.status === "rejected");
    if (failures.length) throw new AggregateError([error, ...failures.map(r => (r as PromiseRejectedResult).reason)], "Copy failed; rollback not confirmed. Keep backup and inspect connections.");
    throw error;
  }
}
