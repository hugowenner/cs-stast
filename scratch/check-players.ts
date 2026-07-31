import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const activeTracked = await prisma.player.findMany({
    where: {
      trackedPlayer: { active: true }
    },
    include: {
      trackedPlayer: true
    }
  });

  console.log("Active Tracked Players:");
  console.log("----------------------------------------");
  const trackedSteamIds = new Set(activeTracked.map(p => p.steamId));
  for (const p of activeTracked) {
    console.log(`- Nick: ${p.nickname} | SteamId: ${p.steamId} | GC ID: ${p.gamersClubId}`);
  }

  // Let's inspect match 27559986
  const match = await prisma.match.findFirst({
    where: { gamersClubMatchId: "27559986" },
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    }
  });

  if (match) {
    console.log(`\nMatch 27559986 details:`);
    console.log(`- ID: ${match.id} | GC ID: ${match.gamersClubMatchId}`);
    console.log(`- Map: ${match.mapId} | TrackedCount: ${match.trackedPlayersCount}`);
    console.log(`- Players present in this match and if they are tracked:`);
    for (const ps of match.playerStats) {
      const isTracked = trackedSteamIds.has(ps.player.steamId);
      console.log(`  * ${ps.player.nickname} (${ps.player.steamId}) - Tracked? ${isTracked ? "YES" : "NO"}`);
    }
  } else {
    console.log("\nMatch 27559986 not found in the database.");
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
