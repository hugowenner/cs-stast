import { prisma } from "@/server/db";

async function main() {
  console.log("=== Diagnóstico de Tipos de Partida ===");
  
  const total = await prisma.match.count();
  const community = await prisma.match.count({
    where: { trackedPlayersCount: { gte: 2 } },
  });
  const solo = await prisma.match.count({
    where: { trackedPlayersCount: { lt: 2 } },
  });

  console.log(`Total Matches: ${total}`);
  console.log(`Community Matches (>= 2 tracked): ${community}`);
  console.log(`Solo Matches (< 2 tracked): ${solo}`);

  // Fazer group by para ver a distribuição exata de trackedPlayersCount
  const distribution = await prisma.match.groupBy({
    by: ['trackedPlayersCount'],
    _count: {
      id: true,
    },
  });

  console.log("\nDistribuição de trackedPlayersCount:");
  console.table(distribution);
}

main()
  .catch((err) => {
    console.error("Erro no diagnóstico:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
