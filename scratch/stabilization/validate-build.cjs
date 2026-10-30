// Local, disposable schema only. Never migrates or writes to the fixture source.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { execFileSync, spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
async function main() {
  const test = process.argv.includes('--test');
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.startsWith('/cs2_stats_dev_')) throw Error('Local DEV fixture required');
  const source = url.pathname.slice(1);
  const fixtures = {};
  if (test) {
    const fixture = new Client({ connectionString: url.href }); await fixture.connect();
    try {
      await fixture.query('BEGIN READ ONLY');
      fixtures.Season = (await fixture.query(`SELECT to_jsonb(s) data FROM "Season" s WHERE id IN ('cmuow54kq223v01rxwlfgd6o9','season-sep-2026')`)).rows.map(r => r.data);
      fixtures.SeasonSnapshot = (await fixture.query(`SELECT to_jsonb(s) data FROM "SeasonSnapshot" s WHERE "seasonId" IN ('cmuow54kq223v01rxwlfgd6o9','season-sep-2026')`)).rows.map(r => r.data);
      await fixture.query('ROLLBACK');
    } finally { await fixture.end(); }
  }
  const name = 'cs2_stats_test_build_' + randomUUID().replaceAll('-', '');
  url.pathname = '/postgres';
  const admin = new Client({ connectionString: url.href }); await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  let client;
  try {
    const schema = execFileSync('docker', ['exec', 'cs2-stats-postgres-dev', 'pg_dump', '-U', url.username, '-d', source, '--schema-only', '--no-owner', '--no-privileges'], { windowsHide: true });
    execFileSync('docker', ['exec', '-i', 'cs2-stats-postgres-dev', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', url.username, '-d', name], { input: schema, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    url.pathname = '/' + name;
    client = new Client({ connectionString: url.href }); await client.connect();
    await client.query(readFileSync('prisma/migrations/20261030150000_durable_ingest/migration.sql', 'utf8'));
    for (const [table, rows] of Object.entries(fixtures)) for (const row of rows) {
      await client.query(`INSERT INTO "${table}" SELECT * FROM jsonb_populate_record(NULL::"${table}",$1::jsonb)`, [JSON.stringify(row)]);
    }
    await client.end(); client = undefined;
    console.log(test ? 'Tests use disposable schema and season fixtures:' : 'Build uses disposable, empty schema:', name);
    const code = await new Promise((resolve, reject) => {
      const child = spawn('cmd.exe', ['/d', '/s', '/c', test ? 'npm test' : 'npm run build'], { stdio: 'inherit', windowsHide: true,
        env: { ...process.env, DATABASE_URL: url.href, DURABLE_INGEST_ENABLED: '0', SYNC_WORKER_URL: '', NEXT_TELEMETRY_DISABLED: '1' } });
      child.on('error', reject); child.on('close', resolve);
    });
    if (code !== 0) throw Error('Build exited ' + code);
  } finally {
    await client?.end();
    if (!/^cs2_stats_test_build_[a-f0-9]{32}$/.test(name)) throw Error('Unsafe cleanup target');
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
