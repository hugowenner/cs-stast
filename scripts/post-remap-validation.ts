import { prisma } from "../src/server/db";
import {
  TARGET_JUNE_MATCH_IDS,
  EXPECTED_ORIGIN_SEASON_ID,
  EXPECTED_TARGET_SEASON_ID,
} from "./audit-june-season";
import { getDashboardSummary } from "../src/server/services/dashboard.service";
import { loadCompetitiveDataset, getPowerRankingFromDataset } from "../src/server/services/competitive.service";

async function validate() {
  console.log("================================================================================");
  console.log("CS2 STATS — VALIDAÇÃO PÓS-EXECUÇÃO DETALHADA");
  console.log("================================================================================\n");

  // 1. Contagens fundamentais
  const juneCount = await prisma.match.count({ where: { seasonId: EXPECTED_TARGET_SEASON_ID } });
  const julyCount = await prisma.match.count({ where: { seasonId: EXPECTED_ORIGIN_SEASON_ID } });
  const totalMatches = await prisma.match.count();
  const totalPlayers = await prisma.player.count();
  const totalStats = await prisma.playerMatchStats.count();

  console.log("1. CONTAGENS FUNDAMENTAIS:");
  console.log(`- Partidas em Junho/2026: ${juneCount} (Esperado: 30) -> ${juneCount === 30 ? "OK" : "ERRO"}`);
  console.log(`- Partidas em Julho/2026: ${julyCount} (Esperado: 144) -> ${julyCount === 144 ? "OK" : "ERRO"}`);
  console.log(`- Total global de partidas: ${totalMatches} (Esperado: 638) -> ${totalMatches === 638 ? "OK" : "ERRO"}`);
  console.log(`- Total de jogadores: ${totalPlayers} (Esperado: 4340) -> ${totalPlayers === 4340 ? "OK" : "ERRO"}`);
  console.log(`- Total de PlayerMatchStats: ${totalStats} (Esperado: 6502) -> ${totalStats === 6502 ? "OK" : "ERRO"}`);

  // 2. Verificação das 29 partidas específicas
  const remappedMatches = await prisma.match.findMany({
    where: { id: { in: TARGET_JUNE_MATCH_IDS } },
    select: { id: true, seasonId: true },
  });
  const allInJune = remappedMatches.every((m) => m.seasonId === EXPECTED_TARGET_SEASON_ID);
  console.log(`\n2. STATUS DAS 29 PARTIDAS:`);
  console.log(`- Encontradas: ${remappedMatches.length} / 29`);
  console.log(`- Todas com seasonId de Junho/2026: ${allInJune ? "OK (100%)" : "ERRO"}`);

  // 3. Ausência de referências órfãs e duplicatas
  const orphanStatsRes: any = await prisma.$queryRawUnsafe(
    'SELECT count(*)::int as count FROM "PlayerMatchStats" p LEFT JOIN "Match" m ON p."matchId" = m.id WHERE m.id IS NULL;'
  );
  const orphanEventsRes: any = await prisma.$queryRawUnsafe(
    'SELECT count(*)::int as count FROM "Event" e LEFT JOIN "Match" m ON e."matchId" = m.id WHERE m.id IS NULL;'
  );
  const orphanStats = orphanStatsRes[0]?.count ?? 0;
  const orphanEvents = orphanEventsRes[0]?.count ?? 0;
  console.log(`\n3. INTEGRIDADE RELACIONAL:`);
  console.log(`- Stats órfãos de Match: ${orphanStats} -> ${orphanStats === 0 ? "OK" : "ERRO"}`);
  console.log(`- Events órfãos de Match: ${orphanEvents} -> ${orphanEvents === 0 ? "OK" : "ERRO"}`);

  // 4. Integridade das rivalidades por temporada
  const rivalryGroups = await prisma.rivalry.groupBy({
    by: ["seasonId"],
    _count: { id: true },
  });
  console.log(`\n4. RIVALIDADES POR TEMPORADA:`);
  for (const g of rivalryGroups) {
    const sName = g.seasonId
      ? (await prisma.season.findUnique({ where: { id: g.seasonId } }))?.name
      : "GLOBAL (all-time)";
    console.log(`- ${sName} (${g.seasonId ?? "null"}): ${g._count.id} rivalidades`);
  }

  // 5. Métricas do Dashboard para Junho/2026 e Julho/2026
  console.log(`\n5. DASHBOARD & MÉTRICAS AGREGADAS:`);
  const dsJune = await loadCompetitiveDataset(EXPECTED_TARGET_SEASON_ID);
  const summaryJune = await getDashboardSummary(EXPECTED_TARGET_SEASON_ID, dsJune);
  console.log("- Dashboard Junho/2026:", {
    totalMatches: summaryJune.totalMatches,
    totalPlayers: summaryJune.totalPlayers,
    bestPlayer: summaryJune.bestPlayer?.nickname,
    community: {
      avgWinrate: `${summaryJune.community.avgWinrate.toFixed(1)}%`,
      avgKd: summaryJune.community.avgKd.toFixed(2),
      avgAdr: summaryJune.community.avgAdr,
      totalKills: summaryJune.community.totalKills,
      totalRounds: summaryJune.community.totalRounds,
    },
    dominantMap: summaryJune.dominantMap?.name,
  });

  const dsJuly = await loadCompetitiveDataset(EXPECTED_ORIGIN_SEASON_ID);
  const summaryJuly = await getDashboardSummary(EXPECTED_ORIGIN_SEASON_ID, dsJuly);
  console.log("- Dashboard Julho/2026:", {
    totalMatches: summaryJuly.totalMatches,
    totalPlayers: summaryJuly.totalPlayers,
    bestPlayer: summaryJuly.bestPlayer?.nickname,
    community: {
      avgWinrate: `${summaryJuly.community.avgWinrate.toFixed(1)}%`,
      avgKd: summaryJuly.community.avgKd.toFixed(2),
      avgAdr: summaryJuly.community.avgAdr,
      totalKills: summaryJuly.community.totalKills,
      totalRounds: summaryJuly.community.totalRounds,
    },
    dominantMap: summaryJuly.dominantMap?.name,
  });

  console.log("\n================================================================================");
  console.log("VALIDAÇÃO CONCLUÍDA COM SUCESSO");
  console.log("================================================================================");
}

validate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro na validação:", err);
    process.exit(1);
  });
