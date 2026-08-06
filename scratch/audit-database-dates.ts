import "dotenv/config";
import { prisma } from "@/server/db";

async function main() {
  console.log("=== AUDITORIA TEMPORAL - AGOSTO/2026 ===");

  // Encontra a temporada Agosto/2026
  const season = await prisma.season.findFirst({
    where: { name: "Agosto/2026" }
  });

  if (!season) {
    console.error("Temporada Agosto/2026 não encontrada!");
    return;
  }

  console.log(`Temporada ID: ${season.id}, Status: ${season.status}`);

  // Busca todas as partidas da temporada
  const matches = await prisma.match.findMany({
    where: { seasonId: season.id },
    include: {
      playerStats: true
    },
    orderBy: { playedAt: "asc" }
  });

  console.log(`Total de partidas em Agosto/2026: ${matches.length}`);

  if (matches.length === 0) {
    return;
  }

  // Datas min/max
  const playedAts = matches.map(m => m.playedAt.getTime());
  const minDate = new Date(Math.min(...playedAts));
  const maxDate = new Date(Math.max(...playedAts));
  console.log(`Data mínima playedAt: ${minDate.toISOString()}`);
  console.log(`Data máxima playedAt: ${maxDate.toISOString()}`);

  // Distribuição por dia
  const dist: Record<string, number> = {};
  for (const m of matches) {
    const day = m.playedAt.toISOString().split("T")[0];
    dist[day] = (dist[day] || 0) + 1;
  }
  console.log("Distribuição por dia:", dist);

  // Auditoria de discrepâncias
  console.log("\n=== PARTIDAS COM DISCREPÂNCIAS (createdAt != playedAt) ===");
  let suspiciousCount = 0;

  for (const m of matches) {
    const pStr = m.playedAt.toISOString();
    
    // Busca se existe payload correspondente
    const payloads = await prisma.matchPayload.findMany({
      where: { sourceMatchId: m.gamersClubMatchId ?? "" }
    });

    const imports = await prisma.import.findMany({
      where: {
        rawPayload: {
          path: ["id"],
          equals: m.gamersClubMatchId
        }
      }
    });

    const hasGcPayload = payloads.some(p => p.source === "gamersclub");
    const hasGcImport = imports.length > 0;

    const isSuspicious = !m.gamersClubMatchId || (!hasGcPayload && !hasGcImport);

    if (isSuspicious) {
      console.log(`MATCH_ID: ${m.id} | GC_ID: ${m.gamersClubMatchId}`);
      console.log(`  playedAt:  ${pStr}`);
      console.log(`  GC Payload?: ${hasGcPayload ? "SIM" : "NÃO"} | GC Import?: ${hasGcImport ? "SIM" : "NÃO"}`);
      if (isSuspicious) {
        console.log("  ⚠️ [SUSPEITA]: Sem origem ou vínculo Gamers Club detectado!");
        suspiciousCount++;
      }
    }
  }

  console.log(`\nTotal de partidas sob suspeita de contaminação: ${suspiciousCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
