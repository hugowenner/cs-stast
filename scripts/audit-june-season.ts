import { prisma } from "../src/server/db";

export const TARGET_JUNE_MATCH_IDS = [
  "cmrv27zzs0305rswpfotthxsq",
  "cmrv27ya102y7rswpfjyyjigg",
  "cmrv27we902warswpa1jxkeg6",
  "cmrv27ulx02udrswpzsbed7jt",
  "cmrv27svl02s5rswp2uovfwp4",
  "cmrv27r1k02q6rswpcz2bw2k5",
  "cmrv27pba02o9rswpxk5w7w09",
  "cmrv27nlr02mcrswpadvt88u9",
  "cmrv27lon02kerswp5zqffjjs",
  "cmrv27jy802ihrswpt0vimej2",
  "cmrv25o9t02gjrswpjbw58f5j",
  "cmrv25mjq02elrswppni86spf",
  "cmrv25kuw02corswpn1eajohe",
  "cmrv25j0802arrswphngyaopg",
  "cmrv25h8x028urswphvx9va5m",
  "cmrv25fgw026wrswp7xfax5g1",
  "cmrv25dqk024yrswpyv652k30",
  "cmrv25bxq0230rswpl4gkk5nh",
  "cmrv25a740212rswplthu9sxs",
  "cmrv258b101z2rswpnfeqe0oc",
  "cmrv24i7201v6rswp9swyvlp1",
  "cmrv24gha01t9rswpkkhjvku6",
  "cmrv24el801rcrswpautqyeif",
  "cmrv24cwm01perswp7jxzzmqn",
  "cmrv24b5v01nhrswpzlyai3kl",
  "cmrv249dr01lkrswparijzgku",
  "cmrv247h901jmrswpcs3mc2j6",
  "cmrv245o001hprswpg5gntvvg",
  "cmrv243xa01frrswpfn4hhzuv",
];

export const EXPECTED_ORIGIN_SEASON_ID = "default-season"; // Julho/2026
export const EXPECTED_TARGET_SEASON_ID = "cmubaw1qu1nh901rxm4slybld"; // Junho/2026

export interface JuneAuditResult {
  eligible: boolean;
  blockers: string[];
  originSeason: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    currentMatchCount: number;
    expectedAfterCount: number;
  } | null;
  targetSeason: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    currentMatchCount: number;
    expectedAfterCount: number;
  } | null;
  totalMatchesInDb: number;
  inventoryCount: number;
  foundMatchesCount: number;
  matchesInOriginSeasonCount: number;
  matchesAlreadyInTargetCount: number;
  matchesInOtherSeasonCount: number;
  missingMatchesCount: number;
  datesWithinJuneCount: number;
  datesOutsideJuneCount: number;
  affectedStatsCount: number;
  affectedEventsCount: number;
  affectedRivalriesOriginCount: number;
}

export async function auditJuneSeason(): Promise<JuneAuditResult> {
  const blockers: string[] = [];

  // 1. Validar existência e limites temporais das temporadas
  const originSeason = await prisma.season.findUnique({
    where: { id: EXPECTED_ORIGIN_SEASON_ID },
    include: { _count: { select: { matches: true } } },
  });

  const targetSeason = await prisma.season.findUnique({
    where: { id: EXPECTED_TARGET_SEASON_ID },
    include: { _count: { select: { matches: true } } },
  });

  if (!originSeason) {
    blockers.push(`Temporada de origem '${EXPECTED_ORIGIN_SEASON_ID}' não encontrada no banco.`);
  }
  if (!targetSeason) {
    blockers.push(`Temporada de destino '${EXPECTED_TARGET_SEASON_ID}' não encontrada no banco.`);
  }

  // 2. Buscar as 29 partidas pelo ID exato
  const matches = await prisma.match.findMany({
    where: { id: { in: TARGET_JUNE_MATCH_IDS } },
    include: {
      season: true,
      map: true,
      _count: {
        select: {
          playerStats: true,
          events: true,
        },
      },
    },
    orderBy: { playedAt: "asc" },
  });

  const foundIds = new Set(matches.map((m) => m.id));
  const missingIds = TARGET_JUNE_MATCH_IDS.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    blockers.push(`${missingIds.length} partidas do inventário não foram encontradas no banco: ${missingIds.join(", ")}`);
  }

  let matchesInOrigin = 0;
  let matchesAlreadyInTarget = 0;
  let matchesInOther = 0;
  let datesWithinJune = 0;
  let datesOutsideJune = 0;
  let totalAffectedStats = 0;
  let totalAffectedEvents = 0;

  const juneStart = new Date("2026-06-01T00:00:00.000Z");
  const juneEnd = new Date("2026-06-30T23:59:59.999Z");

  for (const m of matches) {
    totalAffectedStats += m._count.playerStats;
    totalAffectedEvents += m._count.events;

    if (m.seasonId === EXPECTED_ORIGIN_SEASON_ID) {
      matchesInOrigin++;
    } else if (m.seasonId === EXPECTED_TARGET_SEASON_ID) {
      matchesAlreadyInTarget++;
    } else {
      matchesInOther++;
      blockers.push(`Partida ${m.id} vinculada a temporada inesperada '${m.seasonId}' (${m.season?.name})`);
    }

    if (m.playedAt >= juneStart && m.playedAt <= juneEnd) {
      datesWithinJune++;
    } else {
      datesOutsideJune++;
      blockers.push(`Partida ${m.id} tem data ${m.playedAt.toISOString()} fora dos limites de Junho/2026`);
    }
  }

  const totalMatchesInDb = await prisma.match.count();

  // 3. Contagem de rivalidades associadas à temporada de origem
  const originRivalriesCount = await prisma.rivalry.count({
    where: { seasonId: EXPECTED_ORIGIN_SEASON_ID },
  });

  const isEligible = blockers.length === 0 && matchesInOrigin === TARGET_JUNE_MATCH_IDS.length;

  return {
    eligible: isEligible,
    blockers,
    originSeason: originSeason
      ? {
          id: originSeason.id,
          name: originSeason.name,
          startDate: originSeason.startDate,
          endDate: originSeason.endDate,
          currentMatchCount: originSeason._count.matches,
          expectedAfterCount: originSeason._count.matches - matchesInOrigin,
        }
      : null,
    targetSeason: targetSeason
      ? {
          id: targetSeason.id,
          name: targetSeason.name,
          startDate: targetSeason.startDate,
          endDate: targetSeason.endDate,
          currentMatchCount: targetSeason._count.matches,
          expectedAfterCount: targetSeason._count.matches + matchesInOrigin,
        }
      : null,
    totalMatchesInDb,
    inventoryCount: TARGET_JUNE_MATCH_IDS.length,
    foundMatchesCount: matches.length,
    matchesInOriginSeasonCount: matchesInOrigin,
    matchesAlreadyInTargetCount: matchesAlreadyInTarget,
    matchesInOtherSeasonCount: matchesInOther,
    missingMatchesCount: missingIds.length,
    datesWithinJuneCount: datesWithinJune,
    datesOutsideJuneCount: datesOutsideJune,
    affectedStatsCount: totalAffectedStats,
    affectedEventsCount: totalAffectedEvents,
    affectedRivalriesOriginCount: originRivalriesCount,
  };
}

async function main() {
  console.log("================================================================================");
  console.log("CS2 STATS — AUDITORIA READ-ONLY: REMAPEAMENTO DE JUNHO/2026");
  console.log("================================================================================\n");

  const result = await auditJuneSeason();

  console.log("1. ELEGIBILIDADE DO AMBIENTE:");
  if (result.eligible) {
    console.log("   [STATUS] ELEGÍVEL PARA MIGRAÇÃO (Nenhuma anomalia detectada)");
  } else {
    console.log("   [STATUS] NÃO ELEGÍVEL — BLOQUEADORES ENCONTRADOS:");
    for (const b of result.blockers) {
      console.log(`     - ${b}`);
    }
  }

  console.log("\n2. CENÁRIO DE TEMPORADAS:");
  console.log("   Temporada de Origem:", result.originSeason ? `${result.originSeason.name} (${result.originSeason.id})` : "NÃO ENCONTRADA");
  if (result.originSeason) {
    console.log(`     Range: ${result.originSeason.startDate.toISOString()} até ${result.originSeason.endDate.toISOString()}`);
    console.log(`     Partidas atuais: ${result.originSeason.currentMatchCount} -> Projetadas após migração: ${result.originSeason.expectedAfterCount}`);
  }

  console.log("   Temporada de Destino:", result.targetSeason ? `${result.targetSeason.name} (${result.targetSeason.id})` : "NÃO ENCONTRADA");
  if (result.targetSeason) {
    console.log(`     Range: ${result.targetSeason.startDate.toISOString()} até ${result.targetSeason.endDate.toISOString()}`);
    console.log(`     Partidas atuais: ${result.targetSeason.currentMatchCount} -> Projetadas após migração: ${result.targetSeason.expectedAfterCount}`);
  }

  console.log("\n3. CONFERÊNCIA DO INVENTÁRIO DAS 29 PARTIDAS:");
  console.log(`   Total esperado: ${result.inventoryCount}`);
  console.log(`   Encontradas no banco: ${result.foundMatchesCount}`);
  console.log(`   Atualmente em Julho/2026 ('${EXPECTED_ORIGIN_SEASON_ID}'): ${result.matchesInOriginSeasonCount}`);
  console.log(`   Já em Junho/2026 ('${EXPECTED_TARGET_SEASON_ID}'): ${result.matchesAlreadyInTargetCount}`);
  console.log(`   Em outra temporada: ${result.matchesInOtherSeasonCount}`);
  console.log(`   Faltantes: ${result.missingMatchesCount}`);
  console.log(`   Com datas comprovadamente dentro de Junho/2026: ${result.datesWithinJuneCount} / ${result.inventoryCount}`);

  console.log("\n4. IMPACTO EM DEPENDÊNCIAS:");
  console.log(`   PlayerMatchStats vinculados: ${result.affectedStatsCount}`);
  console.log(`   Events vinculados: ${result.affectedEventsCount}`);
  console.log(`   Rivalidades atualmente registradas em Julho/2026: ${result.affectedRivalriesOriginCount}`);
  console.log(`   Total geral de partidas no banco (permanecerá inalterado): ${result.totalMatchesInDb}`);

  console.log("\n================================================================================");
  console.log("FIM DA AUDITORIA (NENHUM REGISTRO FOI MODIFICADO)");
  console.log("================================================================================");
}

if (process.argv[1]?.endsWith("audit-june-season.ts")) {
  main()
    .catch((err) => {
      console.error("Erro fatal na auditoria:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
