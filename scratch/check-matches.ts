import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const matchCount = await prisma.match.count();
  console.log("Total Matches in database:", matchCount);

  const matches = await prisma.match.findMany({
    orderBy: { playedAt: "desc" },
    take: 20,
    include: {
      map: true,
    }
  });

  console.log("\nLast 20 Matches:");
  console.log("----------------------------------------");
  for (const m of matches) {
    console.log(
      `ID: ${m.id} | GC ID: ${m.gamersClubMatchId} | Map: ${m.map?.name} | TrackedCount: ${m.trackedPlayersCount} | PlayedAt: ${m.playedAt?.toISOString()}`
    );
  }
}

main()
  .catch((err) => console.error("Error running script:", err))
  .finally(() => prisma.$disconnect());
