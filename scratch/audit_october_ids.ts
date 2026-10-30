import { prisma } from '../src/server/db';

async function main() {
  const ids = ['28120889', '28121066', '28124471'];
  for (const gcId of ids) {
    const match = await prisma.match.findUnique({
      where: { gamersClubMatchId: gcId },
      include: {
        entryDuels: true,
        clutches: true,
        trades: true,
        matchups: true,
        season: { select: { name: true } }
      }
    });
    console.log(`=== DEV Match GC ID: ${gcId} ===`);
    if (!match) {
      console.log('NOT FOUND in DEV!');
    } else {
      console.log(`Found in DEV! ID: ${match.id}, Season: ${match.season?.name}, demoUrl: ${match.demoUrl}, trackedPlayersCount: ${match.trackedPlayersCount}`);
      console.log('roundsJson exists?', !!match.roundsJson);
      console.log('entryDuels:', match.entryDuels.length);
      console.log('clutches:', match.clutches.length);
      console.log('trades:', match.trades.length);
      console.log('matchups:', match.matchups.length);

      // Check MatchPayload
      const payloads = await prisma.matchPayload.findMany({ where: { sourceMatchId: gcId } });
      console.log('MatchPayloads count in DEV:', payloads.length, payloads.map(p => ({ source: p.source, status: p.status, parserVersion: p.parserVersion })));
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
