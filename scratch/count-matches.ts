import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const totalMatches = await prisma.match.count();
  console.log("Total matches in database:", totalMatches);

  const defaultSeasonMatches = await prisma.match.count({
    where: { seasonId: "default-season" }
  });
  console.log("Matches in 'default-season':", defaultSeasonMatches);

  const defaultSeasonCommunityMatches = await prisma.match.count({
    where: {
      seasonId: "default-season",
      trackedPlayersCount: { gte: 2 }
    }
  });
  console.log("Community matches in 'default-season' (trackedPlayersCount >= 2):", defaultSeasonCommunityMatches);

  // Let's also print matches where gamersClubMatchId matches one of the recent IDs, e.g. 27538448, and inspect their fields.
  const sampleGcMatch = await prisma.match.findFirst({
    where: { gamersClubMatchId: "27538448" },
    include: {
      playerStats: {
        include: {
          player: true
        }
      }
    }
  });
  if (sampleGcMatch) {
    console.log(`\nSample match 27538448:`);
    console.log(`- ID: ${sampleGcMatch.id}`);
    console.log(`- SeasonID: ${sampleGcMatch.seasonId}`);
    console.log(`- TrackedPlayersCount: ${sampleGcMatch.trackedPlayersCount}`);
    console.log(`- Players stats count: ${sampleGcMatch.playerStats.length}`);
    console.log(`- Player stats nicknames:`, sampleGcMatch.playerStats.map(ps => `${ps.player.nickname} (${ps.player.steamId})`));
  } else {
    console.log("Sample match 27538448 not found in Match table.");
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
