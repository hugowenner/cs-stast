import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const match = await prisma.match.findFirst({
    where: { gamersClubMatchId: "27514457" },
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    }
  });

  if (match) {
    console.log(`Match 27514457 details:`);
    console.log(`- ID: ${match.id} | GC ID: ${match.gamersClubMatchId}`);
    console.log(`- Map: ${match.mapId} | TrackedCount: ${match.trackedPlayersCount}`);
    console.log(`- Players:`);
    for (const ps of match.playerStats) {
      console.log(`  * ${ps.player.nickname} (${ps.player.steamId})`);
    }
  } else {
    console.log("Match 27514457 not found.");
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
