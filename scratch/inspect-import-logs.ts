import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== INSPEÇÃO DE LOG DE IMPORTAÇÃO BRUTO ===");

  const gcMatchId = "27590491";

  // Busca do Import de sucesso
  const imp = await prisma.import.findFirst({
    where: {
      status: "SUCCESS",
      rawPayload: {
        path: ["id"],
        equals: gcMatchId
      }
    }
  });

  if (!imp) {
    console.error("Import log de sucesso não encontrado!");
    return;
  }

  const raw = imp.rawPayload as any;
  console.log("Import ID:", imp.id);
  console.log("Keys of rawPayload:", Object.keys(raw));
  if (raw.jogos) {
    console.log("Keys of rawPayload.jogos:", Object.keys(raw.jogos));
    console.log("jogos.score_a:", raw.jogos.score_a);
    console.log("jogos.score_b:", raw.jogos.score_b);
    console.log("jogos.players keys:", Object.keys(raw.jogos.players ?? {}));
    
    // Mostra os jogadores de team_a no raw payload
    const teamA = raw.jogos.players?.team_a || [];
    console.log("\nteam_a players in rawPayload:");
    for (const p of teamA) {
      console.log(`  - Nick: ${p.player?.nick} (Steam ID: ${p.player?.plSteamID64})`);
    }

    // Mostra os jogadores de team_b no raw payload
    const teamB = raw.jogos.players?.team_b || [];
    console.log("\nteam_b players in rawPayload:");
    for (const p of teamB) {
      console.log(`  - Nick: ${p.player?.nick} (Steam ID: ${p.player?.plSteamID64})`);
    }
  } else {
    console.log("No 'jogos' key in rawPayload.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
