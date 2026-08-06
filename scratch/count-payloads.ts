import { prisma } from "@/server/db";

async function main() {
  const counts = await prisma.matchPayload.groupBy({
    by: ['source'],
    _count: {
      _all: true
    }
  });
  console.log("Match payloads by source:", counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
