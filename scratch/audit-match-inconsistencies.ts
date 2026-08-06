import "dotenv/config";
import { prisma } from "@/server/db";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";

async function main() {
  console.log("=== AUDITORIA DE INCONSISTÊNCIAS DE TIMES E SCORES ===");

  const matches = await prisma.match.findMany({
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    }
  });

  console.log(`Total de partidas no banco: ${matches.length}`);

  let mismatchesCount = 0;

  for (const m of matches) {
    if (!m.gamersClubMatchId) continue;

    // Busca o payload original da GC no MatchPayload
    const payloadRecord = await prisma.matchPayload.findFirst({
      where: { sourceMatchId: m.gamersClubMatchId, source: "gamersclub" }
    });

    // Se não achar no MatchPayload, busca na tabela Import
    let rawGC: any = null;
    if (payloadRecord) {
      // Se o payload do MatchPayload for da GC (alguns registros de gamersclub contêm o parser payload devido ao worker)
      const p = payloadRecord.payload as any;
      if (p.jogos && p.jogos.players) {
        rawGC = p;
      }
    }

    if (!rawGC) {
      const imp = await prisma.import.findFirst({
        where: {
          status: "SUCCESS",
          rawPayload: {
            path: ["id"],
            equals: m.gamersClubMatchId
          }
        }
      });
      if (imp) {
        rawGC = imp.rawPayload;
      }
    }

    if (!rawGC) {
      // Sem payload GC para comparar
      continue;
    }

    // Normaliza o payload GC original
    const gcNormalized = normalizeGamersClubMatch(rawGC as GamersClubMatchPayload);

    // 1. Compara scores
    const scoreDiff = m.scoreTeamA !== gcNormalized.scoreTeamA || m.scoreTeamB !== gcNormalized.scoreTeamB;

    // 2. Compara times dos jogadores
    let teamDiff = false;
    const playerMismatches: string[] = [];

    for (const p of gcNormalized.players) {
      const dbPlayer = m.playerStats.find((s) => s.player.steamId === p.steamId);
      if (dbPlayer) {
        if (dbPlayer.team !== p.team) {
          teamDiff = true;
          playerMismatches.push(
            `${dbPlayer.player.nickname}: DB=${dbPlayer.team} vs GC=${p.team}`
          );
        }
      }
    }

    if (scoreDiff || teamDiff) {
      mismatchesCount++;
      console.log(`\nMatch GC ID: ${m.gamersClubMatchId} | DB ID: ${m.id}`);
      console.log(`  playedAt: ${m.playedAt.toISOString()}`);
      if (scoreDiff) {
        console.log(`  ⚠️ [SCORE MISMATCH]: DB = ${m.scoreTeamA}x${m.scoreTeamB} | GC = ${gcNormalized.scoreTeamA}x${gcNormalized.scoreTeamB}`);
      }
      if (teamDiff) {
        console.log(`  ⚠️ [TEAM MISMATCH]: Jogadores com times invertidos:`);
        for (const pm of playerMismatches) {
          console.log(`    - ${pm}`);
        }
      }
    }
  }

  console.log(`\nTotal de partidas com score ou times inconsistentes: ${mismatchesCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
