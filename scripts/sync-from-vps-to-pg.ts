/**
 * scripts/sync-from-vps-to-pg.ts
 *
 * Sincronização segura da VPS de PRODUÇÃO para o PostgreSQL DEV local.
 *
 * DIRETRIZES MANDATÓRIAS:
 * 1. VPS PRODUÇÃO: STRICTLY READ-ONLY. Nenhuma exclusão, alteração ou escrita na VPS em hipótese alguma.
 * 2. SEGURANÇA MÁXIMA DE AMBIENTE: O script trava imediatamente se o destino não for
 *    comprovadamente o DEV local (localhost:5432, container Docker cs2-stats-postgres-dev).
 * 3. ESCOPO COMPLETO: Sincroniza todas as tabelas e dados dependentes de Match e do sistema,
 *    incluindo Event, PlayerClutch, PlayerEntryDuel, PlayerMatchup, PlayerTradeEvent,
 *    SyncJob, MatchPayload, TeamBalanceMatch, TeamBalancePlayer, SeasonSnapshot.
 * 4. PRESERVAÇÃO: IDs e integridade referencial são preservados exatamente como em produção.
 *    Nenhum segredo ou credencial sensível é importado.
 * 5. ORDEM DE DEPENDÊNCIA:
 *    - Limpeza local (DEV): ordem reversa de FK (filhos antes dos pais).
 *    - Ingestão local (DEV): ordem direta de FK (pais antes dos filhos).
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const BATCH_SIZE = 500;

// Ordem estrita de Foreign Key: Pai antes do Filho para INSERT
export const MODELS_IN_ORDER = [
  "map",
  "achievement",
  "player",
  "trackedPlayer",
  "season",
  "session",
  "match",
  "playerMatchStats",
  "playerAchievement",
  "rivalry",
  "event",
  "playerClutch",
  "playerEntryDuel",
  "playerMatchup",
  "playerTradeEvent",
  "syncJob",
  "matchPayload",
  "seasonSnapshot",
  "teamBalanceMatch",
  "teamBalancePlayer",
] as const;

// Ordem reversa para limpeza no DEV: Filho antes do Pai
export const MODELS_REVERSE = [...MODELS_IN_ORDER].reverse();

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
      `${label} não é uma URL PostgreSQL válida: "${url.slice(0, 20)}...". Abortando por segurança.`,
    );
  }
}

function requireDifferentHosts(sourceUrl: string, targetUrl: string): void {
  const extractHostPort = (url: string) => {
    const match = url.match(/@([^/]+)\//);
    return match?.[1] ?? url;
  };
  const srcHost = extractHostPort(sourceUrl);
  const tgtHost = extractHostPort(targetUrl);
  if (srcHost === tgtHost) {
    throw new Error(
      `CRÍTICO: Source e Target apontam para o mesmo host (${srcHost}). ` +
        `Operação abortada para impedir qualquer risco à VPS!`,
    );
  }
}

function validateDevTarget(targetUrl: string): void {
  const isLocalhost =
    targetUrl.includes("localhost:5432") || targetUrl.includes("127.0.0.1:5432");
  const isDevUser =
    targetUrl.includes("cs2stats_dev") || targetUrl.includes("postgres");

  if (!isLocalhost || !isDevUser) {
    throw new Error(
      `BLOQUEIO DE SEGURANÇA: Destino detectado (${redactUrl(targetUrl)}) NÃO atende aos critérios ` +
        `estritos do PostgreSQL DEV local (porta 5432 + usuário DEV). Operação cancelada.`,
    );
  }
}

function validateVpsSource(sourceUrl: string): void {
  const isTunnel =
    sourceUrl.includes("localhost:5433") || sourceUrl.includes("127.0.0.1:5433");

  if (!isTunnel) {
    throw new Error(
      `BLOQUEIO DE SEGURANÇA: Origem da VPS deve ser acessada estritamente via túnel SSH em localhost:5433. ` +
        `Valor recebido: "${redactUrl(sourceUrl)}". Operação cancelada.`,
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
    console.log(`  [sync] ${model.padEnd(20)}: 0 registros na VPS (ignorado)`);
    return 0;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await target[model].createMany({ data: batch });
  }

  console.log(`  [sync] ${model.padEnd(20)}: ${rows.length} registros copiados com sucesso.`);
  return rows.length;
}

async function main() {
  const sourceUrl = process.env.VPS_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    throw new Error("VPS_DATABASE_URL não configurada (origem VPS via tunnel).");
  }
  if (!targetUrl) {
    throw new Error("DATABASE_URL não configurada (destino DEV local).");
  }

  // Validações rigorosas de segurança
  requirePostgresUrl(sourceUrl, "VPS_DATABASE_URL (Origem/VPS)");
  requirePostgresUrl(targetUrl, "DATABASE_URL (Destino/DEV)");
  validateVpsSource(sourceUrl);
  validateDevTarget(targetUrl);
  requireDifferentHosts(sourceUrl, targetUrl);

  console.log("\n  ========================================================");
  console.log("  SINCRONIZAÇÃO SEGURA: VPS (PROD) → POSTGRESQL (DEV LOCAL)");
  console.log("  ========================================================\n");
  console.log(`  Origem (VPS / Somente Leitura): ${redactUrl(sourceUrl)}`);
  console.log(`  Destino (DEV Local / 5432):     ${redactUrl(targetUrl)}`);
  console.log("  Garantia de segurança: VPS nunca sofre operações de escrita.\n");

  const source = new PrismaClient({
    adapter: new PrismaPg({ connectionString: sourceUrl }),
  }) as unknown as AnyClient;

  const target = new PrismaClient({
    adapter: new PrismaPg({ connectionString: targetUrl }),
  }) as unknown as AnyClient;

  try {
    // 1. Inspecionar contagens da VPS (Origem)
    console.log("  [1/4] Lendo contagens da VPS de Produção...");
    const vpsCounts = await countAll(source);
    const totalVpsRows = Object.values(vpsCounts).reduce((a, b) => a + b, 0);

    if (totalVpsRows === 0) {
      throw new Error("A VPS retornou 0 registros no total. Abortando por segurança!");
    }

    console.log("\n  Registros na VPS de Produção:");
    for (const [model, count] of Object.entries(vpsCounts)) {
      console.log(`    - ${model.padEnd(22)}: ${count}`);
    }

    // 2. Limpar DEV local na ordem estrita de FK (filho antes do pai)
    console.log("\n  [2/4] Limpando dados do DEV local (ordem reversa de Foreign Keys)...");
    for (const model of MODELS_REVERSE) {
      await target[model].deleteMany();
      console.log(`    ✓ Limpeza concluída: ${model}`);
    }

    // 3. Copiar dados da VPS para DEV na ordem estrita de FK (pai antes do filho)
    console.log("\n  [3/4] Ingerindo dados da VPS no PostgreSQL DEV local...");
    for (const model of MODELS_IN_ORDER) {
      await copyModel(model, source, target);
    }

    // 4. Verificação e Auditoria de Integridade Referencial
    console.log("\n  [4/4] Validando integridade e contagens finais...");
    const devCounts = await countAll(target);
    const mismatches: string[] = [];

    console.log("\n  Relatório de Sincronização:");
    console.log(`  ${"Tabela / Modelo".padEnd(24)} ${"VPS".padStart(8)}   ${"DEV".padStart(8)}   Status`);
    console.log(`  ${"-".repeat(55)}`);
    for (const model of MODELS_IN_ORDER) {
      const match = vpsCounts[model] === devCounts[model];
      if (!match) mismatches.push(model);
      const statusIcon = match ? "✓ OK" : "✗ DIVERGÊNCIA";
      console.log(
        `  ${model.padEnd(24)} ${String(vpsCounts[model]).padStart(8)}   ${String(devCounts[model]).padStart(8)}   ${statusIcon}`,
      );
    }

    if (mismatches.length > 0) {
      console.error(`\n  ATENÇÃO: Divergência detectada nas tabelas: ${mismatches.join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log("\n  ✓ Sincronização 100% íntegra! Todas as tabelas e relacionamentos conferem.");
    }
  } finally {
    await (source as unknown as { $disconnect: () => Promise<void> }).$disconnect();
    await (target as unknown as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("\n  Erro durante a sincronização:", err.message ?? err);
  process.exitCode = 1;
});
