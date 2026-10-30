import type { Client } from "pg";
import { quoteIdentifier as qi } from "./snapshot-copy";

export async function inspectSnapshotIntegrity(client: Client) {
  const constraints = (await client.query(`SELECT conname,convalidated,conrelid::regclass::text child,
    confrelid::regclass::text parent,
    to_json(ARRAY(SELECT a.attname::text FROM unnest(conkey) WITH ORDINALITY k(n,i)
      JOIN pg_attribute a ON a.attrelid=conrelid AND a.attnum=k.n ORDER BY k.i)) ck,
    to_json(ARRAY(SELECT a.attname::text FROM unnest(confkey) WITH ORDINALITY k(n,i)
      JOIN pg_attribute a ON a.attrelid=confrelid AND a.attnum=k.n ORDER BY k.i)) pk
    FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace`)).rows;
  const foreignKeys: { name: string; orphans: number; validated: boolean }[] = [];
  for (const f of constraints) {
    const ck = f.ck as string[], pk = f.pk as string[];
    const n = (await client.query(`SELECT count(*)::int n FROM ${f.child} c WHERE
      ${ck.map(k => `c.${qi(k)} IS NOT NULL`).join(" AND ")}
      AND NOT EXISTS(SELECT 1 FROM ${f.parent} p WHERE ${ck.map((k, i) => `c.${qi(k)}=p.${qi(pk[i])}`).join(" AND ")})`)).rows[0].n;
    foreignKeys.push({ name: f.conname, orphans: n, validated: f.convalidated });
  }
  const invalidIndexes = (await client.query(`SELECT indexrelid::regclass::text name FROM pg_index
    WHERE indrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)
    AND (NOT indisvalid OR NOT indisready)`)).rows;
  const duplicates = (await client.query(`
    SELECT 'stats' issue,count(*)::int n FROM (SELECT "matchId","playerId" FROM "PlayerMatchStats" GROUP BY 1,2 HAVING count(*)>1) z
    UNION ALL SELECT 'payloads',count(*)::int FROM (SELECT source,"sourceMatchId" FROM match_payloads GROUP BY 1,2 HAVING count(*)>1) z
    UNION ALL SELECT 'matches_gc',count(*)::int FROM (SELECT "gamersClubMatchId" FROM "Match" WHERE "gamersClubMatchId" IS NOT NULL GROUP BY 1 HAVING count(*)>1) z
    UNION ALL SELECT 'entry_role',count(*)::int FROM (SELECT "matchId","roundNumber","isKiller" FROM "PlayerEntryDuel" GROUP BY 1,2,3 HAVING count(*)>1) z`)).rows;
  const logicalOrphans = (await client.query(`
    SELECT 'payload_without_match' issue,count(*)::int n FROM match_payloads p WHERE p.source='gamersclub'
      AND NOT EXISTS(SELECT 1 FROM "Match" m WHERE m."gamersClubMatchId"=p."sourceMatchId")
    UNION ALL SELECT 'entry_opponent_missing',count(*)::int FROM "PlayerEntryDuel" e WHERE e."opponentId" IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM "Player" p WHERE p.id=e."opponentId")
    UNION ALL SELECT 'match_without_stats',count(*)::int FROM "Match" m
      WHERE NOT EXISTS(SELECT 1 FROM "PlayerMatchStats" s WHERE s."matchId"=m.id)`)).rows;
  const historicalAnomalies = (await client.query(`
    SELECT 'outside_season' issue,count(*)::int n FROM "Match" m JOIN "Season" s ON s.id=m."seasonId"
      WHERE m."playedAt"<s."startDate" OR m."playedAt">s."endDate"
    UNION ALL SELECT 'rounds_differ_from_payload',count(*)::int FROM "Match" m JOIN match_payloads p
      ON p."sourceMatchId"=m."gamersClubMatchId" AND p.source='gamersclub'
      WHERE m."roundsJson" IS DISTINCT FROM p.payload->'rounds'`)).rows;
  const states = (await client.query(`SELECT status,count(*)::int n FROM match_payloads GROUP BY status ORDER BY status`)).rows;
  const versions = (await client.query(`SELECT "schemaVersion","parserVersion",count(*)::int n FROM match_payloads GROUP BY 1,2 ORDER BY 1,2`)).rows;
  const fixtures = (await client.query(`SELECT m."gamersClubMatchId",p.status,p."payloadHash",
    md5(p.payload::text) "jsonbDigest",m."playedAt"::text "playedAt",
    (SELECT count(*)::int FROM "Event" e WHERE e."matchId"=m.id) events,
    (SELECT count(*)::int FROM "PlayerClutch" e WHERE e."matchId"=m.id) clutches,
    (SELECT count(*)::int FROM "PlayerEntryDuel" e WHERE e."matchId"=m.id) entries,
    (SELECT count(*)::int FROM "PlayerTradeEvent" e WHERE e."matchId"=m.id) trades
    FROM "Match" m LEFT JOIN match_payloads p ON p."sourceMatchId"=m."gamersClubMatchId" AND p.source='gamersclub'
    WHERE m."gamersClubMatchId" IN ('28120889','28121066','28124471','28187540') ORDER BY m."gamersClubMatchId"`)).rows;
  return { foreignKeys, invalidIndexes, duplicates, logicalOrphans, historicalAnomalies, states, versions, fixtures };
}

export function assertSnapshotIntegrity(result: Awaited<ReturnType<typeof inspectSnapshotIntegrity>>) {
  if (result.foreignKeys.some(f => f.orphans || !f.validated) || result.invalidIndexes.length ||
      [...result.duplicates, ...result.logicalOrphans].some(r => r.n !== 0)) {
    throw new Error("Snapshot failed structural integrity checks; promotion forbidden.");
  }
}
