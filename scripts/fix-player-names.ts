import "dotenv/config";
import { prisma } from "@/server/db";
import { sanitizeNickname } from "@/server/utils/player-name-normalizer";

async function main() {
  console.log("=== CORREÇÃO DE NICKNAMES DE JOGADORES ===");

  const players = await prisma.player.findMany();
  let correctedCount = 0;

  for (const player of players) {
    const cleanName = sanitizeNickname(player.nickname);
    if (cleanName !== player.nickname) {
      console.log(`[Fix] Corrigindo nickname do jogador ${player.steamId}: "${player.nickname}" -> "${cleanName}"`);
      await prisma.player.update({
        where: { id: player.id },
        data: { nickname: cleanName }
      });
      correctedCount++;
    }
  }

  console.log(`\nCorreção concluída. ${correctedCount} nicknames foram higienizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
