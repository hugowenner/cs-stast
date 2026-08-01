process.env.MOCK_COACH = "true";
import "dotenv/config";
import { prisma } from "../src/server/db";
import { getActiveSeason, rolloverSeason } from "../src/server/services/season.service";

async function main() {
  console.log("=== SCRIPT DE REPARO DE TEMPORADAS ===");

  // 1. Obter a temporada ativa atual
  let activeSeason = await getActiveSeason();
  if (!activeSeason) {
    console.log("Nenhuma temporada ativa encontrada no banco de dados. Tentando restaurar a última temporada para ACTIVE...");
    const lastSeason = await prisma.season.findFirst({
      orderBy: { startDate: "desc" },
    });
    if (lastSeason) {
      console.log(`Restaurando temporada '${lastSeason.name}' (ID: ${lastSeason.id}) para ACTIVE.`);
      activeSeason = await prisma.season.update({
        where: { id: lastSeason.id },
        data: { status: "ACTIVE" },
      });
    } else {
      console.log("Nenhuma temporada cadastrada no banco de dados.");
      return;
    }
  }

  console.log(`Temporada ativa atual: '${activeSeason.name}' (ID: ${activeSeason.id}) [Fim: ${activeSeason.endDate.toISOString()}]`);

  const now = new Date();

  // 2. Se a temporada ativa for Julho/2026 e já passou do prazo, executa o rollover
  if (activeSeason.name === "Julho/2026" && now > activeSeason.endDate) {
    console.log("A temporada ativa é Julho/2026 e seu prazo de validade expirou. Executando rollover...");
    const rolloverResult = await rolloverSeason();
    console.log("Resultado do rollover:", rolloverResult);
    
    // Recarrega a nova temporada ativa
    activeSeason = await getActiveSeason();
    if (!activeSeason) {
      throw new Error("Falha ao recarregar a temporada ativa após o rollover.");
    }
  }

  console.log(`Temporada ativa após verificação: '${activeSeason.name}' (ID: ${activeSeason.id})`);

  if (activeSeason.name !== "Agosto/2026") {
    console.log("A temporada ativa não é Agosto/2026. Nenhuma correção de partidas necessária.");
    return;
  }

  // 3. Encontrar partidas jogadas a partir da data de início da temporada de Agosto (UTC)
  // que estão associadas à temporada de Julho ou com seasonId nulo
  const augustStartDate = activeSeason.startDate;
  console.log(`Buscando partidas jogadas a partir de ${augustStartDate.toISOString()}...`);

  const matchesToUpdate = await prisma.match.findMany({
    where: {
      playedAt: {
        gte: augustStartDate,
      },
      seasonId: {
        not: activeSeason.id,
      },
    },
    include: {
      season: true,
    },
  });

  console.log(`Encontradas ${matchesToUpdate.length} partida(s) para atualizar.`);

  for (const match of matchesToUpdate) {
    console.log(`- Partida ID: ${match.id} | GC ID: ${match.gamersClubMatchId} | Data: ${match.playedAt.toISOString()} | Temporada Atual: ${match.season?.name ?? "Nula"}`);
  }

  if (matchesToUpdate.length === 0) {
    console.log("Nenhuma partida precisa ser atualizada.");
    return;
  }

  // 4. Atualizar as partidas para apontar para a temporada de Agosto/2026
  const updateResult = await prisma.match.updateMany({
    where: {
      id: {
        in: matchesToUpdate.map((m) => m.id),
      },
    },
    data: {
      seasonId: activeSeason.id,
    },
  });

  console.log(`Sucesso: ${updateResult.count} partida(s) foram atualizada(s) para a temporada '${activeSeason.name}'.`);
}

main()
  .catch((err) => {
    console.error("Erro durante a execução do script de reparo:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
