/**
 * sync-dev-to-vps.ts
 * Sincronizacao aditiva DEV local -> VPS producao.
 * SOURCE: DATABASE_URL (DEV localhost:5432)
 * TARGET: VPS_DATABASE_URL (VPS via SSH tunnel localhost:5433)
 *
 * Modo DRY_RUN=true (default): apenas compara, nao escreve.
 * Modo DRY_RUN=false: importacao aditiva (skipDuplicates, sem TRUNCATE).
 *
 * Segurancas:
 *  - TARGET deve ser localhost:5433 (SSH tunnel VPS)
 *  - SOURCE deve ser localhost:5432 (DEV Docker)
 *  - Hosts diferentes obrigatorio
 *  - Nenhuma escrita no SOURCE em nenhum momento
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

type AnyPrisma = Record<string, {
  count: (args?: object) => Promise<number>;
  findMany: (args?: object) => Promise<Record<string, unknown>[]>;
  createMany: (args: { data: Record<string, unknown>[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
}>;

const DRY_RUN = process.env.DRY_RUN !== "false";
const BATCH_SIZE = 500;

// Ordem de FK: pai antes do filho
const MODELS_IN_ORDER = [
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
  "syncJob",
  "matchPayload",
  "playerMatchup",
  "playerClutch",
  "playerEntryDuel",
  "playerTradeEvent",
] as const;

type ModelName = (typeof MODELS_IN_ORDER)[number];

function redactUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

function requirePostgres(url: string, label: string): void {
  if (!/^postgres(ql)?:\/\//.test(url))
    throw new Error(`${label} nao e uma URL PostgreSQL: "${url.slice(0, 30)}"`);
}

function requireSourceDev(url: string): void {
  if (!url.includes("localhost:5432") && !url.includes("127.0.0.1:5432"))
    throw new Error(
      `SOURCE (DATABASE_URL) deve ser localhost:5432 (DEV Docker). Detectado: "${redactUrl(url)}"`
    );
}

function requireTargetVpsTunnel(url: string): void {
  if (!url.includes("localhost:5433") && !url.includes("127.0.0.1:5433"))
    throw new Error(
      `TARGET (VPS_DATABASE_URL) deve ser localhost:5433 (SSH tunnel VPS). Detectado: "${redactUrl(url)}"`
    );
}

function requireDifferentHosts(src: string, tgt: string): void {
  const host = (u: string) => u.match(/@([^/]+)\//)?.[1] ?? u;
  if (host(src) === host(tgt))
    throw new Error("SOURCE e TARGET apontam para o mesmo host — abortando.");
}

function makeClient(url: string): AnyPrisma {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  }) as unknown as AnyPrisma;
}

async function countAll(c: AnyPrisma): Promise<Record<ModelName, number>> {
  const counts = {} as Record<ModelName, number>;
  for (const m of MODELS_IN_ORDER) {
    try {
      counts[m] = await c[m].count();
    } catch {
      counts[m] = -1; // modelo nao existe no schema da VPS
    }
  }
  return counts;
}

// Retorna IDs presentes no banco como Set<string>
async function getIds(c: AnyPrisma, model: ModelName): Promise<Set<string>> {
  try {
    const rows = await c[model].findMany({ select: { id: true } } as object);
    return new Set((rows as { id: string }[]).map((r) => r.id));
  } catch {
    return new Set();
  }
}

async function insertBatch(
  tgt: AnyPrisma,
  model: ModelName,
  rows: Record<string, unknown>[]
): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await tgt[model].createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
  }
  return inserted;
}

async function main() {
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = process.env.VPS_DATABASE_URL;

  if (!sourceUrl) throw new Error("DATABASE_URL nao definida (source DEV).");
  if (!targetUrl) throw new Error("VPS_DATABASE_URL nao definida (target VPS via tunnel).");

  requirePostgres(sourceUrl, "DATABASE_URL");
  requirePostgres(targetUrl, "VPS_DATABASE_URL");
  requireSourceDev(sourceUrl);
  requireTargetVpsTunnel(targetUrl);
  requireDifferentHosts(sourceUrl, targetUrl);

  console.log("\n  === Sync DEV -> VPS (producao) ===\n");
  console.log(`  SOURCE (DEV):     ${redactUrl(sourceUrl)}`);
  console.log(`  TARGET (VPS):     ${redactUrl(targetUrl)}`);
  console.log(`  MODO:             ${DRY_RUN ? "DRY RUN (sem alteracoes)" : "IMPORTACAO REAL"}`);
  console.log("  SOURCE e somente leitura. Nenhuma escrita no DEV.\n");

  const src = makeClient(sourceUrl);
  const tgt = makeClient(targetUrl);

  try {
    // ── Contagens atuais ──────────────────────────────────────────────────────
    console.log("  Lendo contagens...\n");
    const devCounts  = await countAll(src);
    const vpsCounts  = await countAll(tgt);

    console.log(
      `  ${"Modelo".padEnd(22)} ${"DEV".padStart(8)} ${"VPS".padStart(8)} ${"Somente DEV".padStart(12)} ${"Somente VPS".padStart(12)}`
    );
    console.log(`  ${"-".repeat(68)}`);

    const importPlan: Record<ModelName, number> = {} as Record<ModelName, number>;
    let totalOnlyDev = 0;
    let totalOnlyVps = 0;
    let totalConflicts = 0;

    // Para cada modelo, calcular somente-DEV vs somente-VPS
    const onlyDevRows: Record<ModelName, Record<string, unknown>[]> = {} as Record<ModelName, Record<string, unknown>[]>;
    const conflicts: { model: string; count: number }[] = [];

    for (const m of MODELS_IN_ORDER) {
      const dCount = devCounts[m] ?? 0;
      const vCount = vpsCounts[m] === -1 ? 0 : (vpsCounts[m] ?? 0);

      // Buscar IDs dos dois lados para calcular diferencas
      const devIds = await getIds(src, m);
      const vpsIds = await getIds(tgt, m);

      const onlyDev = [...devIds].filter((id) => !vpsIds.has(id));
      const onlyVps = [...vpsIds].filter((id) => !devIds.has(id));
      const both = [...devIds].filter((id) => vpsIds.has(id));

      importPlan[m] = onlyDev.length;
      totalOnlyDev += onlyDev.length;
      totalOnlyVps += onlyVps.length;
      totalConflicts += both.length;

      const flag = onlyDev.length > 0 ? " <-- importar" : "";
      console.log(
        `  ${m.padEnd(22)} ${String(dCount).padStart(8)} ${String(vCount === -1 ? "N/A" : vCount).padStart(8)} ${String(onlyDev.length).padStart(12)} ${String(onlyVps.length).padStart(12)}${flag}`
      );

      // Guardar linhas somente-DEV para importacao posterior
      if (onlyDev.length > 0) {
        try {
          onlyDevRows[m] = await src[m].findMany({
            where: { id: { in: onlyDev } },
          } as object);
        } catch {
          // Fallback: findMany sem filtro se o modelo nao suporta where.id
          const all = await src[m].findMany();
          onlyDevRows[m] = (all as { id: string }[]).filter((r) => onlyDev.includes(r.id));
        }
      } else {
        onlyDevRows[m] = [];
      }

      if (both.length > 0) {
        conflicts.push({ model: m, count: both.length });
      }
    }

    console.log(`\n  ${"TOTAL".padEnd(22)} ${"—".padStart(8)} ${"—".padStart(8)} ${String(totalOnlyDev).padStart(12)} ${String(totalOnlyVps).padStart(12)}`);

    console.log("\n  --- REGISTROS EM AMBOS (nao serao tocados) ---");
    for (const c of conflicts) {
      console.log(`    ${c.model.padEnd(22)} ${c.count} registros em comum`);
    }
    console.log(`    Total conflitos (preservados): ${totalConflicts}`);

    console.log("\n  --- IMPORTACAO PREVISTA (somente DEV -> VPS) ---");
    for (const [m, n] of Object.entries(importPlan)) {
      if (n > 0) console.log(`    ${m.padEnd(22)} +${n}`);
    }
    console.log(`    Total a importar: ${totalOnlyDev}`);

    if (DRY_RUN) {
      console.log("\n  DRY RUN concluido. Nenhuma alteracao feita.");
      console.log("  Execute com DRY_RUN=false para importar.");
      return;
    }

    // ── IMPORTACAO REAL ───────────────────────────────────────────────────────
    console.log("\n  Iniciando importacao aditiva DEV -> VPS...\n");

    let totalInserted = 0;
    for (const m of MODELS_IN_ORDER) {
      const rows = onlyDevRows[m];
      if (rows.length === 0) {
        console.log(`  [skip] ${m}: nada novo.`);
        continue;
      }
      const inserted = await insertBatch(tgt, m, rows);
      console.log(`  [import] ${m}: ${inserted} inseridos de ${rows.length} candidatos.`);
      totalInserted += inserted;
    }

    // ── Verificacao pos-importacao ────────────────────────────────────────────
    console.log("\n  --- Verificacao pos-importacao ---\n");
    const vpsAfter = await countAll(tgt);
    console.log(
      `  ${"Modelo".padEnd(22)} ${"DEV".padStart(8)} ${"VPS antes".padStart(10)} ${"VPS depois".padStart(11)} Status`
    );
    console.log(`  ${"-".repeat(66)}`);
    for (const m of MODELS_IN_ORDER) {
      const dCount = devCounts[m] ?? 0;
      const vBefore = vpsCounts[m] === -1 ? 0 : (vpsCounts[m] ?? 0);
      const vAfter  = vpsAfter[m] === -1 ? 0 : (vpsAfter[m] ?? 0);
      const diff = vAfter - vBefore;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      const status = vAfter >= dCount - (vpsCounts.match ?? 0) ? "OK" : "VERIFICAR";
      console.log(
        `  ${m.padEnd(22)} ${String(dCount).padStart(8)} ${String(vBefore).padStart(10)} ${String(vAfter).padStart(11)} ${diffStr.padStart(4)}  ${status}`
      );
    }
    console.log(`\n  Total inserido: ${totalInserted}`);
    console.log("\n  Importacao DEV -> VPS concluida.");

  } finally {
    await (src as unknown as { $disconnect(): Promise<void> }).$disconnect();
    await (tgt as unknown as { $disconnect(): Promise<void> }).$disconnect();
  }
}

main().catch((e) => {
  console.error("\n  FALHA:", e.message ?? e);
  process.exitCode = 1;
});
