import "dotenv/config";
import { prisma } from "@/server/db";
import { sanitizeNickname } from "@/server/utils/player-name-normalizer";

async function main() {
  console.log("=== AUDITORIA DE NICKNAMES DE JOGADORES ===");

  const players = await prisma.player.findMany({
    orderBy: { nickname: "asc" }
  });

  console.log(`Total de jogadores cadastrados: ${players.length}`);

  let problemsFound = 0;

  for (const player of players) {
    const cleanName = sanitizeNickname(player.nickname);
    if (cleanName !== player.nickname) {
      console.log(`\nSteamID: ${player.steamId}`);
      console.log(`  Original: "${player.nickname}"`);
      console.log(`  Sugerido: "${cleanName}"`);
      problemsFound++;
    }
  }

  console.log(`\nProblemas encontrados: ${problemsFound}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
