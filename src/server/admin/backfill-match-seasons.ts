import "dotenv/config";
import { prisma } from "@/server/db";
import { ensureCurrentSeason } from "@/server/services/season.service";

async function main() {
  console.log("Iniciando backfill de temporadas para as partidas...");

  // Garante que existe uma temporada ativa
  const activeSeason = await ensureCurrentSeason();
  if (!activeSeason || !activeSeason.id) {
    throw new Error("Não foi possível obter ou criar uma temporada ativa.");
  }

  console.log(`Temporada de destino: '${activeSeason.name}' (ID: ${activeSeason.id})`);

  // Busca e atualiza partidas que estão com seasonId nulo
  const result = await prisma.match.updateMany({
    where: {
      seasonId: null,
    },
    data: {
      seasonId: activeSeason.id,
    },
  });

  console.log(`Backfill concluído: ${result.count} partidas associadas à temporada '${activeSeason.name}'.`);
}

main()
  .catch((err) => {
    console.error("Erro no script de backfill:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
