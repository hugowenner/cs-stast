import "dotenv/config";
import { prisma } from "../src/server/db";

async function testPlayerAcrossRounds() {
  const p = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: "27544295" },
    select: { payload: true },
  });
  const raw = p?.payload as any;

  const targetSteam = "76561199114123956";
  const ecoForPlayer = raw.economy?.filter((e: any) => e.player_steamid === targetSteam);
  console.log("Player economy rounds 1-5:", ecoForPlayer?.slice(0, 5).map((e: any) => ({ r: e.round, side: e.side })));
  console.log("Player economy rounds 11-15:", ecoForPlayer?.slice(10, 15).map((e: any) => ({ r: e.round, side: e.side })));

  // Kills for player
  const killsByPlayer = raw.kills?.filter((k: any) => k.killer_steamid === targetSteam || k.victim_steamid === targetSteam);
  console.log("Kills for player sample:", killsByPlayer?.slice(0, 4).map((k: any) => ({
    r: k.round,
    isKiller: k.killer_steamid === targetSteam,
    team: k.killer_steamid === targetSteam ? k.killer_team : k.victim_team
  })));
}

testPlayerAcrossRounds().finally(() => prisma.$disconnect());
