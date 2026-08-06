import { prisma } from "@/server/db";

async function main() {
  const counts = await prisma.import.groupBy({
    by: ['source', 'status'],
    _count: { _all: true }
  });
  console.log("Imports group by source and status:", counts);

  const sample = await prisma.import.findFirst({
    where: {
      source: "gamersclub",
      status: "SUCCESS",
      rawPayload: { not: null }
    },
    select: {
      id: true,
      rawPayload: true
    }
  });

  if (sample) {
    console.log("Sample rawPayload keys:", Object.keys(sample.rawPayload as object));
  } else {
    console.log("No completed gamersclub import with rawPayload found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
