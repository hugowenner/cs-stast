/**
 * Copia um snapshot real do Neon (Postgres, produção) para o banco de demo local
 * (prisma/dev.db, SQLite). Lê via o Prisma Client do Postgres e escreve via o Prisma
 * Client do SQLite — mesmo padrão de scripts/migrate-to-postgres.ts (direção oposta),
 * evita conversão manual de tipos (Boolean/DateTime/Json divergem entre os dois
 * drivers). IDs são preservados (cuid() de origem, nunca gerados de novo). Insere na
 * ordem de dependência de foreign key.
 *
 * Não roda prisma/seed.ts: Map, Achievement e TrackedPlayer aqui são os dados REAIS do
 * Neon, não o catálogo fixo do seed — rodar o seed depois deste script sobrescreveria
 * TrackedPlayer.active real com a lista hardcoded do seed. Não é um dump SQL: tudo passa
 * pelo Prisma Client (objetos TypeScript), sem sql bruto.
 *
 * Modelos copiados (ordem de FK): Map, Player, TrackedPlayer, Season, Session, Match,
 * PlayerMatchStats, Achievement, PlayerAchievement, Rivalry.
 * TrackedPlayer foi adicionado à lista original — sem ele o Dashboard não teria
 * nenhum "jogador monitorado" (toda a leitura do Dashboard filtra por
 * trackedPlayer.active). Não copiados (por decisão explícita): Event, Import, Log,
 * Configuration, User.
 *
 * Só escreve no SQLite local — nenhuma escrita no Neon em nenhum momento.
 *
 * Uso: npx tsx scripts/demo/snapshot-from-neon.ts (chamado por `npm run demo:snapshot`,
 * que já prepara o SQLite antes de rodar isto).
 */
import "dotenv/config";
import path from "node:path";
import { PrismaClient as PostgresClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as SqliteClient } from "@/generated/prisma-sqlite";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BATCH_SIZE = 500;

// Ordem respeita todas as foreign keys do schema — pai sempre antes do filho.
// Season precisa vir antes de Match (Match.seasonId → Season.id) e antes de
// Rivalry (Rivalry.seasonId → Season.id, opcional mas validado pelo SQLite).
const MODELS_IN_ORDER = [
  "map",
  "player",
  "trackedPlayer",
  "season",
  "session",
  "match",
  "playerMatchStats",
  "achievement",
  "playerAchievement",
  "rivalry",
] as const;

type ModelName = (typeof MODELS_IN_ORDER)[number];

type CountableClient = Record<ModelName, { count: () => Promise<number> }>;
type ReadableClient = Record<ModelName, { findMany: () => Promise<Record<string, unknown>[]> }>;
type WritableClient = Record<
  ModelName,
  { createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown> }
>;

function redactUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

async function countAll(client: CountableClient) {
  const counts = {} as Record<ModelName, number>;
  for (const model of MODELS_IN_ORDER) {
    counts[model] = await client[model].count();
  }
  return counts;
}

async function assertTargetIsEmpty(sqlite: CountableClient) {
  const counts = await countAll(sqlite);
  const nonEmpty = Object.entries(counts).filter(([, n]) => n > 0);
  if (nonEmpty.length > 0) {
    throw new Error(
      `Abortando: prisma/dev.db já tem dados em ${nonEmpty
        .map(([m, n]) => `${m}=${n}`)
        .join(", ")}. Rode \`npm run demo:snapshot\` do zero (ele já limpa o dev.db antes) ` +
        `em vez de chamar este script diretamente contra um banco existente.`,
    );
  }
}

async function copyModel(model: ModelName, source: ReadableClient, target: WritableClient): Promise<number> {
  const rows = await source[model].findMany();
  if (rows.length === 0) {
    console.log(`[snapshot] ${model}: 0 linhas no Neon, pulando.`);
    return 0;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await target[model].createMany({ data: batch });
  }

  console.log(`[snapshot] ${model}: ${rows.length} linhas copiadas.`);
  return rows.length;
}

async function main() {
  const neonUrl = process.env.DATABASE_URL;
  if (!neonUrl) {
    throw new Error("DATABASE_URL não está definida — deve apontar para o Neon (origem).");
  }
  if (!/^postgres(ql)?:\/\//.test(neonUrl)) {
    throw new Error(
      `DATABASE_URL não parece ser uma URL Postgres (valor atual começa com "${neonUrl.slice(0, 12)}..."). ` +
        `Este script lê do Neon — abortando para não copiar do lugar errado.`,
    );
  }

  console.log("=== Snapshot Neon (Postgres) -> Demo local (SQLite) ===");
  console.log(`Origem:  ${redactUrl(neonUrl)}`);
  console.log(`Destino: ${SQLITE_PATH}`);
  console.log("Leitura no Neon, escrita apenas no SQLite local. Nenhuma escrita no Neon.\n");

  const postgres = new PostgresClient({
    adapter: new PrismaPg({ connectionString: neonUrl }),
  }) as unknown as ReadableClient & CountableClient;

  const sqlite = new SqliteClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${SQLITE_PATH}` }),
  }) as unknown as WritableClient & CountableClient;

  try {
    await assertTargetIsEmpty(sqlite);

    const neonCounts = await countAll(postgres);
    console.log("Contagens de origem (Neon):");
    console.table(neonCounts);

    const imported = {} as Record<ModelName, number>;
    for (const model of MODELS_IN_ORDER) {
      imported[model] = await copyModel(model, postgres, sqlite);
    }

    const sqliteCounts = await countAll(sqlite);
    const mismatches = MODELS_IN_ORDER.filter((m) => neonCounts[m] !== sqliteCounts[m]);

    console.log("\nSnapshot concluído");
    console.log("Quantidade importada:");
    console.log(`  Players: ${imported.player}`);
    console.log(`  Matches: ${imported.match}`);
    console.log(`  PlayerMatchStats: ${imported.playerMatchStats}`);
    console.log(`  Rivalries: ${imported.rivalry}`);
    console.log(`  Achievements: ${imported.achievement}`);
    console.log(`  (extra) Maps: ${imported.map}, Seasons: ${imported.season}, Sessions: ${imported.session}, ` +
      `TrackedPlayers: ${imported.trackedPlayer}, PlayerAchievements: ${imported.playerAchievement}`);

    if (mismatches.length > 0) {
      console.error(
        "\n❌ DIVERGÊNCIA entre Neon e SQLite em:",
        mismatches.map((m) => `${m} (neon=${neonCounts[m]}, sqlite=${sqliteCounts[m]})`).join(", "),
      );
      process.exitCode = 1;
    } else {
      console.log("\n✅ Todas as contagens batem entre Neon e o snapshot local.");
    }
  } finally {
    await (postgres as unknown as { $disconnect: () => Promise<void> }).$disconnect();
    await (sqlite as unknown as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("Falha no snapshot:", err);
  process.exitCode = 1;
});
