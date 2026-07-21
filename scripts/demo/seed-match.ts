/**
 * Ingesta o fixture de exemplo através do pipeline REAL (adapter → Zod → Services →
 * engines → banco) — não é um INSERT direto, então também serve como fumaça de que o
 * pipeline inteiro funciona. Usado por `npm run demo`.
 */
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import { ingestMatchSync } from "@/server/services/match.service";
import matchStandard from "@/server/adapters/gamersclub/fixtures/match-standard.json";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";

async function main() {
  const normalized = normalizeGamersClubMatch(matchStandard as GamersClubMatchPayload);
  const result = await ingestMatchSync(normalized, {
    rawPayload: matchStandard,
    source: "demo-fixture",
  });
  console.log(`[demo] partida de exemplo: ${result.status} (matchId interno: ${result.matchId})`);
}

main()
  .catch((error) => {
    console.error("[demo] falha ao semear partida de exemplo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/server/db");
    await prisma.$disconnect();
  });
