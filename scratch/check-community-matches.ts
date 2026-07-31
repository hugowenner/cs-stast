import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const matches = await prisma.match.findMany({
    where: {
      seasonId: "default-season",
      trackedPlayersCount: { gte: 2 }
    },
    orderBy: { playedAt: "desc" },
    include: { map: true }
  });

  console.log(`Total community matches found: ${matches.length}`);
  console.log("----------------------------------------");
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    console.log(
      `${i + 1}. ID: ${m.id} | GC ID: ${m.gamersClubMatchId} | Map: ${m.map?.name} | Tracked: ${m.trackedPlayersCount} | PlayedAt: ${m.playedAt?.toISOString()}`
    );
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
