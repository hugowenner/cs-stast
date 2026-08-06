import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== INSPEÇÃO DE PAYLOADS REAIS ===");

  const gcMatchId = "27590491";

  // Busca do Import
  const imports = await prisma.import.findMany({
    where: {
      rawPayload: {
        path: ["id"],
        equals: gcMatchId
      }
    }
  });

  console.log(`Imports encontrados: ${imports.length}`);
  for (const imp of imports) {
    console.log(`\nImport ID: ${imp.id} | Status: ${imp.status}`);
    console.log("Raw Payload:", JSON.stringify(imp.rawPayload, null, 2));
  }

  // Busca do MatchPayload
  const payloads = await prisma.matchPayload.findMany({
    where: { sourceMatchId: gcMatchId }
  });

  console.log(`\nMatchPayloads encontrados: ${payloads.length}`);
  for (const p of payloads) {
    console.log(`MatchPayload ID: ${p.id} | Source: ${p.source}`);
    console.log("Payload:", JSON.stringify(p.payload, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
