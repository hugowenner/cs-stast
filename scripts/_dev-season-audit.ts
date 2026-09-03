/**
 * _dev-season-audit.ts — auditoria de seasons no banco DEV local
 * Uso: tsx scripts/_dev-season-audit.ts
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const DEV_URL =
  process.env.DATABASE_URL ??
  "postgresql://cs2stats_dev:dev_only_cs2stats_2026@localhost:5432/cs2_stats_dev";

type SeasonRow = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  match_count: number;
  stats_count: number;
  rivalry_count: number;
};

const c = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DEV_URL }),
}) as unknown as {
  $queryRawUnsafe<T>(sql: string): Promise<T[]>;
  $disconnect(): Promise<void>;
};

async function main() {
  // ── 1. Seasons com contagens ──────────────────────────────────────────────
  const seasons = await c.$queryRawUnsafe<SeasonRow>(`
    SELECT
      s.id,
      s.name,
      s.status,
      s."startDate"::text   AS "startDate",
      s."endDate"::text     AS "endDate",
      s."createdAt"::text   AS "createdAt",
      COUNT(DISTINCT m.id)::int        AS match_count,
      COUNT(DISTINCT pms.id)::int      AS stats_count,
      COUNT(DISTINCT r.id)::int        AS rivalry_count
    FROM "Season" s
    LEFT JOIN "Match"          m   ON m."seasonId"  = s.id
    LEFT JOIN "PlayerMatchStats" pms ON pms."matchId" = m.id
    LEFT JOIN "Rivalry"        r   ON r."seasonId"  = s.id
    GROUP BY s.id
    ORDER BY s."startDate"
  `);

  console.log("\n  ===== SEASONS NO DEV =====\n");
  for (const s of seasons) {
    console.log(`  ${s.name}`);
    console.log(`    id:         ${s.id}`);
    console.log(`    status:     ${s.status}`);
    console.log(`    startDate:  ${s.startDate?.slice(0, 10)}`);
    console.log(`    endDate:    ${s.endDate?.slice(0, 10)}`);
    console.log(`    partidas:   ${s.match_count}`);
    console.log(`    stats:      ${s.stats_count}`);
    console.log(`    rivalries:  ${s.rivalry_count}`);
    console.log("");
  }

  // ── 2. Verificar Maio/2026 especificamente ────────────────────────────────
  const maio = seasons.find((s) => s.name.toLowerCase().includes("maio") || s.name.includes("05/2026") || s.name.includes("May"));
  if (maio) {
    console.log("  ===== MAIO/2026 DETALHADO =====\n");

    const [{ count: matchPayloads }] = await c.$queryRawUnsafe<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM match_payloads mp
      JOIN "Match" m ON m."gamersClubMatchId" = mp."sourceMatchId"
      WHERE m."seasonId" = '${maio.id}'
    `);

    const [{ count: achievements }] = await c.$queryRawUnsafe<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM "PlayerAchievement" pa
      JOIN "Match" m ON m.id = pa."matchId"
      WHERE m."seasonId" = '${maio.id}'
    `);

    console.log(`  id:            ${maio.id}`);
    console.log(`  Partidas:      ${maio.match_count}`);
    console.log(`  Stats:         ${maio.stats_count}`);
    console.log(`  Rivalries:     ${maio.rivalry_count}`);
    console.log(`  MatchPayloads: ${matchPayloads}`);
    console.log(`  Achievements:  ${achievements}`);

    if (maio.match_count === 0) {
      // Verificar seqüências dependentes mesmo sem matches
      const [{ count: seqRivalries }] = await c.$queryRawUnsafe<{ count: string }>(`
        SELECT COUNT(*)::text as count FROM "Rivalry" WHERE "seasonId" = '${maio.id}'
      `);
      const [{ count: snapshots }] = await c.$queryRawUnsafe<{ count: string }>(`
        SELECT COUNT(*)::text as count FROM "SeasonSnapshot" WHERE "seasonId" = '${maio.id}'
      `);
      console.log(`\n  Dependencias diretas na Season (sem passar por Match):`);
      console.log(`    Rivalry (direto na season): ${seqRivalries}`);
      console.log(`    SeasonSnapshot:             ${snapshots}`);
    }
    console.log("");
  }

  // ── 3. Verificar coerência de datas entre seasons ─────────────────────────
  console.log("  ===== COERENCIA DE DATAS =====\n");
  for (let i = 0; i < seasons.length - 1; i++) {
    const curr = seasons[i];
    const next = seasons[i + 1];
    const currEnd = new Date(curr.endDate);
    const nextStart = new Date(next.startDate);
    const gap = Math.round((nextStart.getTime() - currEnd.getTime()) / 86400000);
    const overlap = currEnd > nextStart;
    console.log(
      `  ${curr.name} end(${curr.endDate?.slice(0, 10)}) → ${next.name} start(${next.startDate?.slice(0, 10)}): ${overlap ? "SOBREPOSICAO!" : `gap ${gap} dias`}`,
    );
  }
  console.log("");

  // ── 4. Verificar status esperado ─────────────────────────────────────────
  const today = new Date();
  console.log(`  ===== STATUS ESPERADO vs REAL (hoje: ${today.toISOString().slice(0, 10)}) =====\n`);
  for (const s of seasons) {
    const end = new Date(s.endDate);
    const shouldBeClosed = end < today;
    const label = shouldBeClosed ? "deveria ser CLOSED" : "deveria ser ACTIVE";
    const ok = (shouldBeClosed && s.status === "CLOSED") || (!shouldBeClosed && s.status === "ACTIVE");
    console.log(`  ${s.name}: status=${s.status}  (${label}) ${ok ? "OK" : "*** INCORRETO ***"}`);
  }
  console.log("");

  await c.$disconnect();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
