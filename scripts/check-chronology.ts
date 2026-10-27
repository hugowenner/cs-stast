import 'dotenv/config';
import { prisma } from '../src/server/db';

async function main() {
  const matches = await prisma.match.findMany({
    where: { gamersClubMatchId: { not: null } },
    select: {
      id: true,
      gamersClubMatchId: true,
      playedAt: true,
      season: { select: { name: true } }
    },
    orderBy: { playedAt: 'asc' }
  });

  console.log(`=== AUDITORIA CRONOLÓGICA: GC MATCH ID vs PLAYED_AT (${matches.length} partidas) ===`);

  let chronologicalAnomalies = 0;
  for (let i = 0; i < matches.length - 1; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const currentGcId = parseInt(current.gamersClubMatchId!, 10);
    const nextGcId = parseInt(next.gamersClubMatchId!, 10);

    // Se a partida seguinte no tempo tem um ID GC significativamente menor que a anterior
    // (tolerância pequena de partidas simultâneas que iniciam/terminam com alguns minutos de diferença)
    if (nextGcId < currentGcId) {
      const timeDiffMinutes = (next.playedAt.getTime() - current.playedAt.getTime()) / (60 * 1000);
      const idDiff = currentGcId - nextGcId;

      // Anomalia real se timeDiff > 3 horas ou idDiff > 10000
      if (timeDiffMinutes > 180 || idDiff > 10000) {
        chronologicalAnomalies++;
        console.log(`[ANOMALIA CRONOLÓGICA FORTE]`);
        console.log(`  Match ${current.id} (GC: ${currentGcId}) @ ${current.playedAt.toISOString()} [${current.season.name}]`);
        console.log(`  Match ${next.id} (GC: ${nextGcId}) @ ${next.playedAt.toISOString()} [${next.season.name}]`);
        console.log(`  Diff tempo: ${timeDiffMinutes.toFixed(1)} min, Diff ID: -${idDiff}`);
      }
    }
  }

  console.log(`Total de anomalias cronológicas severas encontradas: ${chronologicalAnomalies}`);

  // Verificar anos das partidas
  const yearDistribution: Record<number, number> = {};
  for (const m of matches) {
    const y = m.playedAt.getUTCFullYear();
    yearDistribution[y] = (yearDistribution[y] || 0) + 1;
  }
  console.log('Distribuição por ano UTC:', yearDistribution);

  await prisma.$disconnect();
}

main();
