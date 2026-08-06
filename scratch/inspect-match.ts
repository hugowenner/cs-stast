import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== INSPEÇÃO DE PARTIDA ESPECÍFICA ===");

  // Encontra o jogador "Bago Direito"
  const bago = await prisma.player.findFirst({
    where: { nickname: { contains: "Bago" } }
  });

  if (!bago) {
    console.error("Jogador Bago Direito não encontrado!");
    return;
  }

  console.log(`Jogador: ${bago.nickname} (ID: ${bago.id})`);

  // Busca as estatísticas de partida desse jogador em 04/08/2026 ou próximas
  const stats = await prisma.playerMatchStats.findMany({
    where: {
      playerId: bago.id,
      match: {
        playedAt: {
          gte: new Date("2026-08-03T00:00:00Z"),
          lte: new Date("2026-08-05T23:59:59Z")
        }
      }
    },
    include: {
      match: {
        include: {
          map: true,
          playerStats: {
            include: {
              player: true
            }
          }
        }
      }
    }
  });

  console.log(`Encontradas ${stats.length} partidas para Bago Direito nesse período.`);

  for (const s of stats) {
    const m = s.match;
    console.log(`\nMatch ID: ${m.id} | GC Match ID: ${m.gamersClubMatchId}`);
    console.log(`Data: ${m.playedAt.toISOString()}`);
    console.log(`Mapa: ${m.map.name}`);
    console.log(`Score: A = ${m.scoreTeamA} vs B = ${m.scoreTeamB}`);
    console.log(`Lado de Bago Direito na partida: ${s.team}`);
    console.log(`Resultado do match para o jogador (de acordo com stats): ${s.result}`);
    
    // Mostra todos os jogadores e seus times
    console.log("Jogadores da partida no Hub:");
    for (const ps of m.playerStats) {
      console.log(`  - Nick: "${ps.player.nickname}" | Time: ${ps.team} | K/D: ${ps.kills}/${ps.deaths} | Result: ${ps.result}`);
    }

    // Busca se existe payload correspondente
    const payloads = await prisma.matchPayload.findMany({
      where: { sourceMatchId: m.gamersClubMatchId ?? "" }
    });
    console.log("Payloads associados:");
    for (const p of payloads) {
      console.log(`  - ID: ${p.id} | Source: ${p.source} | CreatedAt: ${p.createdAt.toISOString()}`);
    }

    // Busca imports
    const imports = await prisma.import.findMany({
      where: {
        rawPayload: {
          path: ["id"],
          equals: m.gamersClubMatchId
        }
      }
    });
    console.log(`Imports associados: ${imports.length}`);
    for (const imp of imports) {
      console.log(`  - Import ID: ${imp.id} | Status: ${imp.status} | Error: ${imp.errorMessage}`);
      const raw = imp.rawPayload as any;
      if (raw) {
        console.log(`    Raw GC Team A: ${raw.teamA?.name} (Score: ${raw.teamA?.score})`);
        console.log(`    Raw GC Team B: ${raw.teamB?.name} (Score: ${raw.teamB?.score})`);
        console.log(`    Vencedor GC Raw: ${raw.winner}`);
        // Verifique em qual time os jogadores do Hub estavam na GC
        console.log("    Mapeamento de jogadores no raw GC payload:");
        const teamAPlayers = raw.teamA?.players || [];
        const teamBPlayers = raw.teamB?.players || [];
        for (const tp of teamAPlayers) {
          console.log(`      - Time A (GC): ${tp.nickname} (Steam: ${tp.steamId})`);
        }
        for (const tp of teamBPlayers) {
          console.log(`      - Time B (GC): ${tp.nickname} (Steam: ${tp.steamId})`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
