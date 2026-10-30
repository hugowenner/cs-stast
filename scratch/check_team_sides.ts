import { prisma } from '../src/server/db';

async function main() {
  const matches = await prisma.match.findMany({
    where: {
      demoUrl: { not: null },
      roundsJson: { not: null },
      entryDuels: { some: {} }
    },
    take: 5,
    include: {
      playerStats: {
        select: {
          playerId: true,
          team: true,
          player: { select: { nickname: true } }
        }
      }
    }
  });

  for (const m of matches) {
    console.log(`\n=== Match ${m.id} | Score: Team A ${m.scoreTeamA} x ${m.scoreTeamB} Team B ===`);
    const rounds = m.roundsJson as any[];
    if (Array.isArray(rounds)) {
      const nonExcluded = rounds.filter(r => !r.excluded_from_stats);
      let ctWins = 0;
      let tWins = 0;
      for (const r of nonExcluded) {
        if (r.winner_team === 'CT') ctWins++;
        if (r.winner_team === 'T') tWins++;
      }
      console.log(`Non-excluded rounds: ${nonExcluded.length}. CT wins: ${ctWins}, T wins: ${tWins}`);
      console.log(`Total non-excluded: ${ctWins + tWins}. Score sum: ${m.scoreTeamA + m.scoreTeamB}`);
      
      // Let's check first 3 rounds and rounds 13-14
      console.log('Round 1:', { type: rounds[0]?.type, winner_team: rounds[0]?.winner_team, reason: rounds[0]?.reason });
      console.log('Round 2:', { type: rounds[1]?.type, winner_team: rounds[1]?.winner_team, reason: rounds[1]?.reason });
      if (rounds.length >= 13) {
        console.log('Round 13:', { type: rounds[12]?.type, winner_team: rounds[12]?.winner_team, reason: rounds[12]?.reason });
      }
    }

    // Check entry duels in this match
    const duels = await prisma.playerEntryDuel.findMany({
      where: { matchId: m.id },
      take: 6,
      select: { roundNumber: true, isKiller: true, side: true, playerId: true }
    });
    console.log('Sample entry duels in match:', duels);
  }
}

main().catch(console.error).finally(() => process.exit(0));
