import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  const gcMatchId = "27590491";

  // Busca do MatchPayload da Gamers Club
  const payloadRecord = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: gcMatchId, source: "gamersclub" }
  });

  if (!payloadRecord) {
    console.error("MatchPayload da Gamers Club não encontrado!");
    return;
  }

  const raw = payloadRecord.payload as any;
  console.log("Keys of GC Payload:", Object.keys(raw));
  console.log("Entire Payload Snippet (first 1000 chars):", JSON.stringify(raw).slice(0, 1000));
}

main().catch(console.error).finally(() => prisma.$disconnect());
