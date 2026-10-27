import { prisma } from "../src/server/db";
import {
  TARGET_JUNE_MATCH_IDS,
  EXPECTED_ORIGIN_SEASON_ID,
  EXPECTED_TARGET_SEASON_ID,
} from "./audit-june-season";
import { rebuildRivalriesForSeasons } from "../src/server/services/rivalry/rivalry.service";
import { invalidateCoachCache } from "../src/server/coach/services/coach.service";

export interface RollbackOptions {
  isDryRun: boolean;
  confirmed: boolean;
}

export interface RollbackPlan {
  status: "READY" | "ALREADY_ROLLED_BACK" | "PARTIAL_STATE_ERROR" | "PRECONDITION_FAILED";
  message: string;
  matchesToRollback: string[];
  alreadyInOrigin: string[];
  unexpectedSeason: { id: string; seasonId: string | null }[];
  missingMatches: string[];
  originSeasonCountBefore: number;
  originSeasonCountAfterExpected: number;
  targetSeasonCountBefore: number;
  targetSeasonCountAfterExpected: number;
  totalMatchesBefore: number;
}

export async function planRollbackJuneMatches(): Promise<RollbackPlan> {
  const originSeason = await prisma.season.findUnique({
    where: { id: EXPECTED_ORIGIN_SEASON_ID },
    include: { _count: { select: { matches: true } } },
  });

  const targetSeason = await prisma.season.findUnique({
    where: { id: EXPECTED_TARGET_SEASON_ID },
    include: { _count: { select: { matches: true } } },
  });

  if (!originSeason || !targetSeason) {
    return {
      status: "PRECONDITION_FAILED",
      message: `Temporadas não encontradas (Origem: ${Boolean(originSeason)}, Destino: ${Boolean(targetSeason)})`,
      matchesToRollback: [],
      alreadyInOrigin: [],
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason?._count.matches ?? 0,
      originSeasonCountAfterExpected: 0,
      targetSeasonCountBefore: targetSeason?._count.matches ?? 0,
      targetSeasonCountAfterExpected: 0,
      totalMatchesBefore: 0,
    };
  }

  const matches = await prisma.match.findMany({
    where: { id: { in: TARGET_JUNE_MATCH_IDS } },
    select: { id: true, seasonId: true },
  });

  const foundIds = new Set(matches.map((m) => m.id));
  const missingMatches = TARGET_JUNE_MATCH_IDS.filter((id) => !foundIds.has(id));

  const matchesToRollback: string[] = [];
  const alreadyInOrigin: string[] = [];
  const unexpectedSeason: { id: string; seasonId: string | null }[] = [];

  for (const m of matches) {
    if (m.seasonId === EXPECTED_TARGET_SEASON_ID) {
      matchesToRollback.push(m.id);
    } else if (m.seasonId === EXPECTED_ORIGIN_SEASON_ID) {
      alreadyInOrigin.push(m.id);
    } else {
      unexpectedSeason.push({ id: m.id, seasonId: m.seasonId });
    }
  }

  const totalMatchesBefore = await prisma.match.count();

  if (missingMatches.length > 0 || unexpectedSeason.length > 0) {
    return {
      status: "PRECONDITION_FAILED",
      message: `Inconsistência detectada para rollback: ${missingMatches.length} faltantes, ${unexpectedSeason.length} em temporada inesperada.`,
      matchesToRollback,
      alreadyInOrigin,
      unexpectedSeason,
      missingMatches,
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches,
      totalMatchesBefore,
    };
  }

  if (alreadyInOrigin.length === TARGET_JUNE_MATCH_IDS.length) {
    return {
      status: "ALREADY_ROLLED_BACK",
      message: "Todas as 29 partidas já estão na temporada original (Julho/2026). Nada a reverter.",
      matchesToRollback: [],
      alreadyInOrigin,
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches,
      totalMatchesBefore,
    };
  }

  if (alreadyInOrigin.length > 0 && matchesToRollback.length > 0) {
    return {
      status: "PARTIAL_STATE_ERROR",
      message: `Estado parcialmente revertido (${alreadyInOrigin.length} na origem, ${matchesToRollback.length} no destino). Exige intervenção manual.`,
      matchesToRollback,
      alreadyInOrigin,
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches + matchesToRollback.length,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches - matchesToRollback.length,
      totalMatchesBefore,
    };
  }

  return {
    status: "READY",
    message: "Precondições 100% satisfeitas para rollback transacional das 29 partidas.",
    matchesToRollback,
    alreadyInOrigin,
    unexpectedSeason: [],
    missingMatches: [],
    originSeasonCountBefore: originSeason._count.matches,
    originSeasonCountAfterExpected: originSeason._count.matches + matchesToRollback.length,
    targetSeasonCountBefore: targetSeason._count.matches,
    targetSeasonCountAfterExpected: targetSeason._count.matches - matchesToRollback.length,
    totalMatchesBefore,
  };
}

export async function executeRollbackJuneMatches(options: RollbackOptions) {
  const plan = await planRollbackJuneMatches();

  console.log("================================================================================");
  console.log("CS2 STATS — SCRIPT DE ROLLBACK HISTÓRICO: JUNHO/2026 -> JULHO/2026");
  console.log(`MODO: ${options.isDryRun ? "DRY-RUN (SIMULAÇÃO SOMENTE-LEITURA)" : "EXECUÇÃO REAL"}`);
  console.log("================================================================================\n");

  console.log(`Status do Plano de Rollback: [${plan.status}] - ${plan.message}`);
  console.log(`Partidas a restaurar para Julho/2026: ${plan.matchesToRollback.length} de 29`);
  console.log(`Partidas já na temporada original: ${plan.alreadyInOrigin.length} de 29`);
  console.log(`Contagem Julho/2026: ${plan.originSeasonCountBefore} -> ${plan.originSeasonCountAfterExpected}`);
  console.log(`Contagem Junho/2026: ${plan.targetSeasonCountBefore} -> ${plan.targetSeasonCountAfterExpected}`);

  if (plan.status !== "READY" && plan.status !== "ALREADY_ROLLED_BACK") {
    console.error("\n[ERRO FATAL] Plano de rollback bloqueado. Nenhuma operação executada.");
    process.exit(1);
  }

  if (plan.status === "ALREADY_ROLLED_BACK") {
    console.log("\n[SUCESSO] As 29 partidas já se encontram no estado pré-migração.");
    return;
  }

  if (options.isDryRun || !options.confirmed) {
    console.log("\n[DRY-RUN CONCLUÍDO] Nenhuma linha foi alterada no PostgreSQL.");
    console.log("Para executar o rollback de fato no futuro quando autorizado, forneça:");
    console.log("  --execute --confirm-rollback-june-2026");
    return;
  }

  // EXECUÇÃO REAL PROTEGIDA DE ROLLBACK
  console.log("\n[INICIANDO ROLLBACK ATÔMICO]...");

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Restaurar seasonId das 29 partidas para a origem
      const updateRes = await tx.match.updateMany({
        where: {
          id: { in: plan.matchesToRollback },
          seasonId: EXPECTED_TARGET_SEASON_ID,
        },
        data: {
          seasonId: EXPECTED_ORIGIN_SEASON_ID,
        },
      });

      if (updateRes.count !== plan.matchesToRollback.length) {
        throw new Error(
          `Falha de concorrência no rollback: esperava reverter ${plan.matchesToRollback.length} partidas, mas foram revertidas ${updateRes.count}.`
        );
      }

      // 2. Reconciliar rivalidades
      const rivalryReconcile = await rebuildRivalriesForSeasons(
        [EXPECTED_ORIGIN_SEASON_ID, EXPECTED_TARGET_SEASON_ID],
        tx
      );

      return {
        updatedMatches: updateRes.count,
        rivalriesReconciled: rivalryReconcile,
      };
    },
    { timeout: 15000 }
  );

  invalidateCoachCache();

  console.log("\n[PÓS-CONDIÇÕES E AUDITORIA PÓS-ROLLBACK]");
  const originAfter = await prisma.match.count({ where: { seasonId: EXPECTED_ORIGIN_SEASON_ID } });
  const targetAfter = await prisma.match.count({ where: { seasonId: EXPECTED_TARGET_SEASON_ID } });
  const totalAfter = await prisma.match.count();

  console.log(`- Partidas em Julho/2026 após rollback: ${originAfter} (Esperado: ${plan.originSeasonCountAfterExpected})`);
  console.log(`- Partidas em Junho/2026 após rollback: ${targetAfter} (Esperado: ${plan.targetSeasonCountAfterExpected})`);
  console.log(`- Total geral de partidas no banco: ${totalAfter} (Esperado: ${plan.totalMatchesBefore})`);
  console.log(`- Rivalidades reconciliadas: apagadas ${result.rivalriesReconciled.deleted}, criadas ${result.rivalriesReconciled.inserted}`);

  if (
    originAfter === plan.originSeasonCountAfterExpected &&
    targetAfter === plan.targetSeasonCountAfterExpected &&
    totalAfter === plan.totalMatchesBefore
  ) {
    console.log("\n[SUCESSO] Rollback executado com sucesso e banco restaurado ao estado pré-migração!");
  } else {
    console.error("\n[ALERTA GRAVE] Pós-condições de rollback divergentes!");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const isConfirmed = args.includes("--confirm-rollback-june-2026");

  await executeRollbackJuneMatches({
    isDryRun: !isExecute,
    confirmed: isConfirmed,
  });
}

if (process.argv[1]?.endsWith("rollback-june-matches.ts")) {
  main()
    .catch((err) => {
      console.error("Erro fatal no rollback:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
