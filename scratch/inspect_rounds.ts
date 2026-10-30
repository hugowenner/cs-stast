import { prisma } from '../src/server/db';

async function main() {
  // Find a match with demoUrl and roundsJson
  const match = await prisma.match.findFirst({
    where: {
      demoUrl: { not: null },
      roundsJson: { not: null },
      entryDuels: { some: {} }
    },
    include: {
      playerStats: {
        select: {
          playerId: true,
          team: true,
          player: { select: { nickname: true } }
        }
      },
      entryDuels: {
        take: 5,
        orderBy: { roundNumber: 'asc' }
      }
    }
  });

  if (!match) {
    console.log('No match found with roundsJson and entryDuels');
    return;
  }

  console.log('Match ID:', match.id, 'Score:', match.scoreTeamA, 'x', match.scoreTeamB);
  console.log('Players Team A:', match.playerStats.filter(p => p.team === 'A').map(p => p.player.nickname));
  console.log('Players Team B:', match.playerStats.filter(p => p.team === 'B').map(p => p.player.nickname));

  const rounds = match.roundsJson as any;
  console.log('Rounds count:', Array.isArray(rounds) ? rounds.length : typeof rounds);
  if (Array.isArray(rounds)) {
    console.log('Sample round 1:', JSON.stringify(rounds[0], null, 2));
    console.log('Sample round 12:', JSON.stringify(rounds[11], null, 2));
    console.log('Sample round 13:', JSON.stringify(rounds[12], null, 2));
    console.log('Sample round last:', JSON.stringify(rounds[rounds.length - 1], null, 2));
  }

  console.log('Sample entry duels:', JSON.stringify(match.entryDuels, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
