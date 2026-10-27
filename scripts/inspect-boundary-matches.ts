import 'dotenv/config';
import { prisma } from '../src/server/db';

function toBRT(d: Date): string {
  const brt = new Date(d.getTime() - 3 * 3600 * 1000);
  return brt.toISOString().replace('T', ' ').substring(0, 19) + ' BRT';
}

async function main() {
  const matches = await prisma.match.findMany({
    include: {
      season: true
    },
    orderBy: { playedAt: 'asc' }
  });

  console.log('=== PARTIDAS NA FRONTEIRA DE MÊS (ENTRE 20h BRT DO ÚLTIMO DIA E 04h BRT DO PRIMEIRO DIA) ===');
  let boundaryMatchesCount = 0;

  for (const m of matches) {
    const brt = new Date(m.playedAt.getTime() - 3 * 3600 * 1000);
    const day = brt.getUTCDate();
    const hours = brt.getUTCHours();
    const month = brt.getUTCMonth() + 1;
    const year = brt.getUTCFullYear();

    // Último dia do mês (28, 29, 30 ou 31) com horário >= 20h
    // OU dia 1 do mês com horário <= 4h
    const isLastDayNight = (day >= 28 && hours >= 20);
    const isFirstDayMorning = (day === 1 && hours <= 4);

    if (isLastDayNight || isFirstDayMorning) {
      boundaryMatchesCount++;
      console.log(`Match ${m.id} (GC: ${m.gamersClubMatchId}): UTC=${m.playedAt.toISOString()} | BRT=${toBRT(m.playedAt)} | SeasonAtual=${m.season.name} (${m.season.startDate.toISOString().substring(0,10)} a ${m.season.endDate.toISOString().substring(0,10)})`);
    }
  }

  console.log(`\nTotal de partidas em fronteiras de virada de mês: ${boundaryMatchesCount}`);
  await prisma.$disconnect();
}

main();
