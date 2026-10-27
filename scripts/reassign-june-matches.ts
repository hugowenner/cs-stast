import { prisma } from "../src/server/db";
import {
  TARGET_JUNE_MATCH_IDS,
  EXPECTED_ORIGIN_SEASON_ID,
  EXPECTED_TARGET_SEASON_ID,
} from "./audit-june-season";
import { rebuildRivalriesForSeasons } from "../src/server/services/rivalry/rivalry.service";
import { invalidateCoachCache } from "../src/server/coach/services/coach.service";

export interface ReassignOptions {
  isDryRun: boolean;
  confirmed: boolean;
}

export interface ReassignPlan {
  status: "READY" | "ALREADY_MIGRATED" | "PARTIAL_STATE_ERROR" | "PRECONDITION_FAILED";
  message: string;
  matchesToUpdate: string[];
  alreadyMigrated: string[];
  unexpectedSeason: { id: string; seasonId: string | null }[];
  missingMatches: string[];
  originSeasonCountBefore: number;
  originSeasonCountAfterExpected: number;
  targetSeasonCountBefore: number;
  targetSeasonCountAfterExpected: number;
  totalMatchesBefore: number;
}

export async function planReassignJuneMatches(): Promise<ReassignPlan> {
  // 1. Validar existência das temporadas
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
      matchesToUpdate: [],
      alreadyMigrated: [],
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason?._count.matches ?? 0,
      originSeasonCountAfterExpected: 0,
      targetSeasonCountBefore: targetSeason?._count.matches ?? 0,
      targetSeasonCountAfterExpected: 0,
      totalMatchesBefore: 0,
    };
  }

  // 2. Inspecionar as 29 partidas
  const matches = await prisma.match.findMany({
    where: { id: { in: TARGET_JUNE_MATCH_IDS } },
    select: { id: true, seasonId: true, playedAt: true },
  });

  const foundIds = new Set(matches.map((m) => m.id));
  const missingMatches = TARGET_JUNE_MATCH_IDS.filter((id) => !foundIds.has(id));

  const matchesToUpdate: string[] = [];
  const alreadyMigrated: string[] = [];
  const unexpectedSeason: { id: string; seasonId: string | null }[] = [];

  for (const m of matches) {
    if (m.seasonId === EXPECTED_ORIGIN_SEASON_ID) {
      matchesToUpdate.push(m.id);
    } else if (m.seasonId === EXPECTED_TARGET_SEASON_ID) {
      alreadyMigrated.push(m.id);
    } else {
      unexpectedSeason.push({ id: m.id, seasonId: m.seasonId });
    }
  }

  const totalMatchesBefore = await prisma.match.count();

  if (missingMatches.length > 0 || unexpectedSeason.length > 0) {
    return {
      status: "PRECONDITION_FAILED",
      message: `Inconsistência detectada: ${missingMatches.length} faltantes, ${unexpectedSeason.length} em temporada inesperada.`,
      matchesToUpdate,
      alreadyMigrated,
      unexpectedSeason,
      missingMatches,
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches,
      totalMatchesBefore,
    };
  }

  if (alreadyMigrated.length === TARGET_JUNE_MATCH_IDS.length) {
    return {
      status: "ALREADY_MIGRATED",
      message: "Todas as 29 partidas já estão associadas à temporada de Junho/2026. Nenhuma alteração necessária.",
      matchesToUpdate: [],
      alreadyMigrated,
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches,
      totalMatchesBefore,
    };
  }

  if (alreadyMigrated.length > 0 && matchesToUpdate.length > 0) {
    return {
      status: "PARTIAL_STATE_ERROR",
      message: `Estado parcialmente migrado detectado (${alreadyMigrated.length} já migradas, ${matchesToUpdate.length} pendentes). Exige reconciliação explícita.`,
      matchesToUpdate,
      alreadyMigrated,
      unexpectedSeason: [],
      missingMatches: [],
      originSeasonCountBefore: originSeason._count.matches,
      originSeasonCountAfterExpected: originSeason._count.matches - matchesToUpdate.length,
      targetSeasonCountBefore: targetSeason._count.matches,
      targetSeasonCountAfterExpected: targetSeason._count.matches + matchesToUpdate.length,
      totalMatchesBefore,
    };
  }

  return {
    status: "READY",
    message: "Precondições 100% satisfeitas para remapeamento transacional das 29 partidas.",
    matchesToUpdate,
    alreadyMigrated,
    unexpectedSeason: [],
    missingMatches: [],
    originSeasonCountBefore: originSeason._count.matches,
    originSeasonCountAfterExpected: originSeason._count.matches - matchesToUpdate.length,
    targetSeasonCountBefore: targetSeason._count.matches,
    targetSeasonCountAfterExpected: targetSeason._count.matches + matchesToUpdate.length,
    totalMatchesBefore,
  };
}

export async function executeReassignJuneMatches(options: ReassignOptions) {
  const plan = await planReassignJuneMatches();

  console.log("================================================================================");
  console.log("CS2 STATS — SCRIPT DE REMAPEAMENTO HISTÓRICO: JUNHO/2026");
  console.log(`MODO: ${options.isDryRun ? "DRY-RUN (SIMULAÇÃO SOMENTE-LEITURA)" : "EXECUÇÃO REAL"}`);
  console.log("================================================================================\n");

  console.log(`Status do Plano: [${plan.status}] - ${plan.message}`);
  console.log(`Partidas a remapear: ${plan.matchesToUpdate.length} de 29`);
  console.log(`Partidas já migradas: ${plan.alreadyMigrated.length} de 29`);
  console.log(`Contagem Julho/2026: ${plan.originSeasonCountBefore} -> ${plan.originSeasonCountAfterExpected}`);
  console.log(`Contagem Junho/2026: ${plan.targetSeasonCountBefore} -> ${plan.targetSeasonCountAfterExpected}`);

  if (plan.status !== "READY" && plan.status !== "ALREADY_MIGRATED") {
    console.error("\n[ERRO FATAL] Plano bloqueado. Nenhuma operação executada.");
    process.exit(1);
  }

  if (plan.status === "ALREADY_MIGRATED") {
    console.log("\n[SUCESSO] Nenhuma ação necessária, ambiente já conforme.");
    return;
  }

  if (options.isDryRun || !options.confirmed) {
    console.log("\n[DRY-RUN CONCLUÍDO] Nenhuma linha foi alterada no PostgreSQL.");
    console.log("Para executar de fato no futuro quando autorizado, forneça:");
    console.log("  --execute --confirm-remap-june-2026");
    return;
  }

  // EXECUÇÃO REAL PROTEGIDA (Transação Atômica com Reconciliação Granular de Rivalidades)
  console.log("\n[INICIANDO TRANSAÇÃO ATÔMICA]...");

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Atualizar seasonId das 29 partidas
      const updateRes = await tx.match.updateMany({
        where: {
          id: { in: plan.matchesToUpdate },
          seasonId: EXPECTED_ORIGIN_SEASON_ID, // proteção de concorrência / CAS
        },
        data: {
          seasonId: EXPECTED_TARGET_SEASON_ID,
        },
      });

      if (updateRes.count !== plan.matchesToUpdate.length) {
        throw new Error(
          `Falha de concorrência: esperava atualizar ${plan.matchesToUpdate.length} partidas, mas foram atualizadas ${updateRes.count}. Rollback acionado.`
        );
      }

      // 2. Reconciliar rivalidades de forma granular apenas para Junho/2026 e Julho/2026
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

  // 3. Pós-condição e invalidação de cache
  invalidateCoachCache();

  console.log("\n[PÓS-CONDIÇÕES E AUDITORIA PÓS-MIGRAÇÃO]");
  const originAfter = await prisma.match.count({ where: { seasonId: EXPECTED_ORIGIN_SEASON_ID } });
  const targetAfter = await prisma.match.count({ where: { seasonId: EXPECTED_TARGET_SEASON_ID } });
  const totalAfter = await prisma.match.count();

  console.log(`- Partidas em Julho/2026 após migração: ${originAfter} (Esperado: ${plan.originSeasonCountAfterExpected})`);
  console.log(`- Partidas em Junho/2026 após migração: ${targetAfter} (Esperado: ${plan.targetSeasonCountAfterExpected})`);
  console.log(`- Total geral de partidas no banco: ${totalAfter} (Esperado: ${plan.totalMatchesBefore})`);
  console.log(`- Rivalidades atualizadas nas 2 temporadas: apagadas ${result.rivalriesReconciled.deleted}, criadas ${result.rivalriesReconciled.inserted}`);
  console.log("- Cache do Coach IA invalidado com sucesso.");

  if (
    originAfter === plan.originSeasonCountAfterExpected &&
    targetAfter === plan.targetSeasonCountAfterExpected &&
    totalAfter === plan.totalMatchesBefore
  ) {
    console.log("\n[SUCESSO INTEGRAL] Migração histórica concluída com integridade verificada!");
  } else {
    console.error("\n[ALERTA GRAVE] Pós-condições divergentes do esperado! Recomenda-se acionar o rollback.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const isConfirmed = args.includes("--confirm-remap-june-2026");

  await executeReassignJuneMatches({
    isDryRun: !isExecute,
    confirmed: isConfirmed,
  });
}

if (process.argv[1]?.endsWith("reassign-june-matches.ts")) {
  main()
    .catch((err) => {
      console.error("Erro fatal no remapeamento:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
