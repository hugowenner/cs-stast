import "dotenv/config";
import { prisma } from "@/server/db";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";
import { sanitizeNickname } from "@/server/utils/player-name-normalizer";

async function main() {
  console.log("=== AUDITORIA GERAL - AGOSTO/2026 ===");

  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" }
  });

  if (!activeSeason) {
    console.error("Nenhuma temporada ativa encontrada!");
    return;
  }

  console.log(`Temporada Ativa: ${activeSeason.name} (ID: ${activeSeason.id})`);

  const matches = await prisma.match.findMany({
    where: { seasonId: activeSeason.id },
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    },
    orderBy: { playedAt: "asc" }
  });

  console.log(`Total de partidas na temporada ativa: ${matches.length}`);

  let scoreMismatches = 0;
  let teamMismatches = 0;
  let dateMismatches = 0;
  let missingGcMatchId = 0;
  let missingGcPayload = 0;

  for (const m of matches) {
    if (!m.gamersClubMatchId) {
      missingGcMatchId++;
      continue;
    }

    // Busca o payload original da GC no MatchPayload
    const payloadRecord = await prisma.matchPayload.findFirst({
      where: { sourceMatchId: m.gamersClubMatchId, source: "gamersclub" }
    });

    let rawGC: any = null;
    if (payloadRecord) {
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
      missingGcPayload++;
      continue;
    }

    // Normaliza o payload GC original
    const gcNormalized = normalizeGamersClubMatch(rawGC as GamersClubMatchPayload);

    // 1. Compara scores
    if (m.scoreTeamA !== gcNormalized.scoreTeamA || m.scoreTeamB !== gcNormalized.scoreTeamB) {
      scoreMismatches++;
    }

    // 2. Compara times dos jogadores
    let teamDiff = false;
    for (const p of gcNormalized.players) {
      const dbPlayer = m.playerStats.find((s) => s.player.steamId === p.steamId);
      if (dbPlayer && dbPlayer.team !== p.team) {
        teamDiff = true;
      }
    }
    if (teamDiff) {
      teamMismatches++;
    }

    // 3. Compara datas (playedAt da GC vs playedAt do banco)
    const gcTime = gcNormalized.playedAt.getTime();
    const dbTime = m.playedAt.getTime();
    if (Math.abs(gcTime - dbTime) > 60 * 1000) { // tolerância de 1 minuto
      dateMismatches++;
    }
  }

  // 4. Auditoria de Nicknames
  const players = await prisma.player.findMany();
  let contaminatedNames = 0;
  for (const p of players) {
    if (sanitizeNickname(p.nickname) !== p.nickname) {
      contaminatedNames++;
    }
  }

  console.log("\n=== RESULTADO DA AUDITORIA ===");
  console.log(`Partidas sem gamersClubMatchId: ${missingGcMatchId} [INVESTIGAR]`);
  console.log(`Partidas sem payload GC correspondente: ${missingGcPayload} [INVESTIGAR]`);
  console.log(`Partidas com discrepância de data: ${dateMismatches} [CORRIGIR]`);
  console.log(`Partidas com score inconsistente: ${scoreMismatches} [CORRIGIR]`);
  console.log(`Partidas com times invertidos: ${teamMismatches} [CORRIGIR]`);
  console.log(`Jogadores com nicknames contaminados: ${contaminatedNames} [CORRIGIR]`);

  const hasIssues = scoreMismatches > 0 || teamMismatches > 0 || dateMismatches > 0 || contaminatedNames > 0;
  console.log(`\nStatus Geral: ${hasIssues ? "FAIL" : "PASS"}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
