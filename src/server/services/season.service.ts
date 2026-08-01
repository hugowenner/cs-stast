import { prisma } from "@/server/db";

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Retorna o nome da temporada correspondente a uma data específica.
 * Ex: "Julho/2026"
 */
export function getSeasonNameForDate(date: Date): string {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  return `${MONTHS_PT[month]}/${year}`;
}

/**
 * Retorna as datas de início e fim do mês correspondente a uma data específica em UTC.
 */
export function getSeasonDatesForDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

/**
 * Busca a temporada ativa atual.
 */
export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { status: "ACTIVE" },
  });
}

/**
 * Busca uma temporada específica por ID, incluindo seus snapshots associados.
 */
export async function getSeason(id: string) {
  return prisma.season.findUnique({
    where: { id },
    include: { snapshots: true },
  });
}

/**
 * Lista todas as temporadas ordenadas por data de início decrescente.
 */
export async function listSeasons() {
  return prisma.season.findMany({
    orderBy: { startDate: "desc" },
  });
}

/**
 * Cria uma nova temporada com status ativo.
 */
export async function createSeason(data: { name: string; startDate: Date; endDate: Date }) {
  return prisma.season.create({
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "ACTIVE",
    },
  });
}

/**
 * Garante que uma temporada ativa exista para o mês atual.
 * Se não existir, cria uma nova temporada correspondente ao mês atual.
 */
export async function ensureCurrentSeason() {
  const active = await getActiveSeason();
  if (active) {
    const now = new Date();
    if (now > active.endDate) {
      console.log(`[Season] Temporada ativa '${active.name}' expirou em ${active.endDate.toISOString()}. Iniciando rollover automático.`);
      const result = await rolloverSeason();
      if (result.status === "success" && result.opened) {
        return result.opened;
      }
      const reloadedActive = await getActiveSeason();
      if (reloadedActive) return reloadedActive;
    }
    return active;
  }

  const now = new Date();
  const name = getSeasonNameForDate(now);
  const { startDate, endDate } = getSeasonDatesForDate(now);

  return prisma.season.create({
    data: {
      name,
      startDate,
      endDate,
      status: "ACTIVE",
    },
  });
}

/**
 * Centraliza a resolução do ID da temporada com fallback automático.
 * Se seasonId for informado e não for "current", valida se existe no banco.
 * Se omitido ou "current", retorna o ID da temporada ativa.
 */
export async function resolveSeasonId(seasonId?: string): Promise<string> {
  if (seasonId && seasonId !== "current") {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season) {
      throw new Error(`Temporada com ID '${seasonId}' não encontrada.`);
    }
    return season.id;
  }

  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    throw new Error("Nenhuma temporada ativa encontrada no sistema.");
  }
  return activeSeason.id;
}

/**
 * Valida a integridade do JSON de um snapshot da temporada.
 */
export function validateSnapshot(snapshotData: any): boolean {
  if (!snapshotData) return false;
  if (snapshotData.version !== 1) return false;
  if (!snapshotData.generatedAt) return false;
  if (!snapshotData.seasonId) return false;
  if (!snapshotData.seasonName) return false;
  if (!snapshotData.dashboard) return false;
  if (!snapshotData.dashboard.summary) return false;
  if (!snapshotData.dashboard.competitive) return false;
  if (!snapshotData.dashboard.coach) return false;
  return true;
}

/**
 * Compila e salva o snapshot completo do Dashboard para a temporada especificada.
 */
export async function createSnapshot(seasonId: string) {
  const { getDashboardSummary } = await import("@/server/services/dashboard.service");
  const { loadCompetitiveDataset, getDashboardCompetitiveBundle } = await import("@/server/services/competitive.service");
  const { getCoachReport } = await import("@/server/coach/services/coach.service");
  const { buildDashboardPrompt } = await import("@/server/coach/builders/dashboard.builder");

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });
  if (!season) {
    throw new Error(`Temporada com ID '${seasonId}' não encontrada.`);
  }

  const dataset = await loadCompetitiveDataset(seasonId);
  const summary = await getDashboardSummary(seasonId, dataset);
  const competitive = await getDashboardCompetitiveBundle(dataset);
  const coachReport = await getCoachReport(
    { ...summary, seasonLabel: season.name },
    buildDashboardPrompt,
    "dashboard:season",
    seasonId
  );

  const snapshotData = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: "season-rollover",
    schemaVersion: 1,
    applicationVersion: "1.0.0",
    seasonId,
    seasonName: season.name,
    dashboard: {
      summary,
      competitive,
      coach: coachReport,
    },
  };

  if (!validateSnapshot(snapshotData)) {
    throw new Error("Falha na validação de integridade do snapshot.");
  }

  return prisma.seasonSnapshot.upsert({
    where: { seasonId },
    create: {
      seasonId,
      dashboard: snapshotData as any,
    },
    update: {
      dashboard: snapshotData as any,
    },
  });
}

/**
 * Verifica se o sistema está em modo de manutenção para rollover.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const config = await prisma.configuration.findUnique({
    where: { key: "MAINTENANCE" },
  });
  if (config && typeof config.value === "object" && config.value !== null) {
    return (config.value as any).enabled === true;
  }
  return false;
}

/**
 * Altera o status do modo de manutenção.
 */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await prisma.configuration.upsert({
    where: { key: "MAINTENANCE" },
    create: {
      key: "MAINTENANCE",
      value: { enabled },
    },
    update: {
      value: { enabled },
    },
  });
}

/**
 * Executa o rollover de temporada de forma idempotente e transacional.
 */
export async function rolloverSeason() {
  console.log("[Season] Rollover iniciado");

  // 1. Detectar temporada ativa
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!activeSeason) {
    console.log("[Season] Nenhuma temporada ativa encontrada para rollover.");
    return { status: "skipped", reason: "no_active_season" };
  }

  // Proteção contra concorrência/execução precoce: não realiza o rollover se a temporada ativa atual não expirou
  const now = new Date();
  if (activeSeason.endDate > now) {
    console.log(`[Season] Rollover ignorado: a temporada ativa '${activeSeason.name}' ainda não expirou (término em ${activeSeason.endDate.toISOString()}, hora atual: ${now.toISOString()}).`);
    return { status: "skipped", reason: "active_season_not_expired" };
  }

  // Próxima temporada com base no fim da ativa (soma 1 segundo em UTC determinístico)
  const nextMonthStartDate = new Date(activeSeason.endDate.getTime() + 1000);
  const nextName = getSeasonNameForDate(nextMonthStartDate);
  const { startDate: nextStart, endDate: nextEnd } = getSeasonDatesForDate(nextMonthStartDate);

  // Idempotência: verificar se a próxima temporada já existe como ACTIVE ou se a atual já virou
  const nextSeasonExists = await prisma.season.findFirst({
    where: { name: nextName },
  });
  if (nextSeasonExists && nextSeasonExists.status === "ACTIVE") {
    console.log(`[Season] Rollover já foi executado. Temporada '${nextName}' já está ativa.`);
    return { status: "skipped", reason: "already_rolled_over" };
  }

  // 2. maintenance = true
  await setMaintenanceMode(true);
  console.log("[Season] Modo de manutenção ativado");

  try {
    // 3. Aguardar finalização de requisições paralelas em andamento
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. createSnapshot() + validateSnapshot()
    console.log(`[Season] Snapshot iniciado para a temporada ${activeSeason.name}`);
    await createSnapshot(activeSeason.id);
    console.log("[Season] Snapshot validado com sucesso");

    // 5. Encerrar antiga e abrir nova em transação atômica única
    const result = await prisma.$transaction(async (tx) => {
      const closedSeason = await tx.season.update({
        where: { id: activeSeason.id },
        data: { status: "CLOSED" },
      });
      console.log(`[Season] Temporada ${activeSeason.name} encerrada`);

      const newSeason = await tx.season.create({
        data: {
          name: nextName,
          startDate: nextStart,
          endDate: nextEnd,
          status: "ACTIVE",
        },
      });
      console.log(`[Season] Temporada ${nextName} criada`);

      return { closedSeason, newSeason };
    });

    // 6. Invalidação de cache global do Coach
    const { invalidateCoachCache } = await import("@/server/coach/services/coach.service");
    invalidateCoachCache();
    console.log("[Season] Caches invalidados");

    console.log("[Season] Rollover concluído");
    return { status: "success", closed: result.closedSeason, opened: result.newSeason };
  } catch (error) {
    console.error("[Season] Falha durante o rollover, realizando rollback:", error);
    throw error;
  } finally {
    // 7. maintenance = false
    await setMaintenanceMode(false);
    console.log("[Season] Modo de manutenção desativado");
  }
}
