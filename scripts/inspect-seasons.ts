import 'dotenv/config';
import { prisma } from '../src/server/db';

function toBRT(d: Date): string {
  const brt = new Date(d.getTime() - 3 * 3600 * 1000);
  return brt.toISOString().replace('T', ' ').substring(0, 19) + ' BRT';
}

async function main() {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: 'asc' } });
  console.log('=== LIMITES EXATOS DE TODAS AS TEMPORADAS ===');
  console.table(seasons.map(s => ({
    id: s.id,
    name: s.name,
    startUTC: s.startDate.toISOString(),
    endUTC: s.endDate.toISOString(),
    startBRT: toBRT(s.startDate),
    endBRT: toBRT(s.endDate)
  })));

  await prisma.$disconnect();
}

main();
