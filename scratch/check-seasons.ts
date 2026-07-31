import "dotenv/config";
import { prisma } from "../src/server/db";
import { getActiveSeason } from "../src/server/services/season.service";

async function main() {
  const activeSeason = await getActiveSeason();
  console.log("Active Season:", activeSeason ? `${activeSeason.name} (ID: ${activeSeason.id}) [${activeSeason.startDate.toISOString()} to ${activeSeason.endDate.toISOString()}]` : "None");

  const seasons = await prisma.season.findMany();
  console.log("\nAll Seasons:");
  for (const s of seasons) {
    console.log(`- ID: ${s.id} | Name: ${s.name} | Start: ${s.startDate.toISOString()} | End: ${s.endDate.toISOString()}`);
  }

  const matches = await prisma.match.findMany({
    orderBy: { playedAt: "desc" },
    take: 20,
    include: {
      season: true,
    }
  });

  console.log("\nLast 20 Matches and their seasons:");
  console.log("----------------------------------------");
  for (const m of matches) {
    console.log(
      `ID: ${m.id} | GC ID: ${m.gamersClubMatchId} | TrackedCount: ${m.trackedPlayersCount} | Season: ${m.season?.name ?? "None (ID: " + m.seasonId + ")"} | PlayedAt: ${m.playedAt?.toISOString()}`
    );
  }
}

main()
  .catch((err) => console.error("Error running script:", err))
  .finally(() => prisma.$disconnect());
