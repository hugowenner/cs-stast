/**
 * Copia dados do PostgreSQL da VPS (via SSH tunnel em localhost:5433) para o PostgreSQL
 * DEV local (localhost:5432). Ambos os lados usam Prisma Client com adapter PrismaPg.
 * IDs são preservados. Insere na ordem de dependência de foreign key.
 *
 * Modelos copiados (ordem de FK): Map, Player, TrackedPlayer, Season, Session, Match,
 * PlayerMatchStats, Achievement, PlayerAchievement, Rivalry.
 * Não copiados (por decisão explícita): Event, Import, Log, Configuration, User.
 *
 * VPS é somente leitura — nenhuma escrita no source em nenhum momento.
 * DEV é truncado e reconstruído com os dados da VPS.
 *
 * Uso: chamado por `npm run db:sync-pg`, que é chamado por sync-db-from-vps.ps1.
 * Variáveis de ambiente esperadas:
 *   VPS_DATABASE_URL  — postgresql://user:pass@localhost:5433/db  (tunnel já aberto)
 *   DATABASE_URL      — postgresql://user:pass@localhost:5432/db  (DEV Docker local)
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const BATCH_SIZE = 500;

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

// Ordem reversa para TRUNCATE — filho antes do pai
const MODELS_REVERSE = [...MODELS_IN_ORDER].reverse();

type ModelName = (typeof MODELS_IN_ORDER)[number];
type AnyClient = Record<
  ModelName,
  {
    count: () => Promise<number>;
    findMany: () => Promise<Record<string, unknown>[]>;
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
    deleteMany: () => Promise<unknown>;
  }
>;

function redactUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

function requirePostgresUrl(url: string, label: string): void {
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      `${label} não é uma URL PostgreSQL (valor: "${url.slice(0, 20)}..."). ` +
        `Este script requer PostgreSQL nos dois lados — abortando.`,
    );
  }
}

function requireDifferentHosts(sourceUrl: string, targetUrl: string): void {
  // Extrai host:port de cada URL para garantir que não são o mesmo banco
  const extractHostPort = (url: string) => {
    const match = url.match(/@([^/]+)\//);
    return match?.[1] ?? url;
  };
  const srcHost = extractHostPort(sourceUrl);
  const tgtHost = extractHostPort(targetUrl);
  if (srcHost === tgtHost) {
    throw new Error(
      `Source e target apontam para o mesmo host (${srcHost}). ` +
        `Isso truncaria a VPS — abortando imediatamente.`,
    );
  }
}

function requireDevTarget(targetUrl: string): void {
  // Valida que o target é o DEV local — deve ser localhost:5432
  if (!targetUrl.includes("localhost:5432") && !targetUrl.includes("127.0.0.1:5432")) {
    throw new Error(
      `TARGET (DATABASE_URL) não aponta para localhost:5432. ` +
        `Valor detectado: "${redactUrl(targetUrl)}". ` +
        `Somente o DEV Docker local (localhost:5432) é permitido como destino — abortando.`,
    );
  }
}

function requireVpsSource(sourceUrl: string): void {
  // Valida que o source vem pelo tunnel (localhost:5433)
  if (!sourceUrl.includes("localhost:5433") && !sourceUrl.includes("127.0.0.1:5433")) {
    throw new Error(
      `VPS_DATABASE_URL não aponta para localhost:5433. ` +
        `Valor detectado: "${redactUrl(sourceUrl)}". ` +
        `O source deve vir via SSH tunnel em :5433 — abortando.`,
    );
  }
}

async function countAll(client: AnyClient): Promise<Record<ModelName, number>> {
  const counts = {} as Record<ModelName, number>;
  for (const model of MODELS_IN_ORDER) {
    counts[model] = await client[model].count();
  }
  return counts;
}

async function copyModel(
  model: ModelName,
  source: AnyClient,
  target: AnyClient,
): Promise<number> {
  const rows = await source[model].findMany();
  if (rows.length === 0) {
    console.log(`  [sync] ${model}: 0 linhas na VPS, pulando.`);
    return 0;
  }
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await target[model].createMany({ data: batch });
  }
  console.log(`  [sync] ${model}: ${rows.length} linhas copiadas.`);
  return rows.length;
}

async function main() {
  const sourceUrl = process.env.VPS_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  // ── Validações de segurança ────────────────────────────────────────────────

  if (!sourceUrl) {
    throw new Error("VPS_DATABASE_URL não está definida. Defina o source (VPS via tunnel).");
  }
  if (!targetUrl) {
    throw new Error("DATABASE_URL não está definida. Defina o target (DEV PostgreSQL local).");
  }

  requirePostgresUrl(sourceUrl, "VPS_DATABASE_URL (source/VPS)");
  requirePostgresUrl(targetUrl, "DATABASE_URL (target/DEV)");
  requireVpsSource(sourceUrl);
  requireDevTarget(targetUrl);
  requireDifferentHosts(sourceUrl, targetUrl);

  console.log("\n  === Sync VPS PostgreSQL → DEV PostgreSQL ===\n");
  console.log(`  Source (VPS via tunnel): ${redactUrl(sourceUrl)}`);
  console.log(`  Target (DEV local):      ${redactUrl(targetUrl)}`);
  console.log("  VPS é somente leitura. Nenhuma escrita na VPS em nenhum momento.\n");

  const source = new PrismaClient({
    adapter: new PrismaPg({ connectionString: sourceUrl }),
  }) as unknown as AnyClient;

  const target = new PrismaClient({
    adapter: new PrismaPg({ connectionString: targetUrl }),
  }) as unknown as AnyClient;

  try {
    // ── Sanity check: VPS tem dados? ──────────────────────────────────────────

    console.log("  Verificando dados na VPS...");
    const vpsCounts = await countAll(source);
    const totalVps = Object.values(vpsCounts).reduce((a, b) => a + b, 0);

    if (totalVps === 0) {
      throw new Error(
        "A VPS está completamente vazia — nenhum dado encontrado. Abortando por segurança.",
      );
    }

    console.log("\n  Contagens na VPS (source):");
    for (const [model, count] of Object.entries(vpsCounts)) {
      console.log(`    ${model.padEnd(20)} ${count}`);
    }

    // ── Truncate DEV em ordem reversa de FK ────────────────────────────────────

    console.log("\n  Limpando DEV (truncate em ordem reversa de FK)...");
    for (const model of MODELS_REVERSE) {
      await target[model].deleteMany();
      console.log(`  [truncate] ${model}: ok`);
    }

    // ── Cópia modelo a modelo em ordem de FK ──────────────────────────────────

    console.log("\n  Copiando dados da VPS para o DEV...");
    const imported = {} as Record<ModelName, number>;
    for (const model of MODELS_IN_ORDER) {
      imported[model] = await copyModel(model, source, target);
    }

    // ── Verificação final de contagens ────────────────────────────────────────

    console.log("\n  Verificando contagens finais...");
    const devCounts = await countAll(target);
    const mismatches = MODELS_IN_ORDER.filter((m) => vpsCounts[m] !== devCounts[m]);

    console.log("\n  Resultado da sincronização:");
    console.log(`  ${"Modelo".padEnd(22)} ${"VPS".padStart(6)}   ${"DEV".padStart(6)}   Status`);
    console.log(`  ${"-".repeat(50)}`);
    for (const model of MODELS_IN_ORDER) {
      const ok = vpsCounts[model] === devCounts[model] ? "✓" : "✗ DIVERGÊNCIA";
      console.log(
        `  ${model.padEnd(22)} ${String(vpsCounts[model]).padStart(6)}   ${String(devCounts[model]).padStart(6)}   ${ok}`,
      );
    }

    if (mismatches.length > 0) {
      console.error(
        `\n  ✗ Divergência detectada em: ${mismatches.join(", ")}`,
      );
      process.exitCode = 1;
    } else {
      console.log("\n  ✓ Todas as contagens batem. DEV está sincronizado com a VPS.");
    }
  } finally {
    await (source as unknown as { $disconnect: () => Promise<void> }).$disconnect();
    await (target as unknown as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("\n  Falha na sincronização:", err.message ?? err);
  process.exitCode = 1;
});
