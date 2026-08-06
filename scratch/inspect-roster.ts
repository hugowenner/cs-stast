import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== INSPEÇÃO DE ROSTER E DIVERGÊNCIAS (Match 27573167) ===");

  const gcMatchId = "27573167";

  // 1. Busca no banco
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

  console.log(`\nMatch DB ID: ${match.id}`);
  console.log("PlayerStats no Banco:");
  for (const ps of match.playerStats) {
    console.log(`  - PlayerID: ${ps.player.id} | SteamID: ${ps.player.steamId} | Nickname: "${ps.player.nickname}" | Team: ${ps.team} | K/D: ${ps.kills}/${ps.deaths} | ADR: ${ps.adr}`);
  }

  // 2. Busca o Import log com o rawPayload original da GC
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
    console.error("Import log da GC não encontrado!");
    return;
  }

  const rawGC = imp.rawPayload as any;
  console.log("\n=== PLAYERS NO PAYLOAD BRUTO DA GAMERS CLUB ===");
  
  const teamA = rawGC.jogos?.players?.team_a || [];
  const teamB = rawGC.jogos?.players?.team_b || [];

  console.log("Team A (GC Payload):");
  for (const entry of teamA) {
    const player = entry.player ?? {};
    console.log(`  - Nick: "${player.nick ?? player.nickname}" | SteamId: ${player.plSteamID64 ?? player.plSteamID} | GC_ID: ${player.id} | K/D: ${entry.nb_kill}/${entry.death}`);
  }

  console.log("Team B (GC Payload):");
  for (const entry of teamB) {
    const player = entry.player ?? {};
    console.log(`  - Nick: "${player.nick ?? player.nickname}" | SteamId: ${player.plSteamID64 ?? player.plSteamID} | GC_ID: ${player.id} | K/D: ${entry.nb_kill}/${entry.death}`);
  }

  // 3. Busca o payload do parser de demo correspondente no MatchPayload
  const payloadRecord = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: gcMatchId, source: "gamersclub" } // a demo ingesta com source gamersclub no route.ts
  });

  if (payloadRecord) {
    const demoPayload = payloadRecord.payload as any;
    console.log("\n=== PLAYERS NO PAYLOAD DO DEMO PARSER ===");
    const demoPlayers = demoPayload.players || [];
    for (const dp of demoPlayers) {
      console.log(`  - Nick: "${dp.name}" | SteamID: ${dp.steamid} | Team: ${dp.team} | K/D: ${dp.kills}/${dp.deaths}`);
    }
  } else {
    console.log("\nMatchPayload da demo não encontrado!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
