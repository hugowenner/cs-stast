import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const payloads = await prisma.matchPayload.findMany({
    take: 30,
    select: { payload: true },
  });

  const reasonsWhenPlanted = new Map<string, number>();
  let totalPlantedRounds = 0;

  for (const p of payloads) {
    const raw = p.payload as any;
    if (!raw || !Array.isArray(raw.rounds) || !Array.isArray(raw.round_facts)) continue;

    const roundPlantedMap = new Map<number, boolean>();
    for (const rf of raw.round_facts) {
      if (rf.bomb_planted_tick !== null && rf.bomb_planted_tick !== undefined) {
        roundPlantedMap.set(rf.round_number, true);
      }
    }

    for (const r of raw.rounds) {
      if (roundPlantedMap.get(r.number)) {
        totalPlantedRounds++;
        const reason = r.reason || "unknown";
        reasonsWhenPlanted.set(reason, (reasonsWhenPlanted.get(reason) || 0) + 1);
      }
    }
  }

  console.log(`Total de rounds com plant confirmado (bomb_planted_tick): ${totalPlantedRounds}`);
  for (const [k, v] of reasonsWhenPlanted.entries()) {
    console.log(`  - ${k}: ${v} (${((v / totalPlantedRounds) * 100).toFixed(1)}%)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
