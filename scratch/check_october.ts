import { prisma } from '../src/server/db';

async function main() {
  const season = await prisma.season.findFirst({ where: { name: 'Outubro/2026' } });
  console.log('Season:', season?.id, season?.name);

  // All matches in October 2026
  const matches = await prisma.match.findMany({
    where: { seasonId: season?.id },
    select: { id: true, demoUrl: true, trackedPlayersCount: true }
  });
  console.log('Total matches in October:', matches.length);
  const communityMatches = matches.filter(m => m.trackedPlayersCount >= 2);
  console.log('Community matches (trackedPlayersCount >= 2):', communityMatches.length);

  const allMatchIds = matches.map(m => m.id);
  const commMatchIds = communityMatches.map(m => m.id);

  // Check demo tables
  const clutches = await prisma.playerClutch.count({ where: { matchId: { in: commMatchIds } } });
  const entries = await prisma.playerEntryDuel.count({ where: { matchId: { in: commMatchIds } } });
  const trades = await prisma.playerTradeEvent.count({ where: { matchId: { in: commMatchIds } } });
  console.log('Demo events in October (community):', { clutches, entries, trades });

  // Check demo events across all matches
  const allClutches = await prisma.playerClutch.count({ where: { matchId: { in: allMatchIds } } });
  const allEntries = await prisma.playerEntryDuel.count({ where: { matchId: { in: allMatchIds } } });
  const allTrades = await prisma.playerTradeEvent.count({ where: { matchId: { in: allMatchIds } } });
  console.log('Demo events in October (all matches):', { allClutches, allEntries, allTrades });

  // Check PlayerMatchStats
  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId: { in: commMatchIds } },
    select: {
      playerId: true,
      entryKills: true,
      entryDeaths: true,
      clutchesWon: true,
      clutch1v1Wins: true,
      clutch1v2Wins: true,
      clutch1v3Wins: true,
      tradeKills: true,
    }
  });

  const sumClutchesWon = stats.reduce((acc, s) => acc + (s.clutchesWon || 0), 0);
  const sumTradeKills = stats.reduce((acc, s) => acc + (s.tradeKills || 0), 0);
  const sumEntryKills = stats.reduce((acc, s) => acc + (s.entryKills || 0), 0);
  const sumEntryDeaths = stats.reduce((acc, s) => acc + (s.entryDeaths || 0), 0);

  console.log('Stats totals in October (community):', {
    statsRecords: stats.length,
    sumClutchesWon,
    sumTradeKills,
    sumEntryKills,
    sumEntryDeaths
  });

  // Let's also check Setembro/2026 to see what Setembro had
  const sep = await prisma.season.findFirst({ where: { name: 'Setembro/2026' } });
  if (sep) {
    const sepMatches = await prisma.match.findMany({ where: { seasonId: sep.id }, select: { id: true, trackedPlayersCount: true } });
    const sepCommIds = sepMatches.filter(m => m.trackedPlayersCount >= 2).map(m => m.id);
    const sepClutches = await prisma.playerClutch.count({ where: { matchId: { in: sepCommIds } } });
    const sepEntries = await prisma.playerEntryDuel.count({ where: { matchId: { in: sepCommIds } } });
    const sepTrades = await prisma.playerTradeEvent.count({ where: { matchId: { in: sepCommIds } } });
    console.log('Setembro/2026 community demo events:', { sepMatches: sepMatches.length, sepClutches, sepEntries, sepTrades });
  }
}

main().catch(console.error).finally(() => process.exit(0));
