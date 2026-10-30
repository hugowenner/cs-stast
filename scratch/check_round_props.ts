import { prisma } from '../src/server/db';

async function main() {
  const match = await prisma.match.findUnique({
    where: { id: 'cmstjr337000b04ic5vfxqofy' },
    include: {
      playerStats: {
        include: { player: true }
      },
      entryDuels: true
    }
  });

  if (!match) return;

  const rounds = match.roundsJson as any[];
  console.log('Total entry duels:', match.entryDuels.length);
  
  // Group duels by roundNumber
  const duelsByRound = new Map<number, typeof match.entryDuels>();
  for (const d of match.entryDuels) {
    const list = duelsByRound.get(d.roundNumber) ?? [];
    list.push(d);
    duelsByRound.set(d.roundNumber, list);
  }

  // Check rounds
  for (const r of rounds) {
    const duels = duelsByRound.get(r.number) ?? [];
    const killer = duels.find(d => d.isKiller);
    const victim = duels.find(d => !d.isKiller);
    const killerPlayer = match.playerStats.find(ps => ps.playerId === killer?.playerId);
    const victimPlayer = match.playerStats.find(ps => ps.playerId === victim?.playerId);

    const mvpPlayer = match.playerStats.find(ps => ps.player.steamId === r.mvp_steamid);

    console.log(`R${r.number} [${r.type}] winner=${r.winner_team} reason=${r.reason} MVP=${mvpPlayer?.player.nickname} (Team ${mvpPlayer?.team}):`);
    if (killer && victim) {
      console.log(`   FK: ${killerPlayer?.player.nickname} (side=${killer.side}, team=${killerPlayer?.team}) vs ${victimPlayer?.player.nickname} (side=${victim.side}, team=${victimPlayer?.team})`);
    } else {
      console.log(`   No FK recorded`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
