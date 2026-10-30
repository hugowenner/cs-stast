import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const matches = await prisma.match.findMany({
    where: { roundsJson: { not: null } },
    take: 50,
    select: { roundsJson: true },
  });

  const reasons = new Map<string, number>();
  let totalRounds = 0;

  for (const m of matches) {
    const rounds = m.roundsJson as any[];
    if (!Array.isArray(rounds)) continue;
    for (const r of rounds) {
      totalRounds++;
      const reason = r.reason || "unknown";
      reasons.set(reason, (reasons.get(reason) || 0) + 1);
    }
  }

  console.log(`Analisados ${totalRounds} rounds em 50 matches:`);
  for (const [k, v] of reasons.entries()) {
    console.log(`  - ${k}: ${v} (${((v / totalRounds) * 100).toFixed(1)}%)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
