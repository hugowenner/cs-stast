import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const p = await prisma.matchPayload.findFirst({
    select: {
      sourceMatchId: true,
      parserVersion: true,
      schemaVersion: true,
      payload: true,
    },
  });

  if (!p) {
    console.log("No payload found");
    return;
  }

  const raw = p.payload as any;
  console.log("Match ID:", p.sourceMatchId);
  console.log("Parser Version:", p.parserVersion);
  console.log("Schema Version:", p.schemaVersion);

  console.log("\n--- BLIND EVENTS SAMPLE (first 3) ---");
  console.log(JSON.stringify(raw.blind_events?.slice?.(0, 3), null, 2));

  console.log("\n--- DAMAGE SAMPLE (first 3) ---");
  console.log(JSON.stringify(raw.damage?.slice?.(0, 3), null, 2));

  console.log("\n--- ECONOMY SAMPLE (first 3) ---");
  console.log(JSON.stringify(raw.economy?.slice?.(0, 3), null, 2));

  console.log("\n--- PURCHASES SAMPLE (first 3) ---");
  console.log(JSON.stringify(raw.purchases?.slice?.(0, 3), null, 2));

  console.log("\n--- KILLS SAMPLE (first 2 with analytics) ---");
  const killsWithAntiEco = raw.kills?.filter?.((k: any) => k.analytics?.anti_eco !== undefined) || [];
  console.log(JSON.stringify(killsWithAntiEco.slice(0, 2), null, 2));

  console.log("\n--- ROUND FACTS SAMPLE (first 2) ---");
  console.log(JSON.stringify(raw.round_facts?.slice?.(0, 2), null, 2));

  console.log("\n--- PLAYERS SAMPLE (keys and first player) ---");
  console.log("Players type:", typeof raw.players, Array.isArray(raw.players) ? "array" : "object");
  if (Array.isArray(raw.players)) {
    console.log("Player[0]:", JSON.stringify(raw.players[0], null, 2));
  } else if (raw.players) {
    const firstKey = Object.keys(raw.players)[0];
    console.log(`Player ${firstKey}:`, JSON.stringify(raw.players[firstKey], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
