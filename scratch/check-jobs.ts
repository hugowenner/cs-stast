import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const count = await prisma.syncJob.count();
  console.log("Total SyncJobs in database:", count);

  const jobs = await prisma.syncJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log("\nLast 20 SyncJobs:");
  console.log("----------------------------------------");
  for (const job of jobs) {
    console.log(
      `ID: ${job.id} | MatchID: ${job.sourceMatchId} | Status: ${job.status} | CreatedAt: ${job.createdAt.toISOString()}`
    );
    if (job.downloadUrl) {
      console.log(`  Download URL: ${job.downloadUrl}`);
    }
    if (job.errorMessage) {
      console.log(`  Error: ${job.errorMessage}`);
    }
  }

  const matchCount = await prisma.match.count();
  console.log("\nTotal Matches in database:", matchCount);

  const lastMatch = await prisma.match.findFirst({
    orderBy: { playedAt: "desc" },
    include: {
      map: true,
    }
  });
  if (lastMatch) {
    console.log(`Last match in database: ID: ${lastMatch.id} | GC ID: ${lastMatch.sourceMatchId} | Map: ${lastMatch.map?.name} | PlayedAt: ${lastMatch.playedAt.toISOString()}`);
  } else {
    console.log("No matches found in database.");
  }
}

main()
  .catch((err) => console.error("Error running script:", err))
  .finally(() => prisma.$disconnect());
