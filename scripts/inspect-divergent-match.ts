import 'dotenv/config';
import { prisma } from '../src/server/db';

async function main() {
  const matchId = 'cms9ufl0w000c04kwhrl1svga';
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      map: true,
      season: true,
      session: {
        include: {
          matches: {
            select: {
              id: true,
              gamersClubMatchId: true,
              playedAt: true,
              season: { select: { id: true, name: true } },
              map: { select: { name: true } },
              scoreTeamA: true,
              scoreTeamB: true
            },
            orderBy: { playedAt: 'asc' }
          }
        }
      },
      playerStats: {
        include: {
          player: { select: { nickname: true, steamId: true } }
        }
      }
    }
  });

  console.log('=== DETALHES COMPLETOS DA PARTIDA DIVERGENTE cms9ufl0w000c04kwhrl1svga ===');
  console.log(`GC ID: ${match?.gamersClubMatchId}`);
  console.log(`playedAt UTC: ${match?.playedAt.toISOString()}`);
  console.log(`playedAt BRT: ${match?.playedAt ? new Date(match.playedAt.getTime() - 3*3600*1000).toISOString().replace('T', ' ').substring(0, 19) + ' BRT' : ''}`);
  console.log(`Mapa: ${match?.map.name} | Placar: ${match?.scoreTeamA} x ${match?.scoreTeamB}`);
  console.log(`Season Atual: [${match?.season.name}] (ID: ${match?.seasonId})`);
  console.log(`Session ID: ${match?.sessionId} | Session Date: ${match?.session.date.toISOString()}`);
  console.log(`Total partidas na mesma Session: ${match?.session.matches.length}`);

  console.log('\nPartidas na mesma sessão:');
  for (const m of match?.session.matches || []) {
    const brt = new Date(m.playedAt.getTime() - 3*3600*1000).toISOString().replace('T', ' ').substring(0, 19) + ' BRT';
    console.log(` - Match ${m.id} (GC: ${m.gamersClubMatchId}): UTC=${m.playedAt.toISOString()} | BRT=${brt} | Season=${m.season.name} | ${m.map.name} (${m.scoreTeamA}x${m.scoreTeamB})`);
  }

  console.log('\nJogadores na partida:');
  for (const ps of match?.playerStats || []) {
    console.log(` - ${ps.player.nickname} (Team ${ps.team}): K=${ps.kills} D=${ps.deaths} ADR=${ps.adr} Rating=${ps.rating}`);
  }

  await prisma.$disconnect();
}

main();
