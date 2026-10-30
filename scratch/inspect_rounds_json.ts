import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const m = await prisma.match.findFirst({
    where: { roundsJson: { not: null } },
    select: { roundsJson: true },
  });

  console.log("roundsJson sample round:", JSON.stringify((m?.roundsJson as any[])?.[1], null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
