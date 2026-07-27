import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import { loadCompetitiveDataset, getDashboardCompetitiveBundle } from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";

async function main() {
  console.log("=== Diagnóstico de Queries do Dashboard ===");

  let dataset: any = null;
  try {
    console.log("\n1. Executando loadCompetitiveDataset()...");
    dataset = await loadCompetitiveDataset();
    console.log("Sucesso! Dataset activePlayers:", dataset.activePlayers.length, "allStats:", dataset.allStats.length);
  } catch (err: any) {
    console.error("Erro em loadCompetitiveDataset():", err.message, err.stack);
  }

  if (dataset) {
    try {
      console.log("\n2. Executando getDashboardSummary(dataset)...");
      const summary = await dashboardService.getDashboardSummary(dataset);
      console.log("Sucesso! Summary totalMatches:", summary.totalMatches);
      console.log("Community avgKills:", summary.community.avgKills);
    } catch (err: any) {
      console.error("Erro em getDashboardSummary():", err.message, err.stack);
    }

    try {
      console.log("\n3. Executando getDashboardCompetitiveBundle(dataset)...");
      const bundle = await getDashboardCompetitiveBundle(dataset);
      console.log("Sucesso! Bundle powerRanking:", bundle.powerRanking.length, "archetypes:", bundle.archetypes.length);
    } catch (err: any) {
      console.error("Erro em getDashboardCompetitiveBundle():", err.message, err.stack);
    }
  }

  try {
    console.log("\n4. Executando listRecentMatches(10)...");
    const recent = await matchService.listRecentMatches(10);
    console.log("Sucesso! Recentes encontradas:", recent.length);
  } catch (err: any) {
    console.error("Erro em listRecentMatches():", err.message, err.stack);
  }

  try {
    console.log("\n5. Executando listRecent(4)...");
    const achievements = await achievementService.listRecent(4);
    console.log("Sucesso! Achievements:", achievements.length);
  } catch (err: any) {
    console.error("Erro em listRecent(4):", err.message, err.stack);
  }

  try {
    console.log("\n6. Executando listTopRivalriesWithH2H(10)...");
    const rivalries = await rivalryService.listTopRivalriesWithH2H(10);
    console.log("Sucesso! Rivalries:", rivalries.length);
  } catch (err: any) {
    console.error("Erro em listTopRivalriesWithH2H():", err.message, err.stack);
  }
}

main().catch((err) => {
  console.error("Erro geral no script:", err);
});
