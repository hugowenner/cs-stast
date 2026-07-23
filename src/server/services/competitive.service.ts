import { prisma } from "@/server/db";

export interface PowerRankingEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  rating: number;
  impact: number;
  kast: number;
  winrate: number;
  adr: number;
  kd: number;
  matchCount: number;
  forma: string;
}

export interface PlayerEvolutionEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  seasonRating: number;
  recentRating: number;
  diffPercent: number;
  trend: "up" | "down" | "stable";
}

export interface PlayerArchetype {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  archetype: "entry" | "clutch" | "headshot" | "consistent" | "tactician" | "impact";
  label: string;
  metricLabel: string;
  metricValue: string;
  rankText: string;
}

export interface JogadorDaSemanaInfo {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  rating: number;
  winrate: number;
  evolution: number;
  evolutionText: string;
}

export interface PerformanceExtreme {
  player: { id: string; nickname: string; avatarUrl: string | null };
  rating: number;
  kills: number;
  deaths: number;
  adr: number;
  mapName: string;
  playedAt: string;
  kd: string;
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
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
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
  ratingChangeText: string; // Ex: "+47% Rating"
  winrateChangeText: string; // Ex: "+20% Winrate"
}

export interface DecisivePlayerEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  impactPercent: number;
  entryKills: number;
  tradeKills: number;
  clutchWins: number;
  hideTradesAndClutches: boolean; // Oculta se os dados de toda a comunidade forem 0
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

export interface WeeklyHighlight {
  id: string;
  category: "evolution" | "streak" | "record" | "leader" | "map";
  title: string;
  description: string;
  meta: string;
}

export interface HallOfFameRecord {
  category: string;
  playerName: string;
  value: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Dataset compartilhado — carrega jogadores ativos + TODAS as PlayerMatchStats
// deles (com match+map) em UMA única query, uma única vez. Todas as funções de
// cálculo abaixo recebem esse dataset em memória em vez de consultar o banco
// individualmente por jogador. Antes: cada função abaixo fazia 1 findMany por
// jogador ativo (até 9 funções x 11 jogadores = ~99 queries só nisso, na Dashboard
// inteira). Agora: 2 queries no total (jogadores + stats), reaproveitadas por tudo.
// ---------------------------------------------------------------------------

type PlayerRow = { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };

async function loadCompetitiveDataset() {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  const allStats = await prisma.playerMatchStats.findMany({
    where: { playerId: { in: activePlayers.map((p) => p.id) } },
    include: { match: { include: { map: true } } },
    orderBy: { match: { playedAt: "desc" } },
  });

  const statsByPlayer = new Map<string, typeof allStats>();
  for (const p of activePlayers) statsByPlayer.set(p.id, []);
  for (const s of allStats) {
    statsByPlayer.get(s.playerId)?.push(s);
  }

  return { activePlayers, statsByPlayer, allStats };
}

type CompetitiveDataset = Awaited<ReturnType<typeof loadCompetitiveDataset>>;

function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

const MIN_MATCHES_FOR_RANKING = 3;

function getPowerRankingFromDataset(dataset: CompetitiveDataset, take = 5): PowerRankingEntry[] {
  const entries: PowerRankingEntry[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length < MIN_MATCHES_FOR_RANKING) continue;

    const totalMatches = stats.length;
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const avgImpact = stats.reduce((sum, s) => sum + s.impact, 0) / totalMatches;
    const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / totalMatches;
    const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / totalMatches;

    const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
    const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

    let wins = 0;
    for (const s of stats) if (isWin(s)) wins++;
    const winrate = (wins / totalMatches) * 100;

    const recentStats = stats.slice(0, 5);
    let recentWins = 0;
    for (const s of recentStats) if (isWin(s)) recentWins++;

    let forma = "Oscilando";
    if (recentWins === 5) forma = "Excelente";
    else if (recentWins === 4) forma = "Em alta";
    else if (recentWins === 3) forma = "Estável";
    else if (recentWins === 2) forma = "Oscilando";
    else if (recentWins === 1) forma = "Oscilando";

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      rating: Number(avgRating.toFixed(2)),
      impact: Number(avgImpact.toFixed(2)),
      kast: Math.round(avgKast),
      winrate: Math.round(winrate),
      adr: Math.round(avgAdr),
      kd: Number(kd.toFixed(2)),
      matchCount: totalMatches,
      forma,
    });
  }

  return entries.sort((a, b) => b.rating - a.rating).slice(0, take);
}

function getPlayerEvolutionsFromDataset(
  dataset: CompetitiveDataset,
  take = 3
): PlayerEvolutionEntry[] {
  const entries: PlayerEvolutionEntry[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length < 5) continue;

    const totalMatches = stats.length;
    const seasonRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const recentStats = stats.slice(0, 10);
    const recentRating = recentStats.reduce((sum, s) => sum + s.rating, 0) / recentStats.length;

    const diffPercent = seasonRating > 0 ? ((recentRating - seasonRating) / seasonRating) * 100 : 0;
    const trend = diffPercent > 3 ? "up" : diffPercent < -3 ? "down" : "stable";

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      seasonRating: Number(seasonRating.toFixed(2)),
      recentRating: Number(recentRating.toFixed(2)),
      diffPercent: Math.round(diffPercent),
      trend,
    });
  }

  return entries.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent)).slice(0, take);
}

function getPlayerArchetypesFromDataset(dataset: CompetitiveDataset): PlayerArchetype[] {
  const MIN_MATCHES_BASIC = 3;
  const MIN_MATCHES_FULL = 5;
  const MIN_KILLS_FOR_HS = 25;

  type RawStats = {
    player: PlayerRow;
    totalMatches: number;
    totalKills: number;
    totalEntryKills: number;
    entryKillsPerMatch: number;
    totalClutchWins: number;
    clutchWinsPerMatch: number;
    hsRate: number;
    avgRating: number;
    avgAdr: number;
    avgKast: number;
    consistencyRate: number;
    consistentGames: number;
  };

  const rawList: RawStats[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const totalMatches = stats.length;
    const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
    const totalHeadshots = stats.reduce((sum, s) => sum + s.headshots, 0);
    const totalEntryKills = stats.reduce((sum, s) => sum + s.entryKills, 0);
    const totalClutchWins = stats.reduce(
      (sum, s) =>
        sum + s.clutch1v1Wins + s.clutch1v2Wins + s.clutch1v3Wins + s.clutch1v4Wins + s.clutch1v5Wins,
      0,
    );

    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / totalMatches;
    const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / totalMatches;

    const hsRate = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
    const entryKillsPerMatch = totalEntryKills / totalMatches;
    const clutchWinsPerMatch = totalClutchWins / totalMatches;
    const consistentGames = stats.filter((s) => s.rating >= 1.0).length;
    const consistencyRate = (consistentGames / totalMatches) * 100;

    rawList.push({
      player,
      totalMatches,
      totalKills,
      totalEntryKills,
      entryKillsPerMatch,
      totalClutchWins,
      clutchWinsPerMatch,
      hsRate,
      avgRating,
      avgAdr,
      avgKast,
      consistencyRate,
      consistentGames,
    });
  }

  return rawList.map((item) => {
    // Computa score para cada archetype — maior score vence.
    // Score 0 significa não elegível; valores positivos significam elegível.
    const scores: { type: PlayerArchetype["archetype"]; score: number }[] = [];

    // 💀 HS Specialist: alto HS% com volume mínimo de kills (evita amostra irrelevante)
    if (item.totalKills >= MIN_KILLS_FOR_HS && item.totalMatches >= MIN_MATCHES_BASIC && item.hsRate >= 48) {
      scores.push({ type: "headshot", score: (item.hsRate - 44) * 2 });
    }

    // ⚔️ Entry Fragger: abre rounds consistentemente (por partida, não valor absoluto)
    if (item.totalMatches >= MIN_MATCHES_BASIC && item.totalEntryKills > 0) {
      scores.push({ type: "entry", score: item.entryKillsPerMatch * 60 });
    }

    // 🧠 Clutch Player: salva rounds difíceis — taxa por partida, mínimo de jogos
    if (item.totalMatches >= MIN_MATCHES_FULL && item.clutchWinsPerMatch >= 0.1) {
      scores.push({ type: "clutch", score: item.clutchWinsPerMatch * 150 });
    }

    // 🔥 Impact Player: alto impacto combinado (rating + ADR) — mínimo de jogos
    if (item.totalMatches >= MIN_MATCHES_FULL && item.avgRating >= 1.05) {
      const ratingNorm = (item.avgRating - 1.0) * 120;
      const adrBonus = Math.max(0, item.avgAdr - 70) * 0.4;
      scores.push({ type: "impact", score: ratingNorm + adrBonus });
    }

    // 🛡️ Consistency Player: desempenho estável acima do limiar — mínimo de jogos
    if (item.totalMatches >= MIN_MATCHES_FULL && item.consistencyRate >= 55) {
      scores.push({ type: "consistent", score: Math.max(0, item.consistencyRate - 50) * 0.8 });
    }

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    const archetype: PlayerArchetype["archetype"] = best?.score > 0 ? best.type : "tactician";

    let label = "Leitura de Jogo";
    let metricLabel = "Presença no lobby";
    let metricValue = `${item.totalMatches} partidas`;
    let rankText = "Jogador versátil";

    if (archetype === "headshot") {
      label = "Especialista em Precisão";
      metricLabel = "Taxa de Headshot";
      metricValue = `${item.hsRate.toFixed(1)}% (${item.totalKills} kills)`;
      const sorted = [...rawList]
        .filter((r) => r.totalKills >= MIN_KILLS_FOR_HS && r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.hsRate - a.hsRate);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º maior HS% com volume`;
    } else if (archetype === "entry") {
      label = "Primeiro Contato";
      metricLabel = "Aberturas por Partida";
      metricValue = `${item.entryKillsPerMatch.toFixed(1)}/partida · ${item.totalEntryKills} total`;
      const sorted = [...rawList]
        .filter((r) => r.totalEntryKills > 0 && r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.entryKillsPerMatch - a.entryKillsPerMatch);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em opening kills/partida`;
    } else if (archetype === "clutch") {
      label = "Especialista em Clutch";
      metricLabel = "Clutches por Partida";
      metricValue = `${item.clutchWinsPerMatch.toFixed(2)}/partida · ${item.totalClutchWins} salvos`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_FULL)
        .sort((a, b) => b.clutchWinsPerMatch - a.clutchWinsPerMatch);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em clutches salvos`;
    } else if (archetype === "impact") {
      label = "Jogador de Impacto";
      metricLabel = "Rating + ADR";
      metricValue = `${item.avgRating.toFixed(2)} rating · ${Math.round(item.avgAdr)} ADR`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_FULL)
        .sort((a, b) => b.avgRating - a.avgRating);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º maior rating da comunidade`;
    } else if (archetype === "consistent") {
      label = "Consistência";
      metricLabel = "Partidas Estáveis";
      metricValue = `${item.consistencyRate.toFixed(0)}% acima de 1.0 (${item.consistentGames}/${item.totalMatches})`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_FULL)
        .sort((a, b) => b.consistencyRate - a.consistencyRate);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em consistência`;
    }

    return {
      player: { id: item.player.id, nickname: item.player.nickname, avatarUrl: item.player.avatarUrl, levelGc: item.player.levelGc },
      archetype,
      label,
      metricLabel,
      metricValue,
      rankText,
    };
  });
}

function getJogadorDaSemanaFromDataset(dataset: CompetitiveDataset): JogadorDaSemanaInfo | null {
  let bestPlayer: JogadorDaSemanaInfo | null = null;
  let highestRecentRating = 0;

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    const recentStats = stats.slice(0, 10);
    if (recentStats.length < 3) continue;

    const recentMatchesCount = recentStats.length;
    const avgRatingRecent = recentStats.reduce((sum, s) => sum + s.rating, 0) / recentMatchesCount;

    if (avgRatingRecent > highestRecentRating) {
      highestRecentRating = avgRatingRecent;

      const seasonRating = stats.reduce((sum, s) => sum + s.rating, 0) / stats.length;
      const evolution = seasonRating > 0 ? ((avgRatingRecent - seasonRating) / seasonRating) * 100 : 0;
      const evolutionRounded = Math.round(evolution);

      let evolutionText = "";
      if (evolutionRounded > 3) {
        evolutionText = `+${evolutionRounded}% evolução`;
      } else if (evolutionRounded < -3) {
        evolutionText = `${evolutionRounded}% queda`;
      } else {
        evolutionText = "Desempenho excelente";
      }

      let recentWins = 0;
      for (const s of recentStats) if (isWin(s)) recentWins++;
      const winrateRecent = (recentWins / recentMatchesCount) * 100;

      let totalWins = 0;
      for (const s of stats) if (isWin(s)) totalWins++;
      const winrateSeason = (totalWins / stats.length) * 100;

      bestPlayer = {
        player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
        rating: Number(avgRatingRecent.toFixed(2)),
        winrate: Math.round(winrateSeason),
        evolution: evolutionRounded,
        evolutionText,
      };
    }
  }

  return bestPlayer;
}

function getDuoLeaderboardFromDataset(dataset: CompetitiveDataset, take = 3): DuoSummary[] {
  const duos: DuoSummary[] = [];
  const { activePlayers, statsByPlayer } = dataset;

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];
      const statsA = statsByPlayer.get(pA.id) ?? [];
      const statsB = statsByPlayer.get(pB.id) ?? [];
      const statsBByMatch = new Map(statsB.map((s) => [s.matchId, s]));

      let togetherTotal = 0;
      let togetherWins = 0;
      let ratingSum = 0;

      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.matchId);
        if (sB && sA.team === sB.team) {
          togetherTotal++;
          if (isWin(sA)) togetherWins++;
          ratingSum += (sA.rating + sB.rating) / 2;
        }
      }

      if (togetherTotal >= 6) {
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

export function getMapSpecialistsFromDataset(dataset: CompetitiveDataset): MapSpecialist[] {
  const byMap = new Map<string, Map<string, { player: PlayerRow; ratings: number[] }>>();

  for (const s of dataset.allStats) {
    const mapName = s.match.map.name;
    const player = dataset.activePlayers.find((p) => p.id === s.playerId);
    if (!player) continue;

    const playerMapStats = byMap.get(mapName) ?? new Map<string, { player: PlayerRow; ratings: number[] }>();
    const entry = playerMapStats.get(s.playerId) ?? { player, ratings: [] };
    entry.ratings.push(s.rating);
    playerMapStats.set(s.playerId, entry);
    byMap.set(mapName, playerMapStats);
  }

  const specialists: MapSpecialist[] = [];

  for (const [mapName, playerMapStats] of byMap.entries()) {
    let bestRating = 0;
    let bestPlayer: PlayerRow | null = null;

    // Calcula o limite mínimo dinamicamente: 3 partidas ou 30% do jogador mais assíduo do mapa
    const maxGamesOnMap = Math.max(...Array.from(playerMapStats.values()).map((e) => e.ratings.length));
    const minGames = Math.max(Math.min(3, maxGamesOnMap), Math.round(maxGamesOnMap * 0.3));

    for (const entry of playerMapStats.values()) {
      if (entry.ratings.length >= minGames) {
        const avg = entry.ratings.reduce((sum, r) => sum + r, 0) / entry.ratings.length;
        if (avg > bestRating) {
          bestRating = avg;
          bestPlayer = entry.player;
        }
      }
    }

    if (bestPlayer) {
      specialists.push({
        mapName,
        player: {
          id: bestPlayer.id,
          nickname: bestPlayer.nickname,
          avatarUrl: bestPlayer.avatarUrl,
          levelGc: bestPlayer.levelGc,
        },
        rating: Number(bestRating.toFixed(2)),
      });
    }
  }

  return specialists;
}

function getPlayerMomentumFromDataset(dataset: CompetitiveDataset, take = 3): PlayerMomentumEntry[] {
  const entries: PlayerMomentumEntry[] = [];

  for (const player of dataset.activePlayers) {
    // stats já vem ordenado desc por playedAt.
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length < 10) continue;

    const recentWindow = stats.slice(0, 5);
    const priorWindow = stats.slice(5, 10);

    const recentRating = recentWindow.reduce((sum, s) => sum + s.rating, 0) / 5;
    const priorRating = priorWindow.reduce((sum, s) => sum + s.rating, 0) / 5;

    let recentWins = 0;
    for (const s of recentWindow) if (isWin(s)) recentWins++;
    const recentWinrate = (recentWins / 5) * 100;

    let priorWins = 0;
    for (const s of priorWindow) if (isWin(s)) priorWins++;
    const priorWinrate = (priorWins / 5) * 100;

    const diff = recentRating - priorRating;
    const ratingChange = priorRating > 0 ? ((recentRating - priorRating) / priorRating) * 100 : 0;
    const winrateChange = recentWinrate - priorWinrate;

    let status: "up" | "stable" | "down" = "stable";
    let label = "Performance estável";

    if (diff > 0.05) {
      status = "up";
      label = "Em evolução";
    } else if (diff < -0.05) {
      status = "down";
      label = "Performance em queda";
    }

    const ratingChangeText = `${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(0)}% Rating`;
    const winrateChangeText = `${winrateChange >= 0 ? "+" : ""}${winrateChange}% Winrate`;

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      recentRating: Number(recentRating.toFixed(2)),
      priorRating: Number(priorRating.toFixed(2)),
      recentWinrate: Math.round(recentWinrate),
      priorWinrate: Math.round(priorWinrate),
      status,
      label,
      ratingChangeText,
      winrateChangeText,
    });
  }

  return entries.sort((a, b) => (b.recentRating - b.priorRating) - (a.recentRating - a.priorRating)).slice(0, take);
}

async function getDecisivePlayersFromDataset(
  dataset: CompetitiveDataset,
  take = 3
): Promise<DecisivePlayerEntry[]> {
  // Check global (todo o banco, não só jogadores ativos) se clutches/trades estão populados —
  // mantido como query separada e leve para preservar o escopo original desse sanity-check.
  const aggregateAll = await prisma.playerMatchStats.aggregate({
    _sum: { tradeKills: true, clutch1v1Wins: true, clutch1v2Wins: true },
  });
  const totalTradesInDb = aggregateAll._sum.tradeKills ?? 0;
  const totalClutchesInDb = (aggregateAll._sum.clutch1v1Wins ?? 0) + (aggregateAll._sum.clutch1v2Wins ?? 0);
  const hideTradesAndClutches = totalTradesInDb === 0 && totalClutchesInDb === 0;

  const entries: DecisivePlayerEntry[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const totalRounds = stats.reduce((sum, s) => sum + s.match.scoreTeamA + s.match.scoreTeamB, 0);
    if (totalRounds === 0) continue;

    const entryKills = stats.reduce((sum, s) => sum + s.entryKills, 0);
    const tradeKills = stats.reduce((sum, s) => sum + s.tradeKills, 0);
    const clutchWins = stats.reduce(
      (sum, s) =>
        sum + s.clutch1v1Wins + s.clutch1v2Wins + s.clutch1v3Wins + s.clutch1v4Wins + s.clutch1v5Wins,
      0
    );

    const impactedRounds = entryKills + (hideTradesAndClutches ? 0 : tradeKills + clutchWins);
    // Entry/trade/clutch não são mutuamente exclusivos por round (podem ocorrer no
    // mesmo round), então a soma pode superar totalRounds — sem o cap, o percentual
    // exibido poderia passar de 100%, o que não faz sentido para o usuário.
    const impactPercent = Math.min(100, (impactedRounds / totalRounds) * 100);

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      impactPercent: Math.round(impactPercent),
      entryKills,
      tradeKills,
      clutchWins,
      hideTradesAndClutches,
    });
  }

  return entries.sort((a, b) => b.impactPercent - a.impactPercent).slice(0, take);
}

function getDominantTrioFromDataset(dataset: CompetitiveDataset): TrioSummary | null {
  const { activePlayers, statsByPlayer } = dataset;

  let bestTrio: TrioSummary | null = null;
  let bestTrioWinrate = 0;
  let bestTrioRating = 0;

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      for (let k = j + 1; k < activePlayers.length; k++) {
        const pA = activePlayers[i];
        const pB = activePlayers[j];
        const pC = activePlayers[k];

        const statsA = statsByPlayer.get(pA.id) ?? [];
        const statsB = statsByPlayer.get(pB.id) ?? [];
        const statsC = statsByPlayer.get(pC.id) ?? [];

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
            if (isWin(sA)) togetherWins++;
            ratingSum += (sA.rating + sB.rating + sC.rating) / 3;
          }
        }

        if (togetherTotal >= 5) {
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

function getPlayerMatchupsFromDataset(dataset: CompetitiveDataset): PlayerMatchupSummary[] {
  const { activePlayers, statsByPlayer } = dataset;
  const summaries: PlayerMatchupSummary[] = [];

  for (const playerA of activePlayers) {
    const statsA = statsByPlayer.get(playerA.id) ?? [];
    let bestRival: PlayerMatchupSummary["dominates"] = null;
    let worstRival: PlayerMatchupSummary["struggles"] = null;
    let maxWinrate = -1;
    let minWinrate = 101;

    for (const playerB of activePlayers) {
      if (playerA.id === playerB.id) continue;

      const statsB = statsByPlayer.get(playerB.id) ?? [];
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

        if (winrateA > 55 && winrateA > maxWinrate) {
          maxWinrate = winrateA;
          bestRival = { rivalName: playerB.nickname, total: totalAgainst, wins: winsA };
        }

        if (winrateA < 45 && winrateA < minWinrate) {
          minWinrate = winrateA;
          worstRival = { rivalName: playerB.nickname, total: totalAgainst, wins: winsA };
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

async function getWeeklyHighlightsFromDataset(dataset: CompetitiveDataset): Promise<WeeklyHighlight[]> {
  // Data da última partida entre os jogadores ativos, usada para simular "hoje".
  // (Preserva o mesmo critério prático do código original: sem partidas ativas, sem destaques.)
  const latestMatch = dataset.allStats[0]?.match ?? null;
  if (!latestMatch) return [];

  const today = new Date(latestMatch.playedAt);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const highlights: WeeklyHighlight[] = [];

  // 1. Evoluções individuais da semana (last 7 days matches rating vs overall rating)
  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const overallRating = stats.reduce((sum, s) => sum + s.rating, 0) / stats.length;
    const weeklyStats = stats.filter((s) => new Date(s.match.playedAt) >= sevenDaysAgo);

    if (weeklyStats.length >= 2) {
      const weeklyRating = weeklyStats.reduce((sum, s) => sum + s.rating, 0) / weeklyStats.length;
      const diff = overallRating > 0 ? ((weeklyRating - overallRating) / overallRating) * 100 : 0;
      if (diff >= 8) {
        highlights.push({
          id: `evo-${player.id}`,
          category: "evolution",
          title: `${player.nickname} em evolução`,
          description: `Desempenho disparou +${diff.toFixed(0)}% nas partidas desta semana.`,
          meta: `Rating de ${weeklyRating.toFixed(2)} recente`,
        });
      }
    }
  }

  // 2. Sequências ativas na semana (win streak) — stats já ordenado desc, percorremos do mais antigo pro mais novo.
  for (const player of dataset.activePlayers) {
    const stats = [...(dataset.statsByPlayer.get(player.id) ?? [])].reverse();

    let currentStreak = 0;
    for (const stat of stats) {
      if (isWin(stat)) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
    }

    if (currentStreak >= 3) {
      highlights.push({
        id: `streak-${player.id}`,
        category: "streak",
        title: "Sequência ativa",
        description: `${player.nickname} vem embalado com ${currentStreak} vitórias seguidas no lobby.`,
        meta: "Sequência imbatível",
      });
    }
  }

  // 3. Melhor jogo/kills da semana (kills >= 26)
  const weeklyStatsAll = dataset.allStats.filter((s) => new Date(s.match.playedAt) >= sevenDaysAgo);
  const topWeeklyStats = [...weeklyStatsAll].sort((a, b) => b.kills - a.kills)[0] ?? null;
  const topWeeklyPlayer = topWeeklyStats
    ? dataset.activePlayers.find((p) => p.id === topWeeklyStats.playerId)
    : null;

  if (topWeeklyStats && topWeeklyPlayer && topWeeklyStats.kills >= 26) {
    highlights.push({
      id: `record-kills`,
      category: "record",
      title: "Atuação de destaque",
      description: `${topWeeklyPlayer.nickname} destacou-se com ${topWeeklyStats.kills} kills na ${topWeeklyStats.match.map.name}.`,
      meta: `Rating de ${topWeeklyStats.rating.toFixed(2)}`,
    });
  }

  // 4. Mapa mais jogado na semana (dedup por matchId, já que cada partida gera N linhas de PlayerMatchStats)
  const weeklyMatchesById = new Map<string, { mapName: string }>();
  for (const s of weeklyStatsAll) {
    weeklyMatchesById.set(s.match.id, { mapName: s.match.map.name });
  }

  if (weeklyMatchesById.size >= 2) {
    const mapCounts = new Map<string, number>();
    for (const m of weeklyMatchesById.values()) {
      mapCounts.set(m.mapName, (mapCounts.get(m.mapName) ?? 0) + 1);
    }
    const sortedMaps = Array.from(mapCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dominantMap = sortedMaps[0];
    if (dominantMap) {
      highlights.push({
        id: "weekly-map",
        category: "map",
        title: "🗺️ O mapa da semana",
        description: `O lobby se estabeleceu na ${dominantMap[0]} esta semana, com ${dominantMap[1]} confrontos disputados.`,
        meta: `${dominantMap[1]} partidas jogadas`,
      });
    }
  }

  // 5. Líder do ranking mantido
  const leaderboard = getPowerRankingFromDataset(dataset, 1);
  if (leaderboard[0]) {
    highlights.push({
      id: "weekly-leader",
      category: "leader",
      title: "👑 Líder do Ranking",
      description: `${leaderboard[0].player.nickname} lidera o ranking com rating médio de ${leaderboard[0].rating.toFixed(2)}.`,
      meta: "Líder geral",
    });
  }

  return highlights;
}

function getHallOfFameRecordsFromDataset(dataset: CompetitiveDataset): HallOfFameRecord[] {
  const findBestBy = <K extends "rating" | "kills" | "adr" | "eloAfter">(key: K) => {
    let best: (typeof dataset.allStats)[number] | null = null;
    for (const s of dataset.allStats) {
      if (!best || s[key] > best[key]) best = s;
    }
    return best;
  };

  const maxRating = findBestBy("rating");
  const maxKills = findBestBy("kills");
  const maxAdr = findBestBy("adr");
  const eloLeader = findBestBy("eloAfter");

  let maxStreak = 0;
  let maxStreakPlayer = "N/A";

  for (const player of dataset.activePlayers) {
    // stats já ordenado desc; percorremos do mais antigo pro mais novo pra achar a maior sequência.
    const stats = [...(dataset.statsByPlayer.get(player.id) ?? [])].reverse();
    let currentStreak = 0;
    let playerMaxStreak = 0;
    for (const stat of stats) {
      if (isWin(stat)) {
        currentStreak++;
        if (currentStreak > playerMaxStreak) playerMaxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
    if (playerMaxStreak > maxStreak) {
      maxStreak = playerMaxStreak;
      maxStreakPlayer = player.nickname;
    }
  }

  const playerName = (s: (typeof dataset.allStats)[number] | null) =>
    dataset.activePlayers.find((p) => p.id === s?.playerId)?.nickname ?? "N/A";

  const records: HallOfFameRecord[] = [];

  if (maxRating) {
    records.push({
      category: "Recorde de Rating",
      playerName: playerName(maxRating),
      value: maxRating.rating.toFixed(2),
      detail: `Registrado no mapa ${maxRating.match.map.name}`,
    });
  }
  if (maxKills) {
    records.push({
      category: "Recorde de Kills",
      playerName: playerName(maxKills),
      value: `${maxKills.kills} kills`,
      detail: `Partida no mapa ${maxKills.match.map.name}`,
    });
  }
  if (maxAdr) {
    records.push({
      category: "Maior ADR em Jogo",
      playerName: playerName(maxAdr),
      value: maxAdr.adr.toFixed(1),
      detail: `Dano médio por round na ${maxAdr.match.map.name}`,
    });
  }
  if (maxStreak > 0) {
    records.push({
      category: "Maior Sequência de Vitórias",
      playerName: maxStreakPlayer,
      value: `${maxStreak} vitórias`,
      detail: "Sequência invicta da temporada",
    });
  }
  if (eloLeader) {
    records.push({
      category: "Pico de Rating do Hub",
      playerName: playerName(eloLeader),
      value: `${eloLeader.eloAfter}`,
      detail: "Rating calculado pelo CS2 Stats Hub",
    });
  }

  return records;
}

function getPerformanceExtremesFromDataset(dataset: CompetitiveDataset): {
  best: PerformanceExtreme | null;
  worst: PerformanceExtreme | null;
} {
  const MIN_TOTAL_ROUNDS = 20;

  let bestStat: (typeof dataset.allStats)[number] | null = null;
  let worstStat: (typeof dataset.allStats)[number] | null = null;

  for (const s of dataset.allStats) {
    const totalRounds = s.match.scoreTeamA + s.match.scoreTeamB;
    if (totalRounds < MIN_TOTAL_ROUNDS) continue;

    if (!bestStat || s.rating > bestStat.rating) bestStat = s;
    if (!worstStat || s.rating < worstStat.rating) worstStat = s;
  }

  const toExtreme = (s: (typeof dataset.allStats)[number] | null): PerformanceExtreme | null => {
    if (!s) return null;
    const player = dataset.activePlayers.find((p) => p.id === s.playerId);
    if (!player) return null;
    const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : `${s.kills}.00`;
    return {
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      rating: s.rating,
      kills: s.kills,
      deaths: s.deaths,
      adr: Math.round(s.adr),
      mapName: s.match.map.name,
      playedAt: new Date(s.match.playedAt).toLocaleDateString("pt-BR"),
      kd,
    };
  };

  return { best: toExtreme(bestStat), worst: toExtreme(worstStat) };
}

// ---------------------------------------------------------------------------
// Bundle único consumido pela Dashboard — 2 queries no total (dentro de
// loadCompetitiveDataset), todo o resto é cálculo em memória sobre o mesmo dataset.
// ---------------------------------------------------------------------------

export interface DashboardCompetitiveBundle {
  powerRanking: PowerRankingEntry[];
  momentum: PlayerMomentumEntry[];
  decisive: DecisivePlayerEntry[];
  archetypes: PlayerArchetype[];
  matchups: PlayerMatchupSummary[];
  jogadorDaSemana: JogadorDaSemanaInfo | null;
  duos: DuoSummary[];
  dominantTrio: TrioSummary | null;
  mapSpecialists: MapSpecialist[];
  weeklyHighlights: WeeklyHighlight[];
  records: HallOfFameRecord[];
  bestPerformance: PerformanceExtreme | null;
  worstPerformance: PerformanceExtreme | null;
}

export async function getDashboardCompetitiveBundle(): Promise<DashboardCompetitiveBundle> {
  const dataset = await loadCompetitiveDataset();

  const [decisive, weeklyHighlights] = await Promise.all([
    getDecisivePlayersFromDataset(dataset, 3),
    getWeeklyHighlightsFromDataset(dataset),
  ]);

  const extremes = getPerformanceExtremesFromDataset(dataset);

  return {
    powerRanking: getPowerRankingFromDataset(dataset, 5),
    momentum: getPlayerMomentumFromDataset(dataset, 3),
    decisive,
    archetypes: getPlayerArchetypesFromDataset(dataset),
    matchups: getPlayerMatchupsFromDataset(dataset),
    jogadorDaSemana: getJogadorDaSemanaFromDataset(dataset),
    duos: getDuoLeaderboardFromDataset(dataset, 2),
    dominantTrio: getDominantTrioFromDataset(dataset),
    mapSpecialists: getMapSpecialistsFromDataset(dataset),
    weeklyHighlights,
    records: getHallOfFameRecordsFromDataset(dataset),
    bestPerformance: extremes.best,
    worstPerformance: extremes.worst,
  };
}
