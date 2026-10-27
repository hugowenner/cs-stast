import 'dotenv/config';
import { prisma } from '../src/server/db';
import { loadCompetitiveDataset } from '../src/server/services/competitive.service';

async function main() {
  console.log('=== SIMULAÇÃO DE FILTRO DE MÍNIMO DE PARTIDAS EM JOGADORES MONITORADOS ===\n');

  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'asc' }
  });

  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true }
  });

  console.log(`Total de jogadores monitorados ativos: ${activePlayers.length}`);
  console.log(activePlayers.map(p => p.nickname).join(', '));
  console.log('');

  const thresholds = [1, 3, 5, 10];

  for (const s of seasons) {
    console.log(`------------------------------------------------------------`);
    console.log(`Temporada: ${s.name} [ID: ${s.id}] (${s.status})`);

    // Carregar dataset da temporada
    const ds = await loadCompetitiveDataset(s.id);

    // Contar total de partidas de cada jogador na temporada inteira
    const playerTotalMatches: { id: string; nickname: string; totalMatches: number; recentWindowMatches: number }[] = [];

    for (const player of activePlayers) {
      const stats = ds.statsByPlayer.get(player.id) ?? [];
      playerTotalMatches.push({
        id: player.id,
        nickname: player.nickname,
        totalMatches: stats.length,
        recentWindowMatches: Math.min(stats.length, 10)
      });
    }

    // Ordenar por total de partidas decrescente
    playerTotalMatches.sort((a, b) => b.totalMatches - a.totalMatches);

    const matchCounts = playerTotalMatches.map(p => `${p.nickname}: ${p.totalMatches}`);
    console.log(`Distribuição de jogos por jogador na temporada:\n  ${matchCounts.join(' | ')}`);

    console.log('\nImpacto dos limiares de mínimo de jogos:');
    for (const minMatches of thresholds) {
      // Nota: o usuário perguntou sobre mínimo de partidas na temporada selecionada.
      // Se o critério for sobre o total de partidas na temporada (stats.length >= minMatches)
      const remaining = playerTotalMatches.filter(p => p.totalMatches >= minMatches);
      const excluded = playerTotalMatches.filter(p => p.totalMatches > 0 && p.totalMatches < minMatches);
      const zeroMatches = playerTotalMatches.filter(p => p.totalMatches === 0);

      console.log(` - Mínimo >= ${minMatches} jogos:`);
      console.log(`   Permanece nos cards: ${remaining.length} jogadores (${remaining.map(p => `${p.nickname} (${p.totalMatches})`).join(', ') || 'NENHUM'})`);
      if (excluded.length > 0) {
        console.log(`   Deixariam de aparecer: ${excluded.length} jogadores (${excluded.map(p => `${p.nickname} (${p.totalMatches})`).join(', ')})`);
      } else {
        console.log(`   Deixariam de aparecer: 0 jogadores (com jogos)`);
      }
      if (remaining.length === 0) {
        console.log(`   [ALERTA] SEÇÃO FICARIA VAZIA!`);
      }
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
