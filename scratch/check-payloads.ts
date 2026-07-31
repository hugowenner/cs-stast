import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const count = await prisma.matchPayload.count();
  console.log("Total MatchPayloads in database:", count);

  const payloads = await prisma.matchPayload.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log("\nLast 20 MatchPayloads:");
  console.log("----------------------------------------");
  for (const p of payloads) {
    console.log(
      `ID: ${p.id} | SourceMatchID: ${p.sourceMatchId} | Status: ${p.status} | CreatedAt: ${p.createdAt.toISOString()}`
    );
    if (p.errorMessage) {
      console.log(`  Error: ${p.errorMessage}`);
    }
  }
}

main()
  .catch((err) => console.error("Error running script:", err))
  .finally(() => prisma.$disconnect());
