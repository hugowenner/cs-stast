/**
 * _fix-agosto-season.ts
 * Corrige Agosto/2026 de ACTIVE para CLOSED no DEV local.
 * Somente leitura se DRY_RUN=true (default).
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const DEV_URL =
  process.env.DATABASE_URL ??
  "postgresql://cs2stats_dev:dev_only_cs2stats_2026@localhost:5432/cs2_stats_dev";

const DRY_RUN = process.env.DRY_RUN !== "false";

const c = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DEV_URL }),
}) as unknown as {
  $queryRawUnsafe<T>(sql: string): Promise<T[]>;
  $disconnect(): Promise<void>;
};

// acesso dinâmico ao modelo season
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = c as any;

async function main() {
  // Confirmar estado atual
  const seasons = await c.$queryRawUnsafe<{
    id: string; name: string; status: string; endDate: string; match_count: number;
  }>(`
    SELECT s.id, s.name, s.status, s."endDate"::text,
           COUNT(m.id)::int AS match_count
    FROM "Season" s LEFT JOIN "Match" m ON m."seasonId" = s.id
    GROUP BY s.id ORDER BY s."startDate"
  `);

  const activeSeasons = seasons.filter((s) => s.status === "ACTIVE");

  console.log("\n  Estado atual das seasons:");
  for (const s of seasons) {
    console.log(`    ${s.status.padEnd(6)}  ${s.name}  (${s.match_count} partidas)`);
  }

  console.log(`\n  Seasons com status ACTIVE: ${activeSeasons.length}`);
  if (activeSeasons.length <= 1) {
    console.log("  Nenhuma correcao necessaria — apenas 1 ACTIVE.");
    await c.$disconnect();
    return;
  }

  // Identificar Agosto/2026 como a ACTIVE incorreta
  // Regra: a ACTIVE com endDate no passado deve ser fechada
  const today = new Date();
  const toClose = activeSeasons.filter((s) => new Date(s.endDate) < today);

  if (toClose.length === 0) {
    console.log("  Todas as seasons ACTIVE ainda estao dentro do prazo. Nenhuma correcao.");
    await c.$disconnect();
    return;
  }

  for (const season of toClose) {
    console.log(`\n  Season a corrigir: ${season.name}`);
    console.log(`    id:       ${season.id}`);
    console.log(`    status:   ${season.status} -> CLOSED`);
    console.log(`    endDate:  ${season.endDate.slice(0, 10)} (expirada)`);
    console.log(`    partidas: ${season.match_count}`);

    if (DRY_RUN) {
      console.log("\n  DRY RUN — nenhuma alteracao foi feita.");
      console.log("  Execute com DRY_RUN=false para aplicar.");
    } else {
      await prisma.season.update({
        where: { id: season.id },
        data: { status: "CLOSED" },
      });
      console.log(`\n  OK: ${season.name} atualizada para CLOSED.`);
    }
  }

  // Verificar estado final
  const after = await c.$queryRawUnsafe<{ name: string; status: string }>(`
    SELECT name, status FROM "Season" ORDER BY "startDate"
  `);
  console.log("\n  Estado das seasons" + (DRY_RUN ? " (sem alteracoes — dry run)" : " apos correcao") + ":");
  for (const s of after) {
    console.log(`    ${s.status.padEnd(6)}  ${s.name}`);
  }

  await c.$disconnect();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
