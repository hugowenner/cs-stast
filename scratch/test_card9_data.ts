import { prisma } from '../src/server/db';
import { loadCompetitiveDataset } from '../src/server/services/competitive.service';

function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

function isLoss(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA < s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB < s.match.scoreTeamA)
  );
}

async function testSeason(seasonName: string, seasonId?: string | 'all') {
  console.log(`\n=================== Season: ${seasonName} ===================`);
  const dataset = await loadCompetitiveDataset(seasonId);
  const { activePlayers, statsByPlayer } = dataset;

  interface DuoPairStats {
    playerA: { id: string; nickname: string; avatarUrl: string | null };
    playerB: { id: string; nickname: string; avatarUrl: string | null };
    total: number;
    wins: number;
    losses: number;
    ties: number;
    winrate: number;
    lossRate: number;
    lastMatchPlayedAt: Date | null;
  }

  const allDuoPairs: DuoPairStats[] = [];

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];

      const statsA = statsByPlayer.get(pA.id) ?? [];
      const statsB = statsByPlayer.get(pB.id) ?? [];
      const statsBByMatch = new Map(statsB.map(s => [s.matchId, s]));

      let total = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let lastMatchPlayedAt: Date | null = null;

      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.matchId);
        // Regra estrita: participaram NO MESMO TIME na partida comunitária
        if (sB && sA.team === sB.team) {
          total++;
          if (isWin(sA)) wins++;
          else if (isLoss(sA)) losses++;
          else ties++;

          const playedAt = sA.match.playedAt;
          if (!lastMatchPlayedAt || playedAt > lastMatchPlayedAt) {
            lastMatchPlayedAt = playedAt;
          }
        }
      }

      if (total >= 10) {
        allDuoPairs.push({
          playerA: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
          playerB: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
          total,
          wins,
          losses,
          ties,
          winrate: Math.round((wins / total) * 100),
          lossRate: Math.round((losses / total) * 100),
          lastMatchPlayedAt,
        });
      }
    }
  }

  console.log(`Eligible duos (>= 10 matches together): ${allDuoPairs.length}`);

  if (allDuoPairs.length === 0) {
    console.log('No eligible duos with >= 10 matches in this period.');
    return;
  }

  // 1. Com quem mais ganha (mais vitórias)
  const topWins = [...allDuoPairs].sort((a, b) => b.wins - a.wins || b.winrate - a.winrate || b.total - a.total)[0];
  console.log(`A. Com quem mais ganha: ${topWins.playerA.nickname} + ${topWins.playerB.nickname}: ${topWins.wins} vitórias em ${topWins.total} partidas (${topWins.winrate}%)`);

  // 2. Com quem mais perde (mais derrotas)
  const topLosses = [...allDuoPairs].sort((a, b) => b.losses - a.losses || b.lossRate - a.lossRate || b.total - a.total)[0];
  console.log(`B. Com quem mais perde: ${topLosses.playerA.nickname} + ${topLosses.playerB.nickname}: ${topLosses.losses} derrotas em ${topLosses.total} partidas (${topLosses.lossRate}% derrotas)`);

  // 3. Melhor aproveitamento (maior winrate)
  const bestWinrate = [...allDuoPairs].sort((a, b) => b.winrate - a.winrate || b.wins - a.wins || b.total - a.total)[0];
  console.log(`C. Melhor aproveitamento: ${bestWinrate.playerA.nickname} + ${bestWinrate.playerB.nickname}: ${bestWinrate.winrate}% (${bestWinrate.wins}V - ${bestWinrate.losses}D em ${bestWinrate.total} partidas)`);

  // 4. Pior aproveitamento (menor winrate)
  const worstWinrate = [...allDuoPairs].sort((a, b) => a.winrate - b.winrate || b.losses - a.losses || b.total - a.total)[0];
  console.log(`D. Pior aproveitamento: ${worstWinrate.playerA.nickname} + ${worstWinrate.playerB.nickname}: ${worstWinrate.winrate}% (${worstWinrate.wins}V - ${worstWinrate.losses}D em ${worstWinrate.total} partidas)`);

  // Test per-player view for PERNA PELUDA
  const perna = activePlayers.find(p => p.nickname.toLowerCase().includes('perna'));
  if (perna) {
    console.log(`\n--- Parceiros de: ${perna.nickname} ---`);
    const pernaDuos = allDuoPairs.filter(d => d.playerA.id === perna.id || d.playerB.id === perna.id).map(d => {
      const partner = d.playerA.id === perna.id ? d.playerB : d.playerA;
      return { partner: partner.nickname, total: d.total, wins: d.wins, losses: d.losses, winrate: d.winrate };
    });
    console.log(`Duos for ${perna.nickname} (>= 10 matches): ${pernaDuos.length}`);
    console.table(pernaDuos);
  }
}

async function main() {
  const oct = await prisma.season.findFirst({ where: { name: 'Outubro/2026' } });
  if (oct) await testSeason('Outubro/2026', oct.id);

  const sep = await prisma.season.findFirst({ where: { name: 'Setembro/2026' } });
  if (sep) await testSeason('Setembro/2026', sep.id);

  await testSeason('Carreira (all)', 'all');
}

main().catch(console.error).finally(() => process.exit(0));
