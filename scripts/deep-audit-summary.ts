import 'dotenv/config';
import { prisma } from '../src/server/db';
import * as fs from 'fs';

async function main() {
  console.log('=== VERIFICAÇÃO FINAL DE CONSISTÊNCIA DE TODAS AS 638 PARTIDAS ===');

  const matches = await prisma.match.findMany({
    include: {
      season: true,
      session: true,
    },
    orderBy: { playedAt: 'asc' }
  });

  // 1. Duplicações de GC ID
  const gcIdCount = new Map<string, string[]>();
  for (const m of matches) {
    if (m.gamersClubMatchId) {
      const list = gcIdCount.get(m.gamersClubMatchId) || [];
      list.push(m.id);
      gcIdCount.set(m.gamersClubMatchId, list);
    }
  }

  const duplicates = Array.from(gcIdCount.entries()).filter(([_, ids]) => ids.length > 1);
  console.log(`Partidas com gamersClubMatchId duplicado: ${duplicates.length}`);

  // 2. Partidas sem gamersClubMatchId
  const noGcId = matches.filter(m => !m.gamersClubMatchId);
  console.log(`Partidas sem gamersClubMatchId: ${noGcId.length}`);

  // 3. Verificação de limites das 30 partidas de Junho/2026
  const juneSeason = await prisma.season.findFirst({ where: { name: 'Junho/2026' } });
  const juneMatches = matches.filter(m => m.seasonId === juneSeason?.id);
  console.log(`Total partidas vinculadas a Junho/2026: ${juneMatches.length}`);

  let juneAnomalies = 0;
  for (const jm of juneMatches) {
    const brt = new Date(jm.playedAt.getTime() - 3 * 3600 * 1000);
    const monthBRT = brt.getUTCMonth() + 1;
    const yearBRT = brt.getUTCFullYear();
    if (monthBRT !== 6 || yearBRT !== 2026) {
      juneAnomalies++;
      console.log(`Anomalia em Junho: Match ${jm.id} (GC: ${jm.gamersClubMatchId}) @ ${jm.playedAt.toISOString()} (BRT: ${brt.toISOString()})`);
    }
  }
  console.log(`Partidas de Junho com anomalia de mês/ano em BRT: ${juneAnomalies}`);

  // 4. Verificação de todas as 638 partidas quanto a mês/ano civil em BRT vs Temporada
  const monthSeasonMismatches: any[] = [];
  for (const m of matches) {
    const brt = new Date(m.playedAt.getTime() - 3 * 3600 * 1000);
    const monthBRT = brt.getUTCMonth() + 1;
    const yearBRT = brt.getUTCFullYear();

    // Extrair mês e ano do nome da season: "Julho/2026" -> month 7, year 2026
    const seasonName = m.season.name;
    const [sMonthName, sYearStr] = seasonName.split('/');
    const sYear = parseInt(sYearStr, 10);

    const monthMap: Record<string, number> = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4,
      'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8,
      'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    const sMonth = monthMap[sMonthName];

    if (monthBRT !== sMonth || yearBRT !== sYear) {
      monthSeasonMismatches.push({
        matchId: m.id,
        gamersClubMatchId: m.gamersClubMatchId,
        playedAtUTC: m.playedAt.toISOString(),
        playedAtBRT: brt.toISOString().replace('T', ' ').substring(0, 19) + ' BRT',
        currentSeason: seasonName,
        expectedSeason: `${sMonthName}/${sYear}`,
        actualBRTMonthYear: `${monthBRT}/${yearBRT}`
      });
    }
  }

  console.log(`\nTotal de partidas com divergência entre Mês/Ano BRT e Temporada: ${monthSeasonMismatches.length}`);
  console.log(JSON.stringify(monthSeasonMismatches, null, 2));

  await prisma.$disconnect();
}

main();
