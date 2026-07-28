import { prisma } from "C:/Users/ramobh/Documents/cs2-stats/src/server/db";
import { normalizeGamersClubMatch } from "C:/Users/ramobh/Documents/cs2-stats/src/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "C:/Users/ramobh/Documents/cs2-stats/src/server/adapters/gamersclub/types";

async function main() {
  const imports = await prisma.import.findMany({
    where: {
      status: "SUCCESS",
      rawPayload: { not: null }
    }
  });

  console.log(`Encontrados ${imports.length} imports bem-sucedidos para reprocessar.`);

  let updatedStatsCount = 0;

  for (const imp of imports) {
    const rawPayload = imp.rawPayload as any as GamersClubMatchPayload;
    if (!rawPayload) continue;

    const matchIdGc = String(rawPayload.id ?? rawPayload.matchId ?? "");
    if (!matchIdGc) continue;

    const match = await prisma.match.findUnique({
      where: { gamersClubMatchId: matchIdGc }
    });

    if (!match) {
      continue;
    }

    const normalized = normalizeGamersClubMatch(rawPayload);

    for (const p of normalized.players) {
      const player = await prisma.player.findUnique({
        where: { steamId: p.steamId }
      });

      if (!player) continue;

      try {
        const updateData: any = {};
        if (p.doubleKills !== undefined) updateData.doubleKills = p.doubleKills;
        if (p.tripleKills !== undefined) updateData.tripleKills = p.tripleKills;
        if (p.quadKills !== undefined) updateData.quadKills = p.quadKills;
        if (p.aces !== undefined) updateData.aces = p.aces;
        if (p.damage !== undefined) updateData.damage = p.damage;
        if (p.gcRating !== undefined) updateData.gcRating = p.gcRating;

        if (Object.keys(updateData).length > 0) {
          await prisma.playerMatchStats.update({
            where: {
              matchId_playerId: {
                matchId: match.id,
                playerId: player.id
              }
            },
            data: updateData
          });
          updatedStatsCount++;
        }
      } catch (err) {
        // Ignora se não existir
      }
    }
  }

  console.log(`Reprocessamento concluído. ${updatedStatsCount} estatísticas de jogador atualizadas.`);
}

main().catch(console.error);
