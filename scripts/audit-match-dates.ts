import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  // 1. Busca a temporada ativa
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!activeSeason) {
    console.log("Nenhuma temporada ativa encontrada!");
    console.log("Status: FAIL");
    return;
  }

  // 2. Busca todas as partidas associadas a temporada ativa
  const matches = await prisma.match.findMany({
    where: { seasonId: activeSeason.id },
    orderBy: { playedAt: "asc" },
  });

  let datasSuspeitas = 0;
  let partidasProcessamento = 0;

  for (const m of matches) {
    // Busca se existe payload correspondente
    const payloads = await prisma.matchPayload.findMany({
      where: { sourceMatchId: m.gamersClubMatchId ?? "" },
    });

    const hasGcPayload = payloads.some((p) => p.source === "gamersclub");

    const imports = await prisma.import.findMany({
      where: {
        rawPayload: {
          path: ["id"],
          equals: m.gamersClubMatchId ?? undefined,
        },
      },
    });
    const hasGcImport = imports.length > 0;

    const isSuspicious = !m.gamersClubMatchId || (!hasGcPayload && !hasGcImport);
    
    if (isSuspicious) {
      datasSuspeitas++;
      partidasProcessamento++;
    }
  }

  // Imprime o relatório exatamente conforme solicitado pelo usuário
  console.log(`Total partidas analisadas: ${matches.length}`);
  console.log(`Datas suspeitas: ${datasSuspeitas}`);
  console.log(`Partidas usando data de processamento: ${partidasProcessamento}`);
  console.log(`Status: ${datasSuspeitas === 0 ? "PASS" : "FAIL"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
