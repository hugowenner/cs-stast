import 'dotenv/config';
import { prisma } from '../src/server/db';
import { loadCompetitiveDataset, getDashboardCompetitiveBundle } from '../src/server/services/competitive.service';
import { transformMonitoredPlayersForCarousel } from '../src/lib/monitored-players';

async function main() {
  console.log('=== VERIFICAÇÃO EM DEV DA SEÇÃO JOGADORES MONITORADOS ===\n');

  const seasonsToTest = [
    { name: 'Outubro/2026 (Ativa, volume alto)', id: 'cmuow54kq223v01rxwlfgd6o9' },
    { name: 'Setembro/2026 (Fechada, com snapshot)', id: 'season-sep-2026' },
    { name: 'Junho/2026 (Amostra mista: 1 completa, 1 inicial)', id: 'cmubaw1qu1nh901rxm4slybld' },
    { name: 'Maio/2026 (Sem elegíveis: 1 jogador com 1 partida)', id: 'cmsxy6mgg00h204jpw6vnigun' },
  ];

  for (const s of seasonsToTest) {
    console.log(`============================================================`);
    console.log(`Temporada: ${s.name}`);

    // Verificar se tem snapshot
    const snapshot = await prisma.seasonSnapshot.findUnique({ where: { seasonId: s.id } });
    let competitiveBundle;

    if (snapshot) {
      console.log(`[Fonte: SNAPSHOT ARQUIVADO]`);
      const dash = snapshot.dashboard as any;
      competitiveBundle = dash.dashboard ? dash.dashboard.competitive : dash.competitive;
    } else {
      console.log(`[Fonte: LIVE DATASET]`);
      const ds = await loadCompetitiveDataset(s.id);
      competitiveBundle = await getDashboardCompetitiveBundle(ds);
    }

    const monitoredPlayers = competitiveBundle.monitoredPlayers ?? [];

    const seasonMatchesFallbackMap = new Map<string, number>();
    if (competitiveBundle.powerRanking) {
      for (const pr of competitiveBundle.powerRanking) {
        seasonMatchesFallbackMap.set(pr.player.id, pr.matchCount);
      }
    }

    const carousel = transformMonitoredPlayersForCarousel(monitoredPlayers, seasonMatchesFallbackMap);

    console.log(`Total brutos: ${monitoredPlayers.length} | No Carrossel: ${carousel.length}`);

    if (carousel.length === 0) {
      console.log(`-> ESTADO VAZIO EXIBIDO: "Nenhum jogador atingiu o mínimo de 5 partidas nesta temporada."`);
    } else {
      console.log('\nCards Gerados no Carrossel:');
      for (const c of carousel) {
        const rankLabel = c.isInitialSample ? '[AMOSTRA INICIAL]' : `RANK #${c.displayRank}${c.displayRank === 1 ? ' [DESTAQUE OURO]' : ''}`;
        console.log(` - ${c.player.nickname.padEnd(16)} | ${rankLabel.padEnd(20)} | Rating: ${c.rating.toFixed(2)} | Amostra: ${c.sampleMatches}j | Total Temporada: ${c.totalSeasonMatches}j | Winrate: ${c.winrate}%`);
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
