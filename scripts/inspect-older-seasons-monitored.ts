import 'dotenv/config';
import { prisma } from '../src/server/db';
import { loadCompetitiveDataset } from '../src/server/services/competitive.service';

async function main() {
  const seasons = await prisma.season.findMany({
    where: { startDate: { lt: new Date('2026-06-01') } },
    orderBy: { startDate: 'asc' }
  });

  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true }
  });

  for (const s of seasons) {
    console.log(`=== ${s.name} (Total partidas no banco: ${(await prisma.match.count({ where: { seasonId: s.id } }))}) ===`);
    const ds = await loadCompetitiveDataset(s.id);
    const playerCounts = activePlayers
      .map(p => ({ nickname: p.nickname, count: ds.statsByPlayer.get(p.id)?.length || 0 }))
      .filter(p => p.count > 0);

    console.log('Jogadores com jogos:', playerCounts.map(p => `${p.nickname}: ${p.count}`).join(', ') || 'NENHUM JOGADOR MONITORADO');
    for (const min of [1, 3, 5, 10]) {
      const remaining = playerCounts.filter(p => p.count >= min);
      console.log(` - Min >= ${min}: ${remaining.length} jogadores (${remaining.map(p => p.nickname).join(', ') || 'NENHUM'})`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main();
