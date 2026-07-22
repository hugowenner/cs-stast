/**
 * Migração one-off SQLite (prisma/dev.db) -> Postgres/Neon (DATABASE_URL do .env).
 *
 * Lê via o Prisma Client do SQLite e escreve via o Prisma Client do Postgres —
 * evita conversão manual de tipos (Boolean/DateTime/Json divergem entre os dois
 * drivers), o Prisma já normaliza isso na leitura e na escrita. IDs são preservados
 * (já são cuid() de origem, nunca gerados de novo). Insere na ordem de dependência
 * de foreign key. Aborta sem escrever nada se o destino já tiver qualquer linha.
 *
 * Uso: npm run db:migrate-to-postgres
 */
import "dotenv/config";
import path from "node:path";
import { PrismaClient as SqliteClient } from "@/generated/prisma-sqlite";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient as PostgresClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BATCH_SIZE = 500;

// Ordem respeita todas as foreign keys do schema — pai sempre antes do filho.
const MODELS_IN_ORDER = [
  "player",
  "map",
  "session",
  "achievement",
  "import",
  "log",
  "configuration",
  "user",
  "trackedPlayer",
  "match",
  "playerMatchStats",
  "event",
  "playerAchievement",
  "rivalry",
] as const;

type ModelName = (typeof MODELS_IN_ORDER)[number];

function redactUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

async function countAll(client: Record<ModelName, { count: () => Promise<number> }>) {
  const counts = {} as Record<ModelName, number>;
  for (const model of MODELS_IN_ORDER) {
    counts[model] = await client[model].count();
  }
  return counts;
}

async function assertTargetIsEmpty(
  postgres: Record<ModelName, { count: () => Promise<number> }>,
) {
  const counts = await countAll(postgres);
  const nonEmpty = Object.entries(counts).filter(([, n]) => n > 0);
  if (nonEmpty.length > 0) {
    throw new Error(
      `Abortando: o destino (Neon) já tem dados em ${nonEmpty
        .map(([m, n]) => `${m}=${n}`)
        .join(", ")}. Este script só roda contra um banco vazio, para não duplicar.`,
    );
  }
}

async function copyModel(
  model: ModelName,
  sqlite: Record<ModelName, { findMany: () => Promise<unknown[]> }>,
  postgres: Record<ModelName, { createMany: (args: { data: unknown[] }) => Promise<unknown> }>,
): Promise<number> {
  const rows = await sqlite[model].findMany();
  if (rows.length === 0) {
    console.log(`[migrate] ${model}: 0 linhas, pulando.`);
    return 0;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await postgres[model].createMany({ data: batch });
  }

  console.log(`[migrate] ${model}: ${rows.length} linhas copiadas.`);
  return rows.length;
}

async function main() {
  const postgresUrl = process.env.DATABASE_URL;
  if (!postgresUrl) {
    throw new Error("DATABASE_URL não está definida — deve apontar para o Neon.");
  }

  console.log("=== Migração SQLite -> Postgres (Neon) ===");
  console.log(`Origem:  ${SQLITE_PATH}`);
  console.log(`Destino: ${redactUrl(postgresUrl)}`);

  const sqlite = new SqliteClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${SQLITE_PATH}` }),
  }) as unknown as Record<ModelName, { findMany: () => Promise<unknown[]>; count: () => Promise<number> }>;

  const postgres = new PostgresClient({
    adapter: new PrismaPg({ connectionString: postgresUrl }),
  }) as unknown as Record<
    ModelName,
    { createMany: (args: { data: unknown[] }) => Promise<unknown>; count: () => Promise<number> }
  >;

  try {
    await assertTargetIsEmpty(postgres);

    const beforeCounts = await countAll(sqlite);
    console.log("\nContagens de origem (SQLite):");
    console.table(beforeCounts);

    for (const model of MODELS_IN_ORDER) {
      await copyModel(model, sqlite, postgres);
    }

    const afterCounts = await countAll(postgres);
    console.log("\nContagens de destino (Neon) após a migração:");
    console.table(afterCounts);

    const mismatches = MODELS_IN_ORDER.filter((m) => beforeCounts[m] !== afterCounts[m]);
    if (mismatches.length > 0) {
      console.error(
        "\n❌ DIVERGÊNCIA em:",
        mismatches.map((m) => `${m} (origem=${beforeCounts[m]}, destino=${afterCounts[m]})`).join(", "),
      );
      process.exitCode = 1;
    } else {
      console.log("\n✅ Todas as contagens batem entre origem e destino.");
    }
  } finally {
    await (sqlite as unknown as { $disconnect: () => Promise<void> }).$disconnect();
    await (postgres as unknown as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("Falha na migração:", err);
  process.exitCode = 1;
});
