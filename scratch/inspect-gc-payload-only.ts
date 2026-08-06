import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== INSPEÇÃO DE GC PAYLOAD ===");

  const gcMatchId = "27590491";

  // Busca do MatchPayload da Gamers Club
  const payloadRecord = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: gcMatchId, source: "gamersclub" }
  });

  if (!payloadRecord) {
    console.error("MatchPayload da Gamers Club não encontrado!");
    return;
  }

  const raw = payloadRecord.payload as any;
  console.log("GC Match ID:", gcMatchId);
  console.log("Team A (GC Payload):", raw.teamA?.name, "Score:", raw.teamA?.score);
  console.log("Team B (GC Payload):", raw.teamB?.name, "Score:", raw.teamB?.score);
  console.log("Winner (GC Payload):", raw.winner);
  console.log("Score (GC Payload):", raw.score);
  
  console.log("\nTeam A Players in Payload:");
  for (const p of raw.teamA?.players || []) {
    console.log(`  - Nick: ${p.nickname} (Steam: ${p.steamId})`);
  }

  console.log("\nTeam B Players in Payload:");
  for (const p of raw.teamB?.players || []) {
    console.log(`  - Nick: ${p.nickname} (Steam: ${p.steamId})`);
  }

  // Agora vamos comparar com o Match no banco
  const match = await prisma.match.findUnique({
    where: { gamersClubMatchId: gcMatchId },
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    }
  });

  if (!match) {
    console.error("Match não encontrado no banco!");
    return;
  }

  console.log("\n=== DADOS PERSISTIDOS NO BANCO ===");
  console.log(`Match ID: ${match.id}`);
  console.log(`playedAt: ${match.playedAt.toISOString()}`);
  console.log(`scoreTeamA: ${match.scoreTeamA} (Esperado no Hub: ${match.scoreTeamA})`);
  console.log(`scoreTeamB: ${match.scoreTeamB} (Esperado no Hub: ${match.scoreTeamB})`);
  
  console.log("PlayerStats no banco:");
  for (const ps of match.playerStats) {
    console.log(`  - Nick: "${ps.player.nickname}" | Time: ${ps.team} | ELO: ${ps.eloBefore}/${ps.eloAfter} | Rating: ${ps.rating}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
