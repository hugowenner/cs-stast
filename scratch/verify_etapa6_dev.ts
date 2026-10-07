import * as statsService from "../src/server/services/stats.service";
import { prisma } from "../src/server/db";

async function main() {
  console.log("==========================================================================================");
  console.log("   CS2 STATS — VERIFICAÇÃO ETAPA 6: RANKING OFICIAL vs PROVISÓRIO (AMBIENTE DEV)");
  console.log("==========================================================================================\n");

  const season = await prisma.season.findFirst({
    where: { name: { contains: "Setembro" } },
  });

  const seasonId = season ? season.id : undefined;
  console.log(`Temporada analisada: ${season ? season.name : "Todas (Histórico)"} (ID: ${seasonId || "null"})\n`);

  const overview = await statsService.getSeasonScoreOverview(seasonId);

  console.log("------------------------------------------------------------------------------------------");
  console.log(" RANKING OFICIAL DA TEMPORADA (Elegíveis: N >= 10 partidas)");
  console.log("------------------------------------------------------------------------------------------");
  console.log("Pos | Jogador             | Score (S) | N  | Raw Rating | R_hat | P_hat | Confiança");
  console.log("------------------------------------------------------------------------------------------");
  overview.official.forEach((p, index) => {
    const name = (p.player?.nickname || "Desconhecido").padEnd(19, " ");
    const pos = (index + 1).toString().padStart(3, " ");
    const score = p.value.toFixed(3).padStart(9, " ");
    const n = p.matchesPlayed.toString().padStart(2, " ");
    const rawR = p.rawRating.toFixed(3).padStart(10, " ");
    const rHat = p.rHat.toFixed(3).padStart(5, " ");
    const pHat = p.pHat.toFixed(3).padStart(5, " ");
    const status = p.confidenceStatus.padStart(9, " ");
    console.log(`${pos} | ${name} | ${score} | ${n} | ${rawR} | ${rHat} | ${pHat} | ${status}`);
  });

  console.log("\n------------------------------------------------------------------------------------------");
  console.log(" JOGADORES PROVISÓRIOS (N < 10 partidas — Excluídos do Ranking Oficial)");
  console.log("------------------------------------------------------------------------------------------");
  console.log("Pos   | Jogador             | Score (S) | N  | Raw Rating | R_hat | P_hat | Confiança");
  console.log("------------------------------------------------------------------------------------------");
  overview.provisional.forEach((p, index) => {
    const name = (p.player?.nickname || "Desconhecido").padEnd(19, " ");
    const pos = `P-${index + 1}`.padStart(5, " ");
    const score = p.value.toFixed(3).padStart(9, " ");
    const n = p.matchesPlayed.toString().padStart(2, " ");
    const rawR = p.rawRating.toFixed(3).padStart(10, " ");
    const rHat = p.rHat.toFixed(3).padStart(5, " ");
    const pHat = p.pHat.toFixed(3).padStart(5, " ");
    const status = p.confidenceStatus.padStart(9, " ");
    console.log(`${pos} | ${name} | ${score} | ${n} | ${rawR} | ${rHat} | ${pHat} | ${status}`);
  });

  console.log("\n------------------------------------------------------------------------------------------");
  console.log(" METRICAS E RESUMO DE PROCESSAMENTO DA ETAPA 6");
  console.log("------------------------------------------------------------------------------------------");
  console.log(`- Total de Candidatos Avaliados: ${overview.allCandidates.length}`);
  console.log(`- Jogadores Elegíveis ao Ranking Oficial (N >= 10): ${overview.official.length}`);
  console.log(`- Jogadores Provisórios (N < 10): ${overview.provisional.length}`);
  console.log("==========================================================================================");
}

main()
  .catch((err) => {
    console.error("Erro na verificação:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
