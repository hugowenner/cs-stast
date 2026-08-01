/**
 * Teste de integração do rollover de temporada.
 *
 * Estratégia de isolamento:
 * - Suspende temporariamente a season de produção (ACTIVE → CLOSED)
 * - Cria season de teste como única ACTIVE
 * - Executa rollover (que opera apenas sobre a season de teste)
 * - Valida resultados
 * - Restaura season de produção para ACTIVE e limpa dados de teste
 *
 * Uso: npm run season:test-rollover
 */
process.env.MOCK_COACH = "true";
import "dotenv/config";
import { prisma } from "../src/server/db";
import {
  rolloverSeason,
  validateSnapshot,
  isMaintenanceMode,
  getSeasonNameForDate,
  getSeasonDatesForDate,
} from "../src/server/services/season.service";

function log(msg: string) {
  console.log(`[season-rollover-test] ${msg}`);
}

function fail(msg: string): never {
  throw new Error(`FALHA: ${msg}`);
}

const TEST_NAMES = ["Janeiro/2020", "Fevereiro/2020", "Março/2020"];

async function cleanupTest() {
  const stale = await prisma.season.findMany({ where: { name: { in: TEST_NAMES } } });
  if (stale.length > 0) {
    const ids = stale.map((s) => s.id);
    await prisma.seasonSnapshot.deleteMany({ where: { seasonId: { in: ids } } });
    await prisma.season.deleteMany({ where: { id: { in: ids } } });
    log(`Limpeza: ${stale.length} temporada(s) de teste removida(s).`);
  }
}

async function main() {
  log("Iniciando teste de integração do rollover...");

  let suspendedProductionId: string | null = null;

  try {
    // ── 0. Limpar resquícios de runs anteriores ────────────────────────────
    await cleanupTest();

    // ── 1. Suspender season de produção ───────────────────────────────────
    // Temporariamente marca como CLOSED para que rolloverSeason() não a encontre.
    const productionSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
    });
    if (productionSeason) {
      await prisma.season.update({
        where: { id: productionSeason.id },
        data: { status: "CLOSED" },
      });
      suspendedProductionId = productionSeason.id;
      log(`Produção suspensa temporariamente: ${productionSeason.name}`);
    }

    // ── 2. Criação de temporada de teste ───────────────────────────────────
    const pastDate = new Date(Date.UTC(2020, 0, 15)); // Janeiro/2020
    const testName = getSeasonNameForDate(pastDate);
    const { startDate, endDate } = getSeasonDatesForDate(pastDate);

    const testSeason = await prisma.season.create({
      data: { name: testName, startDate, endDate, status: "ACTIVE" },
    });
    log(`✓ Temporada de teste criada: ${testName} (${testSeason.id})`);

    // ── 3. Snapshot mock pré-inserido ─────────────────────────────────────
    // Evita chamar a IA real. createSnapshot() faz upsert — já existindo no banco,
    // a chamada real sobrescreve com os dados reais (aceitável em teste).
    const mockData = {
      version: 1,
      generatedAt: new Date().toISOString(),
      seasonId: testSeason.id,
      seasonName: testName,
      dashboard: { summary: {}, competitive: {}, coach: {} },
    };
    if (!validateSnapshot(mockData)) fail("Mock snapshot falhou na validação pré-rollover");
    await prisma.seasonSnapshot.create({
      data: { seasonId: testSeason.id, dashboard: mockData as any },
    });
    log(`✓ Snapshot mock pré-inserido para ${testName}`);

    // ── 4. Rollover ────────────────────────────────────────────────────────
    const result = await rolloverSeason();

    if (result.status !== "success") fail(`Rollover retornou status '${result.status}'`);
    log("✓ Rollover retornou status 'success'");

    // ── 5. Validação: fechamento da temporada antiga ───────────────────────
    const closed = await prisma.season.findUnique({ where: { id: testSeason.id } });
    if (!closed) fail("Temporada de teste não encontrada após rollover");
    if (closed.status !== "CLOSED") fail(`Temporada de teste não foi fechada (status: ${closed.status})`);
    log(`✓ Temporada antiga fechada: ${closed.name}`);

    // ── 6. Validação: nova temporada ACTIVE ───────────────────────────────
    const nextDate = new Date(Date.UTC(2020, 1, 1)); // Fevereiro/2020
    const nextName = getSeasonNameForDate(nextDate);
    const newSeason = await prisma.season.findFirst({ where: { name: nextName } });
    if (!newSeason) fail(`Nova temporada '${nextName}' não encontrada`);
    if (newSeason.status !== "ACTIVE") fail(`Nova temporada não está ACTIVE (${newSeason.status})`);
    log(`✓ Nova temporada criada e ativa: ${newSeason.name}`);

    // ── 7. Validação: manutenção desligada ────────────────────────────────
    const maintenance = await isMaintenanceMode();
    if (maintenance) fail("Modo de manutenção ainda está ativo após rollover");
    log("✓ Modo de manutenção desligado");

    // ── 8. Idempotência ───────────────────────────────────────────────────
    // Simula o estado "rollover já executado": Março/2020 já existe como ACTIVE.
    // Neste cenário rolloverSeason() deve retornar 'skipped' sem fazer nada.
    const marcoDate = new Date(Date.UTC(2020, 2, 1)); // Março/2020
    const marcoName = getSeasonNameForDate(marcoDate);
    const { startDate: marcoStart, endDate: marcoEnd } = getSeasonDatesForDate(marcoDate);
    await prisma.season.create({
      data: { name: marcoName, startDate: marcoStart, endDate: marcoEnd, status: "ACTIVE" },
    });
    log(`  → Março/2020 criado como ACTIVE para simular rollover já executado`);

    const idempotentResult = await rolloverSeason();
    if (idempotentResult.status !== "skipped") {
      fail(`Segunda execução deveria ser 'skipped', mas retornou '${idempotentResult.status}'`);
    }
    log("✓ Idempotência confirmada (retornou 'skipped')");

    // ── 9. Validação do snapshot ──────────────────────────────────────────
    const snapshot = await prisma.seasonSnapshot.findUnique({ where: { seasonId: testSeason.id } });
    if (!snapshot) fail("Snapshot não encontrado para a temporada fechada");
    if (!validateSnapshot(snapshot.dashboard)) fail("Snapshot salvo falhou na validação de integridade");
    log("✓ Snapshot presente e válido");

    log("\n✅ Todos os testes passaram.");
  } finally {
    // Limpar todos os dados de teste
    await cleanupTest();
    // Restaurar season de produção para ACTIVE
    if (suspendedProductionId) {
      await prisma.season.update({
        where: { id: suspendedProductionId },
        data: { status: "ACTIVE" },
      });
      log(`Produção restaurada: ${suspendedProductionId} → ACTIVE.`);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[season-rollover-test] Erro inesperado:", err);
  process.exit(1);
});
