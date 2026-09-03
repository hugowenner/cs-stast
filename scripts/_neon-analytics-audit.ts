/**
 * _neon-analytics-audit.ts  — script temporário, não commitar
 * Verifica cobertura de analytics nas 344 partidas do Neon.
 * Uso: tsx scripts/_neon-analytics-audit.ts
 * Requer SOURCE_DATABASE_URL no ambiente (carregado pelo PS1 wrapper).
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.SOURCE_DATABASE_URL;
if (!url) throw new Error("SOURCE_DATABASE_URL nao definida");

const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
}) as unknown as {
  $queryRawUnsafe<T>(sql: string): Promise<T[]>;
  $disconnect(): Promise<void>;
};

type CountRow = { count: string };

async function q(sql: string): Promise<number> {
  try {
    const [r] = await client.$queryRawUnsafe<CountRow>(sql);
    return parseInt(r?.count ?? "0");
  } catch {
    return -1; // tabela inexistente no schema antigo
  }
}

async function main() {
  const total = await q(`SELECT COUNT(*)::text as count FROM "Match"`);

  // Partidas com pelo menos 1 registro em cada tabela filha
  const withPayload = await q(`
    SELECT COUNT(DISTINCT m.id)::text as count
    FROM "Match" m
    JOIN match_payloads mp ON mp."sourceMatchId" = m."gamersClubMatchId"
  `);

  const withStats = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count FROM "PlayerMatchStats"
  `);

  const withMatchup = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count FROM "PlayerMatchup"
  `);

  const withClutch = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count FROM "PlayerClutch"
  `);

  const withEntry = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count FROM "PlayerEntryDuel"
  `);

  const withTrade = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count FROM "PlayerTradeEvent"
  `);

  const withAchievement = await q(`
    SELECT COUNT(DISTINCT "matchId")::text as count
    FROM "PlayerAchievement"
    WHERE "matchId" IS NOT NULL
  `);

  // Detalhamento por temporada
  const seasons = await client.$queryRawUnsafe<{
    name: string;
    start_date: string;
    total: string;
    with_stats: string;
    with_payload: string;
  }>(`
    SELECT
      s.name,
      MIN(s."startDate")::text                                                   AS start_date,
      COUNT(m.id)::text                                                          AS total,
      COUNT(pms."matchId")::text                                                 AS with_stats,
      COUNT(mp."sourceMatchId")::text                                            AS with_payload
    FROM "Season" s
    JOIN "Match" m ON m."seasonId" = s.id
    LEFT JOIN (SELECT DISTINCT "matchId" FROM "PlayerMatchStats") pms ON pms."matchId" = m.id
    LEFT JOIN match_payloads mp ON mp."sourceMatchId" = m."gamersClubMatchId"
    GROUP BY s.name
    ORDER BY MIN(s."startDate")
  `);

  // Partidas sem gamersClubMatchId (não podem ser identificadas por chave natural)
  const noGcId = await q(`
    SELECT COUNT(*)::text as count FROM "Match" WHERE "gamersClubMatchId" IS NULL
  `);

  console.log("\n  ==========================================");
  console.log("  AUDITORIA DE ANALYTICS — NEON");
  console.log("  ==========================================\n");
  console.log(`  Total de partidas no Neon: ${total}`);
  console.log(`  Partidas sem gamersClubMatchId: ${noGcId}\n`);

  console.log(
    "  " +
      "Entidade".padEnd(22) +
      "Partidas com dados".padStart(20) +
      "  Cobertura",
  );
  console.log("  " + "-".repeat(52));

  const show = (label: string, n: number) => {
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "—";
    const flag = n === -1 ? "  (tabela inexistente)" : "";
    const display = n === -1 ? "N/A" : `${n} / ${total}`;
    console.log(
      `  ${label.padEnd(22)}${display.padStart(20)}  ${n === -1 ? "—" : pct + "%"}${flag}`,
    );
  };

  show("MatchPayload", withPayload);
  show("PlayerMatchStats", withStats);
  show("PlayerMatchup", withMatchup);
  show("PlayerClutch", withClutch);
  show("PlayerEntryDuel", withEntry);
  show("PlayerTradeEvent", withTrade);
  show("PlayerAchievement", withAchievement);

  console.log("\n  --- Por temporada ---\n");
  console.log(
    "  " +
      "Temporada".padEnd(16) +
      "Total".padStart(7) +
      "  c/ Stats".padStart(10) +
      "  c/ Payload".padStart(12),
  );
  console.log("  " + "-".repeat(50));
  for (const s of seasons) {
    console.log(
      `  ${s.name.padEnd(16)}${String(s.total).padStart(7)}  ${String(s.with_stats).padStart(10)}  ${String(s.with_payload).padStart(12)}`,
    );
  }

  console.log("");
  await client.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
