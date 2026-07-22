import { prisma } from "@/server/db";

export interface PowerRankingEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  powerScore: number;
  rating: number;
  impact: number;
  kast: number;
  winrate: number;
  adr: number;
  forma: string; // Emojis de fogo (🔥) ou gelo (❄️)
}

export interface PlayerEvolutionEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  seasonRating: number;
  recentRating: number;
  diffPercent: number;
  trend: "up" | "down" | "stable";
}

export interface PlayerArchetype {
  player: { id: string; nickname: string; avatarUrl: string | null };
  archetype: "entry" | "clutch" | "headshot" | "consistent" | "tactician";
  label: string;
  metricLabel: string;
  metricValue: string;
}

export interface JogadorDaSemanaInfo {
  player: { id: string; nickname: string; avatarUrl: string | null };
  rating: number;
  winrate: number;
  evolution: number;
  powerScore: number;
}

export interface DuoSummary {
  playerA: { id: string; nickname: string; avatarUrl: string | null };
  playerB: { id: string; nickname: string; avatarUrl: string | null };
  total: number;
  wins: number;
  winrate: number;
  avgRating: number;
}

export interface MapSpecialist {
  mapName: string;
  player: { id: string; nickname: string; avatarUrl: string | null };
  rating: number;
}

export interface PlayerMomentumEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  recentRating: number;
  priorRating: number;
  recentWinrate: number;
  priorWinrate: number;
  status: "up" | "stable" | "down";
  label: string;
}

export interface DecisivePlayerEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  impactPercent: number;
  entryKills: number;
  tradeKills: number;
  clutchWins: number;
}

export interface TrioSummary {
  players: { id: string; nickname: string; avatarUrl: string | null }[];
  total: number;
  wins: number;
  winrate: number;
  avgRating: number;
}

export interface PlayerMatchupSummary {
  player: { id: string; nickname: string; avatarUrl: string | null };
  dominates: {
    rivalName: string;
    total: number;
    wins: number;
  } | null;
  struggles: {
    rivalName: string;
    total: number;
    wins: number;
  } | null;
}

export async function getPowerRanking(take = 5): Promise<PowerRankingEntry[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const entries: PowerRankingEntry[] = [];

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      include: { match: true },
    });

    if (stats.length === 0) continue;

    const totalMatches = stats.length;
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const avgImpact = stats.reduce((sum, s) => sum + s.impact, 0) / totalMatches;
    const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / totalMatches;
    const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / totalMatches;

    let wins = 0;
    for (const s of stats) {
      const won =
        (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
        (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
      if (won) wins++;
    }
    const winrate = (wins / totalMatches) * 100;

    const ratingScore = Math.min(100, (avgRating / 1.6) * 100);
    const impactScore = Math.min(100, (avgImpact / 1.6) * 100);
    const winrateScore = winrate;
    const adrScore = Math.min(100, (avgAdr / 100) * 100);
    const kastScore = avgKast;

    const powerScore = Math.round(
      ratingScore * 0.4 +
        impactScore * 0.2 +
        winrateScore * 0.2 +
        adrScore * 0.1 +
        kastScore * 0.1
    );

    const recentStats = [...stats]
      .sort((a, b) => new Date(b.match.playedAt).getTime() - new Date(a.match.playedAt).getTime())
      .slice(0, 5);

    let recentWins = 0;
    for (const s of recentStats) {
      const won =
        (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
        (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
      if (won) recentWins++;
    }

    let forma = "❄️";
    if (recentWins === 5) forma = "🔥🔥🔥🔥🔥";
    else if (recentWins === 4) forma = "🔥🔥🔥🔥";
    else if (recentWins === 3) forma = "🔥🔥🔥";
    else if (recentWins === 2) forma = "🔥🔥";
    else if (recentWins === 1) forma = "🔥";

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      powerScore,
      rating: Number(avgRating.toFixed(2)),
      impact: Number(avgImpact.toFixed(2)),
      kast: Math.round(avgKast),
      winrate: Math.round(winrate),
      adr: Math.round(avgAdr),
      forma,
    });
  }

  return entries.sort((a, b) => b.powerScore - a.powerScore).slice(0, take);
}

export async function getPlayerEvolutions(take = 3): Promise<PlayerEvolutionEntry[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const entries: PlayerEvolutionEntry[] = [];

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      include: { match: true },
    });

    if (stats.length < 5) continue;

    const totalMatches = stats.length;
    const seasonRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;

    const recentStats = [...stats]
      .sort((a, b) => new Date(b.match.playedAt).getTime() - new Date(a.match.playedAt).getTime())
      .slice(0, 10);

    const recentRating = recentStats.reduce((sum, s) => sum + s.rating, 0) / recentStats.length;

    const diffPercent = ((recentRating - seasonRating) / seasonRating) * 100;
    const trend = diffPercent > 3 ? "up" : diffPercent < -3 ? "down" : "stable";

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      seasonRating: Number(seasonRating.toFixed(2)),
      recentRating: Number(recentRating.toFixed(2)),
      diffPercent: Math.round(diffPercent),
      trend,
    });
  }

  return entries.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent)).slice(0, take);
}

export async function getPlayerArchetypes(): Promise<PlayerArchetype[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const archetypes: PlayerArchetype[] = [];

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
    });

    if (stats.length === 0) continue;

    const totalMatches = stats.length;
    const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
    const totalHeadshots = stats.reduce((sum, s) => sum + s.headshots, 0);
    const totalEntryKills = stats.reduce((sum, s) => sum + s.entryKills, 0);
    const totalEntryDeaths = stats.reduce((sum, s) => sum + s.entryDeaths, 0);

    const totalClutchWins = stats.reduce(
      (sum, s) =>
        sum +
        s.clutch1v1Wins +
        s.clutch1v2Wins +
        s.clutch1v3Wins +
        s.clutch1v4Wins +
        s.clutch1v5Wins,
      0
    );

    const hsRate = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
    const entrySuccess =
      totalEntryKills + totalEntryDeaths > 0
        ? (totalEntryKills / (totalEntryKills + totalEntryDeaths)) * 100
        : 0;

    const consistentGames = stats.filter((s) => s.rating >= 1.0).length;
    const consistencyRate = (consistentGames / totalMatches) * 100;

    let archetype: PlayerArchetype["archetype"] = "tactician";
    let label = "🧠 Estrategista";
    let metricLabel = "Consistência de Jogo";
    let metricValue = `${consistencyRate.toFixed(0)}% rounds`;

    if (hsRate >= 52) {
      archetype = "headshot";
      label = "💀 Headshot Machine";
      metricLabel = "Taxa de HS";
      metricValue = `${hsRate.toFixed(1)}% das kills`;
    } else if (entrySuccess >= 53 && totalEntryKills > 8) {
      archetype = "entry";
      label = "⚔️ Entry King";
      metricLabel = "Aproveitamento de Entradas";
      metricValue = `${entrySuccess.toFixed(1)}% (${totalEntryKills} kills)`;
    } else if (totalClutchWins >= 5) {
      archetype = "clutch";
      label = "🧊 Clutch Master";
      metricLabel = "Vitórias em Clutch";
      metricValue = `${totalClutchWins} rounds salvos`;
    } else if (consistencyRate >= 70) {
      archetype = "consistent";
      label = "📊 Máquina de Consistência";
      metricLabel = "Partidas Estáveis (Rating >= 1.0)";
      metricValue = `${consistencyRate.toFixed(0)}% (${consistentGames}/${totalMatches})`;
    }

    archetypes.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      archetype,
      label,
      metricLabel,
      metricValue,
    });
  }

  return archetypes;
}

export async function getJogadorDaSemana(): Promise<JogadorDaSemanaInfo | null> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  let bestPlayer: JogadorDaSemanaInfo | null = null;
  let highestRecentRating = 0;

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      include: { match: true },
    });

    const recentStats = [...stats]
      .sort((a, b) => new Date(b.match.playedAt).getTime() - new Date(a.match.playedAt).getTime())
      .slice(0, 10);

    if (recentStats.length < 3) continue;

    const recentMatchesCount = recentStats.length;
    const avgRatingRecent = recentStats.reduce((sum, s) => sum + s.rating, 0) / recentMatchesCount;

    if (avgRatingRecent > highestRecentRating) {
      highestRecentRating = avgRatingRecent;

      const seasonRating = stats.reduce((sum, s) => sum + s.rating, 0) / stats.length;
      const evolution = ((avgRatingRecent - seasonRating) / seasonRating) * 100;

      let recentWins = 0;
      for (const s of recentStats) {
        const won =
          (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
          (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
        if (won) recentWins++;
      }
      const winrateRecent = (recentWins / recentMatchesCount) * 100;

      const avgImpact = stats.reduce((sum, s) => sum + s.impact, 0) / stats.length;
      const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / stats.length;
      const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / stats.length;
      let totalWins = 0;
      for (const s of stats) {
        const won =
          (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
          (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
        if (won) totalWins++;
      }
      const winrateSeason = (totalWins / stats.length) * 100;

      const ratingScore = Math.min(100, (seasonRating / 1.6) * 100);
      const impactScore = Math.min(100, (avgImpact / 1.6) * 100);
      const winrateScore = winrateSeason;
      const adrScore = Math.min(100, (avgAdr / 100) * 100);
      const kastScore = avgKast;

      const powerScore = Math.round(
        ratingScore * 0.4 +
          impactScore * 0.2 +
          winrateScore * 0.2 +
          adrScore * 0.1 +
          kastScore * 0.1
      );

      bestPlayer = {
        player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
        rating: Number(avgRatingRecent.toFixed(2)),
        winrate: Math.round(winrateRecent),
        evolution: Math.round(evolution),
        powerScore,
      };
    }
  }

  return bestPlayer;
}

export async function getDuoLeaderboard(take = 3): Promise<DuoSummary[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const playerStatsMap = new Map<string, any[]>();
  for (const p of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: p.id },
      include: { match: true },
    });
    playerStatsMap.set(p.id, stats);
  }

  const duos: DuoSummary[] = [];

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];
      const statsA = playerStatsMap.get(pA.id) || [];
      const statsB = playerStatsMap.get(pB.id) || [];
      const statsBByMatch = new Map(statsB.map((s) => [s.matchId, s]));

      let togetherTotal = 0;
      let togetherWins = 0;
      let ratingSum = 0;

      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.matchId);
        if (sB && sA.team === sB.team) {
          togetherTotal++;
          const won =
            (sA.team === "A" && sA.match.scoreTeamA > sA.match.scoreTeamB) ||
            (sA.team === "B" && sA.match.scoreTeamB > sA.match.scoreTeamA);
          if (won) togetherWins++;
          ratingSum += (sA.rating + sB.rating) / 2;
        }
      }

      if (togetherTotal >= 3) {
        duos.push({
          playerA: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
          playerB: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
          total: togetherTotal,
          wins: togetherWins,
          winrate: Math.round((togetherWins / togetherTotal) * 100),
          avgRating: Number((ratingSum / togetherTotal).toFixed(2)),
        });
      }
    }
  }

  return duos.sort((a, b) => b.winrate - a.winrate || b.avgRating - a.avgRating).slice(0, take);
}

export async function getMapSpecialists(): Promise<MapSpecialist[]> {
  const maps = await prisma.map.findMany();
  const specialists: MapSpecialist[] = [];

  for (const map of maps) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { match: { mapId: map.id }, player: { trackedPlayer: { active: true } } },
      include: { player: true },
    });

    const playerMapStats = new Map<string, { player: any; ratings: number[] }>();
    for (const s of stats) {
      const entry = playerMapStats.get(s.playerId) || { player: s.player, ratings: [] };
      entry.ratings.push(s.rating);
      playerMapStats.set(s.playerId, entry);
    }

    let bestRating = 0;
    let bestPlayer = null;

    for (const [_, entry] of playerMapStats.entries()) {
      if (entry.ratings.length >= 2) {
        const avg = entry.ratings.reduce((sum, r) => sum + r, 0) / entry.ratings.length;
        if (avg > bestRating) {
          bestRating = avg;
          bestPlayer = entry.player;
        }
      }
    }

    if (bestPlayer) {
      specialists.push({
        mapName: map.name,
        player: { id: bestPlayer.id, nickname: bestPlayer.nickname, avatarUrl: bestPlayer.avatarUrl },
        rating: Number(bestRating.toFixed(2)),
      });
    }
  }

  return specialists;
}

export async function getPlayerMomentum(take = 3): Promise<PlayerMomentumEntry[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const entries: PlayerMomentumEntry[] = [];

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      orderBy: { match: { playedAt: "desc" } },
      include: { match: true },
    });

    if (stats.length < 10) continue; // Mínimo 10 jogos no histórico para analisar momentum de 5v5

    // Janela recente: últimas 5 partidas. Janela anterior: 5 partidas antes destas
    const recentWindow = stats.slice(0, 5);
    const priorWindow = stats.slice(5, 10);

    const recentRating = recentWindow.reduce((sum, s) => sum + s.rating, 0) / 5;
    const priorRating = priorWindow.reduce((sum, s) => sum + s.rating, 0) / 5;

    let recentWins = 0;
    for (const s of recentWindow) {
      const won =
        (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
        (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
      if (won) recentWins++;
    }
    const recentWinrate = (recentWins / 5) * 100;

    let priorWins = 0;
    for (const s of priorWindow) {
      const won =
        (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
        (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA);
      if (won) priorWins++;
    }
    const priorWinrate = (priorWins / 5) * 100;

    const diff = recentRating - priorRating;
    let status: "up" | "stable" | "down" = "stable";
    let label = "Estável 🟡";

    if (diff > 0.05) {
      status = "up";
      label = "Em ascensão 🔥";
    } else if (diff < -0.05) {
      status = "down";
      label = "Caindo 🔴";
    }

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      recentRating: Number(recentRating.toFixed(2)),
      priorRating: Number(priorRating.toFixed(2)),
      recentWinrate: Math.round(recentWinrate),
      priorWinrate: Math.round(priorWinrate),
      status,
      label,
    });
  }

  // Ordena por maior diferença positiva para os em ascensão primeiro
  return entries.sort((a, b) => (b.recentRating - b.priorRating) - (a.recentRating - a.priorRating)).slice(0, take);
}

export async function getDecisivePlayers(take = 3): Promise<DecisivePlayerEntry[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const entries: DecisivePlayerEntry[] = [];

  for (const player of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: player.id },
      include: { match: true },
    });

    if (stats.length === 0) continue;

    const totalRounds = stats.reduce((sum, s) => sum + s.match.scoreTeamA + s.match.scoreTeamB, 0);
    if (totalRounds === 0) continue;

    const entryKills = stats.reduce((sum, s) => sum + s.entryKills, 0);
    const tradeKills = stats.reduce((sum, s) => sum + s.tradeKills, 0);
    const clutchWins = stats.reduce(
      (sum, s) =>
        sum +
        s.clutch1v1Wins +
        s.clutch1v2Wins +
        s.clutch1v3Wins +
        s.clutch1v4Wins +
        s.clutch1v5Wins,
      0
    );

    // Impacted Rounds = Entry Kills + Trade Kills + Clutches vencidos
    const impactedRounds = entryKills + tradeKills + clutchWins;
    const impactPercent = (impactedRounds / totalRounds) * 100;

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      impactPercent: Math.round(impactPercent),
      entryKills,
      tradeKills,
      clutchWins,
    });
  }

  return entries.sort((a, b) => b.impactPercent - a.impactPercent).slice(0, take);
}

export async function getDominantTrio(): Promise<TrioSummary | null> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const playerStatsMap = new Map<string, any[]>();
  for (const p of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: p.id },
      include: { match: true },
    });
    playerStatsMap.set(p.id, stats);
  }

  let bestTrio: TrioSummary | null = null;
  let bestTrioWinrate = 0;
  let bestTrioRating = 0;

  // Busca combinações de 3 jogadores
  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      for (let k = j + 1; k < activePlayers.length; k++) {
        const pA = activePlayers[i];
        const pB = activePlayers[j];
        const pC = activePlayers[k];

        const statsA = playerStatsMap.get(pA.id) || [];
        const statsB = playerStatsMap.get(pB.id) || [];
        const statsC = playerStatsMap.get(pC.id) || [];

        const statsBByMatch = new Map(statsB.map((s) => [s.matchId, s]));
        const statsCByMatch = new Map(statsC.map((s) => [s.matchId, s]));

        let togetherTotal = 0;
        let togetherWins = 0;
        let ratingSum = 0;

        for (const sA of statsA) {
          const sB = statsBByMatch.get(sA.matchId);
          const sC = statsCByMatch.get(sA.matchId);
          if (sB && sC && sA.team === sB.team && sA.team === sC.team) {
            togetherTotal++;
            const won =
              (sA.team === "A" && sA.match.scoreTeamA > sA.match.scoreTeamB) ||
              (sA.team === "B" && sA.match.scoreTeamB > sA.match.scoreTeamA);
            if (won) togetherWins++;
            ratingSum += (sA.rating + sB.rating + sC.rating) / 3;
          }
        }

        if (togetherTotal >= 3) {
          const winrate = (togetherWins / togetherTotal) * 100;
          const avgRating = ratingSum / togetherTotal;

          if (winrate > bestTrioWinrate || (winrate === bestTrioWinrate && avgRating > bestTrioRating)) {
            bestTrioWinrate = winrate;
            bestTrioRating = avgRating;
            bestTrio = {
              players: [
                { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
                { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
                { id: pC.id, nickname: pC.nickname, avatarUrl: pC.avatarUrl },
              ],
              total: togetherTotal,
              wins: togetherWins,
              winrate: Math.round(winrate),
              avgRating: Number(avgRating.toFixed(2)),
            };
          }
        }
      }
    }
  }

  return bestTrio;
}

export async function getPlayerMatchups(): Promise<PlayerMatchupSummary[]> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const playerStatsMap = new Map<string, any[]>();
  for (const p of activePlayers) {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId: p.id },
      select: {
        team: true,
        match: {
          select: {
            id: true,
            scoreTeamA: true,
            scoreTeamB: true,
          },
        },
      },
    });
    playerStatsMap.set(p.id, stats);
  }

  const summaries: PlayerMatchupSummary[] = [];

  for (const playerA of activePlayers) {
    const statsA = playerStatsMap.get(playerA.id) || [];
    let bestRival: PlayerMatchupSummary["dominates"] = null;
    let worstRival: PlayerMatchupSummary["struggles"] = null;
    let maxWinrate = -1;
    let minWinrate = 101;

    for (const playerB of activePlayers) {
      if (playerA.id === playerB.id) continue;

      const statsB = playerStatsMap.get(playerB.id) || [];
      const statsBByMatch = new Map(statsB.map((s) => [s.match.id, s]));

      let totalAgainst = 0;
      let winsA = 0;

      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.match.id);
        if (sB && sA.team !== sB.team) {
          totalAgainst++;
          const scoreSelf = sA.team === "A" ? sA.match.scoreTeamA : sA.match.scoreTeamB;
          const scoreOpp = sA.team === "A" ? sA.match.scoreTeamB : sA.match.scoreTeamA;
          if (scoreSelf > scoreOpp) winsA++;
        }
      }

      if (totalAgainst >= 3) {
        const winrateA = (winsA / totalAgainst) * 100;

        // Domina (winrate mais alto contra o oponente, maior que 55%)
        if (winrateA > 55 && winrateA > maxWinrate) {
          maxWinrate = winrateA;
          bestRival = {
            rivalName: playerB.nickname,
            total: totalAgainst,
            wins: winsA,
          };
        }

        // Tem dificuldade (winrate mais baixo contra o oponente, menor que 45%)
        if (winrateA < 45 && winrateA < minWinrate) {
          minWinrate = winrateA;
          worstRival = {
            rivalName: playerB.nickname,
            total: totalAgainst,
            wins: winsA,
          };
        }
      }
    }

    summaries.push({
      player: { id: playerA.id, nickname: playerA.nickname, avatarUrl: playerA.avatarUrl },
      dominates: bestRival,
      struggles: worstRival,
    });
  }

  return summaries;
}
