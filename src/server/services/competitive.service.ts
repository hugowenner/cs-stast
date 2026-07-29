import { prisma } from "@/server/db";
import { communityMatchStatsWhere, communityMatchWhere } from "@/server/domain/matchClassification";
import { generateHighlights } from "@/server/services/highlights/highlights.service";
import { DashboardHighlight } from "@/server/services/highlights/highlight.types";
import { getActiveSeason } from "@/server/services/season.service";

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
  hsPercent: number;
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
  archetype: "entry" | "clutch" | "headshot" | "consistent" | "tactician" | "impact" | "support";
  label: string;
  metricLabel: string;
  metricValue: string;
  rankText: string;
  /** Rating médio da temporada — já calculado internamente para o score do archetype
   * "impact", só nunca tinha sido exposto no retorno. */
  rating: number;
  matchCount: number;
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

export interface HallOfFameRecord {
  category: string;
  playerName: string;
  value: string;
  detail: string;
  matchId?: string;
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

/**
 * Dataset compartilhado de TODO o dashboard competitivo — e a única camada que decide
 * "quais partidas contam como estatística coletiva". Filtra por
 * communityMatchStatsWhere() (>= 2 jogadores monitorados na partida — ver
 * domain/matchClassification.ts) direto no banco, então toda função *FromDataset()
 * que opera sobre este dataset (ranking, streaks, duplas, destaques, archetypes,
 * matchups, hall da fama, map pool etc.) já herda a regra automaticamente, sem
 * precisar reimplementar o filtro em cada uma. Partidas SOLO nunca são excluídas do
 * banco — só ficam fora deste dataset agregado.
 */
export async function loadCompetitiveDataset(seasonId?: string | "all") {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
  });

  let allStats;
  if (seasonId === "all") {
    allStats = await prisma.playerMatchStats.findMany({
      where: {
        playerId: { in: activePlayers.map((p) => p.id) },
        match: communityMatchWhere(),
      },
      include: { match: { include: { map: true } } },
      orderBy: { match: { playedAt: "desc" } },
    });
  } else {
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await getActiveSeason();
      targetSeasonId = activeSeason?.id;
    }

    allStats = await prisma.playerMatchStats.findMany({
      where: {
        playerId: { in: activePlayers.map((p) => p.id) },
        match: {
          seasonId: targetSeasonId || undefined,
          ...communityMatchWhere(),
        },
      },
      include: { match: { include: { map: true } } },
      orderBy: { match: { playedAt: "desc" } },
    });
  }

  const statsByPlayer = new Map<string, typeof allStats>();
  for (const p of activePlayers) statsByPlayer.set(p.id, []);
  for (const s of allStats) {
    statsByPlayer.get(s.playerId)?.push(s);
  }

  return { activePlayers, statsByPlayer, allStats };
}

export type CompetitiveDataset = Awaited<ReturnType<typeof loadCompetitiveDataset>>;

function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

const FORMA_WINDOW = 5;

/**
 * "Forma" (tendência) de um jogador nas últimas 5 partidas — fonte única usada tanto
 * pelo Ranking Competitivo quanto por Jogadores Monitorados (antes duplicada nos dois
 * lugares com a mesma lógica copiada). Funciona com qualquer array já ordenado desc
 * por playedAt — passar a temporada inteira ou uma janela já recortada dá o mesmo
 * resultado, pois só os 5 primeiros elementos importam.
 */
function computeForma(stats: CompetitiveDataset["allStats"]): string {
  const recentStats = stats.slice(0, FORMA_WINDOW);
  let recentWins = 0;
  for (const s of recentStats) if (isWin(s)) recentWins++;

  if (recentWins === 5) return "Excelente";
  if (recentWins === 4) return "Em alta";
  if (recentWins === 3) return "Estável";
  return "Oscilando";
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
    const totalHeadshots = stats.reduce((sum, s) => sum + s.headshots, 0);
    const hsPercent = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;

    let wins = 0;
    for (const s of stats) if (isWin(s)) wins++;
    const winrate = (wins / totalMatches) * 100;

    const forma = computeForma(stats);

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
      hsPercent: Math.round(hsPercent),
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

export function getPlayerArchetypesFromDataset(dataset: CompetitiveDataset): PlayerArchetype[] {
  const MIN_MATCHES_BASIC = 3;
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
    supportRate: number;
    impactCombined: number;
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
        sum +
        Math.max(
          s.clutchesWon,
          (s.clutch1v1Wins || 0) +
            (s.clutch1v2Wins || 0) +
            (s.clutch1v3Wins || 0) +
            (s.clutch1v4Wins || 0) +
            (s.clutch1v5Wins || 0),
        ),
      0,
    );
    const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
    const totalFlashAssists = stats.reduce((sum, s) => sum + s.flashAssists, 0);

    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / totalMatches;
    const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / totalMatches;

    const hsRate = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
    const entryKillsPerMatch = totalEntryKills / totalMatches;
    const clutchWinsPerMatch = totalClutchWins / totalMatches;
    const consistentGames = stats.filter((s) => s.rating >= 1.0).length;
    const consistencyRate = (consistentGames / totalMatches) * 100;
    const supportRate = (totalAssists + totalFlashAssists) / totalMatches;
    const impactCombined = avgRating * 0.7 + (avgAdr / 100) * 0.3;

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
      supportRate,
      impactCombined,
    });
  }

  // Filtra jogadores elegíveis para cálculo de percentil
  const eligibleList = rawList.filter((r) => r.totalMatches >= MIN_MATCHES_BASIC);

  const getPercentile = (val: number, allVals: number[]) => {
    if (allVals.length <= 1) return 100;
    const less = allVals.filter((v) => v < val).length;
    const equal = allVals.filter((v) => v === val).length;
    return ((less + equal / 2) / allVals.length) * 100;
  };

  const allEntry = eligibleList.map((r) => r.entryKillsPerMatch);
  const allImpact = eligibleList.map((r) => r.impactCombined);
  const allConsistency = eligibleList.map((r) => r.consistencyRate);
  const allHs = eligibleList.map((r) => r.hsRate);
  const allSupport = eligibleList.map((r) => r.supportRate);
  const allClutch = eligibleList.map((r) => r.clutchWinsPerMatch);

  return rawList.map((item) => {
    if (item.totalMatches < MIN_MATCHES_BASIC) {
      return {
        player: item.player,
        archetype: "tactician" as const,
        label: "Curinga/Tático",
        metricLabel: "Partidas jogadas",
        metricValue: `${item.totalMatches} partidas`,
        rankText: "Dados insuficientes",
        rating: Math.round(item.avgRating * 100) / 100,
        matchCount: item.totalMatches,
      };
    }

    const entryScore = getPercentile(item.entryKillsPerMatch, allEntry);
    const impactScore = getPercentile(item.impactCombined, allImpact);
    const consistentScore = getPercentile(item.consistencyRate, allConsistency);
    const hsScore = getPercentile(item.hsRate, allHs);
    const supportScore = getPercentile(item.supportRate, allSupport);
    const clutchScore = getPercentile(item.clutchWinsPerMatch, allClutch);

    const scores = [
      { type: "entry" as const, score: entryScore },
      { type: "impact" as const, score: impactScore },
      { type: "consistent" as const, score: consistentScore },
      { type: "headshot" as const, score: hsScore },
      { type: "support" as const, score: supportScore },
      { type: "clutch" as const, score: clutchScore },
    ];

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // Se o maior percentil for menor que 60%, ele é classificado como Curinga/Tático
    const archetype = best.score >= 60 ? best.type : ("tactician" as const);

    let label = "Curinga/Tático";
    let metricLabel = "Presença no lobby";
    let metricValue = `${item.totalMatches} partidas`;
    let rankText = "Jogador versátil";

    if (archetype === "headshot") {
      label = "Headshot Machine";
      metricLabel = "Taxa de Headshot";
      metricValue = `${item.hsRate.toFixed(1)}% (${item.totalKills} kills)`;
      const sorted = [...rawList]
        .filter((r) => r.totalKills >= MIN_KILLS_FOR_HS && r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.hsRate - a.hsRate);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º maior HS% com volume`;
    } else if (archetype === "entry") {
      label = "Entry Fragger";
      metricLabel = "Aberturas por Partida";
      metricValue = `${item.entryKillsPerMatch.toFixed(1)}/partida · ${item.totalEntryKills} total`;
      const sorted = [...rawList]
        .filter((r) => r.totalEntryKills > 0 && r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.entryKillsPerMatch - a.entryKillsPerMatch);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em opening kills/partida`;
    } else if (archetype === "clutch") {
      label = "Clutch Player";
      metricLabel = "Clutches por Partida";
      metricValue = `${item.clutchWinsPerMatch.toFixed(2)}/partida · ${item.totalClutchWins} salvos`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.clutchWinsPerMatch - a.clutchWinsPerMatch);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em clutches salvos`;
    } else if (archetype === "impact") {
      label = "Rifler de Impacto";
      metricLabel = "Rating + ADR";
      metricValue = `${item.avgRating.toFixed(2)} rating · ${Math.round(item.avgAdr)} ADR`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.avgRating - a.avgRating);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º maior rating da comunidade`;
    } else if (archetype === "consistent") {
      label = "Consistente";
      metricLabel = "Partidas Estáveis";
      metricValue = `${item.consistencyRate.toFixed(0)}% acima de 1.0 (${item.consistentGames}/${item.totalMatches})`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.consistencyRate - a.consistencyRate);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em consistência`;
    } else if (archetype === "support") {
      label = "Suporte";
      metricLabel = "Suporte por Partida";
      metricValue = `${item.supportRate.toFixed(1)} assistências/partida`;
      const sorted = [...rawList]
        .filter((r) => r.totalMatches >= MIN_MATCHES_BASIC)
        .sort((a, b) => b.supportRate - a.supportRate);
      const pos = sorted.findIndex((s) => s.player.id === item.player.id) + 1;
      rankText = `${pos}º em assistências de suporte`;
    }

    return {
      player: item.player,
      archetype,
      label,
      metricLabel,
      metricValue,
      rankText,
      rating: Math.round(item.avgRating * 100) / 100,
      matchCount: item.totalMatches,
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

      let recentWins = 0;
      for (const s of recentStats) if (isWin(s)) recentWins++;
      const winrateRecent = (recentWins / recentMatchesCount) * 100;

      // Classificação por rating absoluto primeiro (qualidade real), evolução só como
      // desempate — antes o texto dependia só da variação, então um jogador estável
      // com rating mediano podia ser rotulado "Desempenho excelente".
      let evolutionText = "";
      if (avgRatingRecent >= 1.2) {
        evolutionText = "🔥 Dominando a semana";
      } else if (avgRatingRecent >= 1.0) {
        evolutionText = "📈 Boa fase";
      } else if (evolutionRounded > 5) {
        evolutionText = "🚀 Em evolução";
      } else {
        evolutionText = "Estável";
      }

      bestPlayer = {
        player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
        rating: Number(avgRatingRecent.toFixed(2)),
        // Winrate agora é da mesma janela do rating (últimas 10) — antes misturava
        // rating recente com winrate da temporada inteira na mesma UI.
        winrate: Math.round(winrateRecent),
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
    _sum: { tradeKills: true, clutch1v1Wins: true, clutch1v2Wins: true, clutchesWon: true },
  });
  const totalTradesInDb = aggregateAll._sum.tradeKills ?? 0;
  const totalClutchesInDb =
    (aggregateAll._sum.clutch1v1Wins ?? 0) +
    (aggregateAll._sum.clutch1v2Wins ?? 0) +
    (aggregateAll._sum.clutchesWon ?? 0);
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
        sum + Math.max(s.clutchesWon, s.clutch1v1Wins + s.clutch1v2Wins + s.clutch1v3Wins + s.clutch1v4Wins + s.clutch1v5Wins),
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

function getHallOfFameRecordsFromDataset(
  dataset: CompetitiveDataset,
  statsOverride?: typeof dataset.allStats
): HallOfFameRecord[] {
  const statsToUse = statsOverride ?? dataset.allStats;

  const findBestBy = <K extends "rating" | "kills" | "adr" | "eloAfter">(key: K) => {
    let best: (typeof dataset.allStats)[number] | null = null;
    for (const s of statsToUse) {
      if (!best || s[key] > best[key]) best = s;
    }
    return best;
  };

  const maxRating = findBestBy("rating");
  const maxKills = findBestBy("kills");
  const maxAdr = findBestBy("adr");
  const eloLeader = findBestBy("eloAfter");

  // Maior K/D
  let maxKdStat: (typeof dataset.allStats)[number] | null = null;
  let maxKdVal = 0;
  for (const s of statsToUse) {
    if (s.deaths === 0 && s.kills === 0) continue;
    const kd = s.deaths > 0 ? s.kills / s.deaths : s.kills;
    if (!maxKdStat || kd > maxKdVal) {
      maxKdStat = s;
      maxKdVal = kd;
    }
  }

  // Maior HS% (mínimo de 10 kills para relevância)
  let maxHsStat: (typeof dataset.allStats)[number] | null = null;
  let maxHsVal = 0;
  for (const s of statsToUse) {
    if (s.kills >= 10) {
      const hs = (s.headshots / s.kills) * 100;
      if (!maxHsStat || hs > maxHsVal) {
        maxHsStat = s;
        maxHsVal = hs;
      }
    }
  }
  if (!maxHsStat) {
    for (const s of statsToUse) {
      if (s.kills > 0) {
        const hs = (s.headshots / s.kills) * 100;
        if (!maxHsStat || hs > maxHsVal) {
          maxHsStat = s;
          maxHsVal = hs;
        }
      }
    }
  }

  let maxStreak = 0;
  let maxStreakPlayer = "N/A";

  for (const player of dataset.activePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;
    const stats = [...playerStats].reverse();
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

  // 8. Maior Impacto em Jogo
  let maxImpactStat: (typeof dataset.allStats)[number] | null = null;
  let maxImpactScore = 0;
  for (const s of statsToUse) {
    const score = s.rating * 100 + s.adr;
    if (!maxImpactStat || score > maxImpactScore) {
      maxImpactStat = s;
      maxImpactScore = score;
    }
  }

  // 9. Mais MultiKills na Temporada
  let bestMultiKillPlayer = "N/A";
  let maxMultiKills = 0;
  let bestMultiKillDetail = "";
  for (const player of dataset.activePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;
    let doubleSum = 0;
    let tripleSum = 0;
    let quadSum = 0;
    let aceSum = 0;
    for (const s of playerStats) {
      doubleSum += s.doubleKills ?? 0;
      tripleSum += s.tripleKills ?? 0;
      quadSum += s.quadKills ?? 0;
      aceSum += s.aces ?? 0;
    }
    const total = doubleSum + tripleSum + quadSum + aceSum;
    if (total > maxMultiKills) {
      maxMultiKills = total;
      bestMultiKillPlayer = player.nickname;
      bestMultiKillDetail = `${doubleSum}x 2K, ${tripleSum}x 3K, ${quadSum}x 4K` + (aceSum > 0 ? `, ${aceSum}x Ace` : "");
    }
  }

  // 10. Maior Dano em Jogo
  let maxDamageStat: (typeof dataset.allStats)[number] | null = null;
  for (const s of statsToUse) {
    if (s.damage !== null && s.damage !== undefined) {
      if (!maxDamageStat || s.damage > (maxDamageStat.damage ?? 0)) {
        maxDamageStat = s;
      }
    }
  }

  // 11. Maior Clutch na Temporada
  let bestClutchPlayer = "N/A";
  let maxClutches = 0;
  let clutchDetail = "Decisivo nos momentos críticos";
  for (const player of dataset.activePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;
    let totalClutches = 0;
    let c1v1 = 0, c1v2 = 0, c1v3 = 0, c1v4 = 0, c1v5 = 0;
    for (const s of playerStats) {
      totalClutches += s.clutchesWon ?? 0;
      c1v1 += s.clutch1v1Wins ?? 0;
      c1v2 += s.clutch1v2Wins ?? 0;
      c1v3 += s.clutch1v3Wins ?? 0;
      c1v4 += s.clutch1v4Wins ?? 0;
      c1v5 += s.clutch1v5Wins ?? 0;
    }
    if (totalClutches > maxClutches) {
      maxClutches = totalClutches;
      bestClutchPlayer = player.nickname;
      clutchDetail = `${c1v1}x 1v1, ${c1v2}x 1v2, ${c1v3}x 1v3` + (c1v4 + c1v5 > 0 ? `, ${c1v4 + c1v5}x 1v4+` : "");
    }
  }

  // 12. Maior Consistência na Temporada
  let bestConsistencyPlayer = "N/A";
  let maxConsistencyScore = 0;
  let consistencyValue = "1.00 Rating";
  let consistencyDetail = "Regularidade durante a temporada";

  let minMatches = 3;
  let candidatePlayers = dataset.activePlayers.filter(p => {
    const stats = dataset.statsByPlayer.get(p.id) ?? [];
    const statsToCount = statsOverride
      ? stats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : stats;
    return statsToCount.length >= minMatches;
  });

  if (candidatePlayers.length === 0) {
    minMatches = 1;
    candidatePlayers = dataset.activePlayers.filter(p => {
      const stats = dataset.statsByPlayer.get(p.id) ?? [];
      const statsToCount = statsOverride
        ? stats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
        : stats;
      return statsToCount.length >= minMatches;
    });
  }

  for (const player of candidatePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;

    const totalMatches = playerStats.length;
    if (totalMatches === 0) continue;

    const totalRating = playerStats.reduce((sum, s) => sum + s.rating, 0);
    const avgRating = totalRating / totalMatches;
    const aboveBaselineCount = playerStats.filter(s => s.rating >= 1.0).length;
    const aboveBaselinePct = aboveBaselineCount / totalMatches;

    const score = avgRating * (1 + aboveBaselinePct);
    if (score > maxConsistencyScore) {
      maxConsistencyScore = score;
      bestConsistencyPlayer = player.nickname;
      consistencyValue = `${avgRating.toFixed(2)} Rating`;
      consistencyDetail = `${aboveBaselineCount} de ${totalMatches} partidas com rating ≥ 1.0`;
    }
  }

  const records: HallOfFameRecord[] = [];

  if (maxRating) {
    records.push({
      category: "Recorde de Rating",
      playerName: playerName(maxRating),
      value: maxRating.rating.toFixed(2),
      detail: `Registrado no mapa ${maxRating.match.map.name}`,
      matchId: maxRating.match.id,
    });
  }
  if (maxKdStat) {
    const calculatedKd = maxKdStat.deaths > 0 ? maxKdStat.kills / maxKdStat.deaths : maxKdStat.kills;
    records.push({
      category: "Maior K/D em Jogo",
      playerName: playerName(maxKdStat),
      value: `${calculatedKd.toFixed(2)} K/D`,
      detail: `Registrado no mapa ${maxKdStat.match.map.name}`,
      matchId: maxKdStat.match.id,
    });
  }
  if (maxAdr) {
    records.push({
      category: "Maior ADR em Jogo",
      playerName: playerName(maxAdr),
      value: `${maxAdr.adr.toFixed(1)} ADR`,
      detail: `Dano médio por round na ${maxAdr.match.map.name}`,
      matchId: maxAdr.match.id,
    });
  }
  if (maxKills) {
    records.push({
      category: "Recorde de Kills",
      playerName: playerName(maxKills),
      value: `${maxKills.kills} kills`,
      detail: `Partida no mapa ${maxKills.match.map.name}`,
      matchId: maxKills.match.id,
    });
  }
  if (maxHsStat) {
    const calculatedHs = maxHsStat.kills > 0 ? (maxHsStat.headshots / maxHsStat.kills) * 100 : 0;
    records.push({
      category: "Maior HS% em Jogo",
      playerName: playerName(maxHsStat),
      value: `${calculatedHs.toFixed(0)}% HS`,
      detail: `Registrado no mapa ${maxHsStat.match.map.name}`,
      matchId: maxHsStat.match.id,
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
      value: `${eloLeader.eloAfter} pontos`,
      detail: "Ranking interno CS2 Stats Hub",
      matchId: eloLeader.match.id,
    });
  }
  if (maxImpactStat) {
    records.push({
      category: "Maior Impacto em Jogo",
      playerName: playerName(maxImpactStat),
      value: `${maxImpactStat.rating.toFixed(2)} Rating / ${maxImpactStat.adr.toFixed(1)} ADR`,
      detail: "Performance mais dominante em uma partida",
      matchId: maxImpactStat.match.id,
    });
  }
  if (maxMultiKills > 0) {
    records.push({
      category: "Mais MultiKills na Temporada",
      playerName: bestMultiKillPlayer,
      value: `${maxMultiKills} multikills`,
      detail: bestMultiKillDetail,
    });
  }
  if (maxDamageStat && maxDamageStat.damage) {
    records.push({
      category: "Maior Dano em Jogo",
      playerName: playerName(maxDamageStat),
      value: `${maxDamageStat.damage} DMG`,
      detail: `Dano bruto causado na ${maxDamageStat.match.map.name}`,
      matchId: maxDamageStat.match.id,
    });
  }
  if (maxClutches > 0) {
    records.push({
      category: "Maior Clutch na Temporada",
      playerName: bestClutchPlayer,
      value: `${maxClutches} clutches`,
      detail: clutchDetail,
    });
  }
  if (maxConsistencyScore > 0) {
    records.push({
      category: "Maior Consistência na Temporada",
      playerName: bestConsistencyPlayer,
      value: consistencyValue,
      detail: consistencyDetail,
    });
  }

  return records;
}

function getPerformanceExtremesFromDataset(dataset: CompetitiveDataset): {
  best: PerformanceExtreme | null;
  worst: PerformanceExtreme | null;
} {
  const MIN_TOTAL_ROUNDS = 20; // partida precisa ter duração mínima (exclui abortadas/incompletas)
  const MIN_KILLS_IN_MATCH = 5; // volume mínimo do jogador na partida (exclui desconexão/sub/erro de payload)
  const MIN_PLAYER_MATCHES = 5; // jogador precisa ter presença mínima na temporada (exclui "1 partida ruim")

  let bestStat: (typeof dataset.allStats)[number] | null = null;
  let worstStat: (typeof dataset.allStats)[number] | null = null;

  for (const s of dataset.allStats) {
    const totalRounds = s.match.scoreTeamA + s.match.scoreTeamB;
    if (totalRounds < MIN_TOTAL_ROUNDS) continue;
    if (s.kills < MIN_KILLS_IN_MATCH) continue;

    const playerMatchCount = dataset.statsByPlayer.get(s.playerId)?.length ?? 0;
    if (playerMatchCount < MIN_PLAYER_MATCHES) continue;

    // Melhor e pior usam exatamente o mesmo universo elegível — nunca aplicar um piso
    // só para "pior atuação" e deixar a "melhor" sem os mesmos filtros.
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

// ─── Performance por mapa (comunidade) ─────────────────────────────────────

export interface MapPerformanceEntry {
  map: string;
  matchesPlayed: number;
  winrate: number;
}

const MIN_MATCHES_FOR_MAP_HIGHLIGHT = 5;

/**
 * Mesmo cálculo que antes vivia em stats.service.getMapWinrates() (chamada via query
 * própria) e era refeito de novo em page.tsx (sort/find de bestMap/worstMap). Agora
 * roda sobre o mesmo dataset.allStats já carregado — zero query nova — e o bundle
 * entrega mapWinrates/bestMap/worstMap prontos, uma única fonte de verdade.
 */
function getMapPerformanceFromDataset(dataset: CompetitiveDataset): {
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
} {
  const byMap = new Map<string, { mapName: string; wins: number; appearances: number; matchIds: Set<string> }>();

  for (const s of dataset.allStats) {
    const key = s.match.mapId;
    const entry = byMap.get(key) ?? {
      mapName: s.match.map.name,
      wins: 0,
      appearances: 0,
      matchIds: new Set<string>(),
    };
    entry.appearances += 1;
    if (isWin(s)) entry.wins += 1;
    entry.matchIds.add(s.match.id);
    byMap.set(key, entry);
  }

  const mapWinrates: MapPerformanceEntry[] = Array.from(byMap.values()).map((entry) => ({
    map: entry.mapName,
    matchesPlayed: entry.matchIds.size,
    winrate: entry.appearances > 0 ? Math.round((entry.wins / entry.appearances) * 1000) / 10 : 0,
  }));

  const eligible = mapWinrates.filter((m) => m.matchesPlayed >= MIN_MATCHES_FOR_MAP_HIGHLIGHT);
  const bestMap = [...eligible].sort((a, b) => b.winrate - a.winrate)[0] ?? null;
  const worstMap = [...eligible].sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  return { mapWinrates, bestMap, worstMap };
}

// ---------------------------------------------------------------------------
// Bundle único consumido pela Dashboard — 2 queries no total (dentro de
// loadCompetitiveDataset), todo o resto é cálculo em memória sobre o mesmo dataset.
// ---------------------------------------------------------------------------

export interface MonitoredPlayerEntry {
  rank: number;
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  rating: number;
  adr: number;
  kd: number;
  kast: number;
  winrate: number;
  hsPercent: number;
  matchCount: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  forma: string;
  bestMap: string | null;
  worstMap: string | null;
  lastMatchDate: Date | null;
}

const MONITORED_RECENT_WINDOW = 10;

function getMonitoredPlayersFromDataset(dataset: CompetitiveDataset): MonitoredPlayerEntry[] {
  const entries: MonitoredPlayerEntry[] = [];

  for (const player of dataset.activePlayers) {
    // stats already sorted desc by playedAt — take the most recent 10
    const stats = (dataset.statsByPlayer.get(player.id) ?? []).slice(0, MONITORED_RECENT_WINDOW);
    if (stats.length === 0) continue;

    const matchCount = stats.length;
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / matchCount;
    const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / matchCount;
    const avgKast = stats.reduce((sum, s) => sum + s.kast, 0) / matchCount;
    const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
    const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
    const totalHeadshots = stats.reduce((sum, s) => sum + s.headshots, 0);
    const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
    const hsPercent = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;

    let wins = 0;
    for (const s of stats) if (isWin(s)) wins++;
    const winrate = (wins / matchCount) * 100;

    const forma = computeForma(stats);

    // Best and worst map by avg rating (min 2 appearances)
    const mapRatings = new Map<string, number[]>();
    for (const s of stats) {
      const m = s.match.map.name;
      const arr = mapRatings.get(m) ?? [];
      arr.push(s.rating);
      mapRatings.set(m, arr);
    }
    let bestMap: string | null = null;
    let worstMap: string | null = null;
    let bestMapRating = -Infinity;
    let worstMapRating = Infinity;
    for (const [mapName, ratings] of mapRatings.entries()) {
      if (ratings.length < 2) continue;
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avg > bestMapRating) { bestMapRating = avg; bestMap = mapName; }
      if (avg < worstMapRating) { worstMapRating = avg; worstMap = mapName; }
    }
    if (bestMap === worstMap) worstMap = null;

    // stats is sorted desc by playedAt — first entry is most recent
    const lastMatchDate = stats[0]?.match.playedAt ?? null;

    entries.push({
      rank: 0, // preenchido após ordenação
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      rating: Number(avgRating.toFixed(2)),
      adr: Math.round(avgAdr),
      kd: Number(kd.toFixed(2)),
      kast: Math.round(avgKast),
      winrate: Math.round(winrate),
      hsPercent: Math.round(hsPercent),
      matchCount,
      totalKills,
      totalDeaths,
      totalAssists,
      forma,
      bestMap,
      worstMap,
      lastMatchDate,
    });
  }

  const sorted = entries.sort((a, b) => b.rating - a.rating);
  sorted.forEach((e, i) => { e.rank = i + 1; });
  return sorted;
}

// ---------------------------------------------------------------------------
// Cards inteligentes — todos derivados do mesmo CompetitiveDataset (zero queries
// extras). Cada função abaixo alimenta um card específico do Dashboard.
// ---------------------------------------------------------------------------

const RECENT_WINDOW = 10; // "últimas 10 partidas", regra comum às funções abaixo
const MIN_RECENT_MATCHES = 3; // mesmo piso usado em getJogadorDaSemanaFromDataset
const MIN_STREAK_TO_SHOW = 2; // uma vitória isolada não é uma "sequência"

/** Métricas médias de uma janela de partidas (temporada inteira ou últimas N). */
function computeWindowMetrics(stats: CompetitiveDataset["allStats"]) {
  const matchCount = stats.length;
  if (matchCount === 0) {
    return { rating: 0, adr: 0, kd: 0, winrate: 0, matchCount: 0 };
  }
  const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
  const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
  const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / matchCount;
  const avgAdr = stats.reduce((sum, s) => sum + s.adr, 0) / matchCount;
  const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

  let wins = 0;
  for (const s of stats) if (isWin(s)) wins++;
  const winrate = (wins / matchCount) * 100;

  return { rating: avgRating, adr: avgAdr, kd, winrate, matchCount };
}

// ─── Funcionalidade 1: Hot Streak / Cold Streak ────────────────────────────

export interface StreakEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  type: "hot" | "cold";
  /** Vitórias (hot) ou derrotas (cold) consecutivas, contadas a partir da partida mais recente. */
  streak: number;
  recentRating: number;
  /** Variação percentual do ADR das últimas 10 partidas frente à média da temporada. */
  adrChangePercent: number;
  matchCount: number;
}

function getStreaksFromDataset(dataset: CompetitiveDataset): { hot: StreakEntry[]; cold: StreakEntry[] } {
  const hot: StreakEntry[] = [];
  const cold: StreakEntry[] = [];

  for (const player of dataset.activePlayers) {
    const fullStats = dataset.statsByPlayer.get(player.id) ?? [];
    const recentStats = fullStats.slice(0, RECENT_WINDOW); // regra: só últimas 10
    if (recentStats.length < MIN_RECENT_MATCHES) continue; // sem partidas suficientes

    // recentStats já vem ordenado desc por playedAt — índice 0 é a partida mais recente.
    const mostRecentIsWin = isWin(recentStats[0]);
    let streak = 0;
    for (const s of recentStats) {
      if (isWin(s) === mostRecentIsWin) streak++;
      else break;
    }
    if (streak < MIN_STREAK_TO_SHOW) continue;

    const recentMetrics = computeWindowMetrics(recentStats);
    const seasonMetrics = computeWindowMetrics(fullStats);
    const adrChangePercent =
      seasonMetrics.adr > 0 ? ((recentMetrics.adr - seasonMetrics.adr) / seasonMetrics.adr) * 100 : 0;

    const entry: StreakEntry = {
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      type: mostRecentIsWin ? "hot" : "cold",
      streak,
      recentRating: Number(recentMetrics.rating.toFixed(2)),
      adrChangePercent: Math.round(adrChangePercent),
      matchCount: recentMetrics.matchCount,
    };

    if (mostRecentIsWin) hot.push(entry);
    else cold.push(entry);
  }

  hot.sort((a, b) => b.streak - a.streak || b.recentRating - a.recentRating);
  cold.sort((a, b) => b.streak - a.streak || a.recentRating - b.recentRating);

  return { hot, cold };
}

// ─── Funcionalidades 2 e 3: Evolução recente / Queda de performance ────────

export interface SeasonComparisonEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  season: { rating: number; adr: number; kd: number; winrate: number; matchCount: number };
  recent: { rating: number; adr: number; kd: number; winrate: number; matchCount: number };
  diff: { rating: number; adr: number; kd: number; winrate: number };
}

/**
 * Compara a média da temporada inteira com a média das últimas 10 partidas de cada
 * jogador. Alimenta tanto "Evolução Recente" (diff positivo) quanto "Queda de
 * Performance" (diff negativo) — mesma fonte de dados, sem duplicar cálculo.
 */
function getSeasonComparisonFromDataset(dataset: CompetitiveDataset): SeasonComparisonEntry[] {
  const entries: SeasonComparisonEntry[] = [];

  for (const player of dataset.activePlayers) {
    const fullStats = dataset.statsByPlayer.get(player.id) ?? [];
    const recentStats = fullStats.slice(0, RECENT_WINDOW);
    if (recentStats.length < MIN_RECENT_MATCHES) continue;

    const season = computeWindowMetrics(fullStats);
    const recent = computeWindowMetrics(recentStats);

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      season: {
        rating: Number(season.rating.toFixed(2)),
        adr: Math.round(season.adr),
        kd: Number(season.kd.toFixed(2)),
        winrate: Math.round(season.winrate),
        matchCount: season.matchCount,
      },
      recent: {
        rating: Number(recent.rating.toFixed(2)),
        adr: Math.round(recent.adr),
        kd: Number(recent.kd.toFixed(2)),
        winrate: Math.round(recent.winrate),
        matchCount: recent.matchCount,
      },
      diff: {
        rating: Number((recent.rating - season.rating).toFixed(2)),
        adr: Math.round(recent.adr - season.adr),
        kd: Number((recent.kd - season.kd).toFixed(2)),
        winrate: Math.round(recent.winrate - season.winrate),
      },
    });
  }

  // Desc por diff de rating — quem mais evoluiu primeiro, quem mais caiu por último.
  return entries.sort((a, b) => b.diff.rating - a.diff.rating);
}

// ─── Funcionalidade 4: Melhor dupla do momento ─────────────────────────────

const MIN_TOGETHER_RECENT = 3; // menor que o piso da temporada (6): janela é só 10 partidas

/**
 * Mesma lógica de pareamento de getDuoLeaderboardFromDataset, mas restrita às últimas
 * 10 partidas de cada jogador (não a temporada inteira). Reaproveita o tipo DuoSummary.
 */
function getBestRecentDuoFromDataset(dataset: CompetitiveDataset): DuoSummary | null {
  const { activePlayers, statsByPlayer } = dataset;

  let best: DuoSummary | null = null;
  let bestWinrate = -1;
  let bestRating = -1;

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];
      const recentA = (statsByPlayer.get(pA.id) ?? []).slice(0, RECENT_WINDOW);
      const recentB = (statsByPlayer.get(pB.id) ?? []).slice(0, RECENT_WINDOW);
      const recentBByMatch = new Map(recentB.map((s) => [s.matchId, s]));

      let togetherTotal = 0;
      let togetherWins = 0;
      let ratingSum = 0;

      for (const sA of recentA) {
        const sB = recentBByMatch.get(sA.matchId);
        if (sB && sA.team === sB.team) {
          togetherTotal++;
          if (isWin(sA)) togetherWins++;
          ratingSum += (sA.rating + sB.rating) / 2;
        }
      }

      if (togetherTotal >= MIN_TOGETHER_RECENT) {
        const winrate = (togetherWins / togetherTotal) * 100;
        const avgRating = ratingSum / togetherTotal;

        if (winrate > bestWinrate || (winrate === bestWinrate && avgRating > bestRating)) {
          bestWinrate = winrate;
          bestRating = avgRating;
          best = {
            playerA: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
            playerB: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
            total: togetherTotal,
            wins: togetherWins,
            winrate: Math.round(winrate),
            avgRating: Number(avgRating.toFixed(2)),
          };
        }
      }
    }
  }

  return best;
}

// ─── Funcionalidade 5: Curiosidade da Semana ───────────────────────────────

export type WeeklyCuriosityCategory = "streak-hot" | "streak-cold" | "map" | "adr" | "weekly-kills" | "headshot-king" | "impact-beast" | "duo-perfect";

export interface WeeklyCuriosity {
  id: string;
  text: string;
  category: WeeklyCuriosityCategory;
  player: { id: string; nickname: string; avatarUrl: string | null } | null;
  /** Métrica de apoio exibida junto ao texto (ex: "6" para streak, "Nuke" para mapa). */
  metric: string;
}

const MIN_GAMES_ON_MAP_FOR_CURIOSITY = 3;

/**
 * Gera candidatos de curiosidade a partir de regras determinísticas (sem IA) e
 * escolhe o de maior "score" — não há empate relevante na prática, mas o critério
 * de desempate é a ordem em que os candidatos foram avaliados. `category`/`player`/
 * `metric` são metadados puramente de apresentação (não influenciam qual candidato
 * vence) — permitem que o card escolha ícone/avatar corretos sem repetir a lógica.
 */
function getWeeklyCuriosityFromDataset(
  dataset: CompetitiveDataset,
  streaks: { hot: StreakEntry[]; cold: StreakEntry[] },
  seasonComparison: SeasonComparisonEntry[],
): WeeklyCuriosity | null {
  const candidates: (WeeklyCuriosity & { score: number })[] = [];

  // 1. Maior sequência de vitórias atual
  const topHot = streaks.hot[0];
  if (topHot && topHot.streak >= 3) {
    candidates.push({
      id: `curiosity-hot-${topHot.player.id}`,
      text: `${topHot.player.nickname} venceu ${topHot.streak} das últimas ${topHot.matchCount} partidas.`,
      category: "streak-hot",
      player: { id: topHot.player.id, nickname: topHot.player.nickname, avatarUrl: topHot.player.avatarUrl },
      metric: `${topHot.streak}`,
      score: topHot.streak * 10,
    });
  }

  // 2. Maior sequência de derrotas atual
  const topCold = streaks.cold[0];
  if (topCold && topCold.streak >= 3) {
    candidates.push({
      id: `curiosity-cold-${topCold.player.id}`,
      text: `${topCold.player.nickname} perdeu ${topCold.streak} seguidas.`,
      category: "streak-cold",
      player: { id: topCold.player.id, nickname: topCold.player.nickname, avatarUrl: topCold.player.avatarUrl },
      metric: `${topCold.streak}`,
      score: topCold.streak * 9,
    });
  }

  // 3. Jogador invicto em algum mapa (mínimo de partidas na temporada)
  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    const byMap = new Map<string, { wins: number; total: number }>();
    for (const s of stats) {
      const mapName = s.match.map.name;
      const entry = byMap.get(mapName) ?? { wins: 0, total: 0 };
      entry.total++;
      if (isWin(s)) entry.wins++;
      byMap.set(mapName, entry);
    }
    for (const [mapName, entry] of byMap.entries()) {
      if (entry.total >= MIN_GAMES_ON_MAP_FOR_CURIOSITY && entry.wins === entry.total) {
        candidates.push({
          id: `curiosity-invicto-${player.id}-${mapName}`,
          text: `${player.nickname} está invicto na ${mapName} (${entry.total} partidas).`,
          category: "map",
          player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
          metric: mapName,
          score: entry.total * 8,
        });
      }
    }
  }

  // 4. Maior aumento de ADR nas últimas 10 partidas frente à temporada
  const topAdrGain = [...seasonComparison].sort((a, b) => b.diff.adr - a.diff.adr)[0];
  if (topAdrGain && topAdrGain.season.adr > 0) {
    const adrPercent = Math.round((topAdrGain.diff.adr / topAdrGain.season.adr) * 100);
    if (adrPercent >= 10) {
      candidates.push({
        id: `curiosity-adr-${topAdrGain.player.id}`,
        text: `${topAdrGain.player.nickname} aumentou o ADR em ${adrPercent}% nas últimas partidas.`,
        category: "adr",
        player: {
          id: topAdrGain.player.id,
          nickname: topAdrGain.player.nickname,
          avatarUrl: topAdrGain.player.avatarUrl,
        },
        metric: `+${adrPercent}%`,
        score: adrPercent,
      });
    }
  }

  // 5. Melhor atuação em kills nos últimos 7 dias corridos
  const latestMatch = dataset.allStats[0]?.match ?? null;
  if (latestMatch) {
    const sevenDaysAgo = new Date(new Date(latestMatch.playedAt).getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyStats = dataset.allStats.filter((s) => new Date(s.match.playedAt) >= sevenDaysAgo);
    const topWeekly = [...weeklyStats].sort((a, b) => b.kills - a.kills)[0] ?? null;
    const topWeeklyPlayer = topWeekly
      ? dataset.activePlayers.find((p) => p.id === topWeekly.playerId)
      : null;

    if (topWeekly && topWeeklyPlayer && topWeekly.kills >= 26) {
      candidates.push({
        id: `curiosity-weekly-kills-${topWeeklyPlayer.id}`,
        text: `${topWeeklyPlayer.nickname} fez ${topWeekly.kills} kills na ${topWeekly.match.map.name} essa semana.`,
        category: "weekly-kills",
        player: { id: topWeeklyPlayer.id, nickname: topWeeklyPlayer.nickname, avatarUrl: topWeeklyPlayer.avatarUrl },
        metric: `${topWeekly.kills}`,
        score: topWeekly.kills * 2,
      });
    }
  }

  // 6. Rei do HS
  let topHsPlayer: any = null;
  let topHsRate = 0;
  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length < 3) continue;
    const kills = stats.reduce((sum, s) => sum + s.kills, 0);
    const hs = stats.reduce((sum, s) => sum + s.headshots, 0);
    const hsRate = kills > 0 ? (hs / kills) * 100 : 0;
    if (hsRate > topHsRate) {
      topHsRate = hsRate;
      topHsPlayer = player;
    }
  }
  if (topHsPlayer && topHsRate >= 45) {
    candidates.push({
      id: `curiosity-hs-${topHsPlayer.id}`,
      text: `${topHsPlayer.nickname} lidera a precisão com ${topHsRate.toFixed(1)}% de HS nas últimas partidas.`,
      category: "headshot-king",
      player: { id: topHsPlayer.id, nickname: topHsPlayer.nickname, avatarUrl: topHsPlayer.avatarUrl },
      metric: `${topHsRate.toFixed(1)}%`,
      score: Math.round(topHsRate),
    });
  }

  // 7. Maior Impacto
  let bestMatchRating: any = null;
  for (const s of dataset.allStats) {
    if (!bestMatchRating || s.rating > bestMatchRating.rating) {
      bestMatchRating = s;
    }
  }
  if (bestMatchRating && bestMatchRating.rating >= 1.45) {
    const p = dataset.activePlayers.find((x) => x.id === bestMatchRating.playerId);
    if (p) {
      candidates.push({
        id: `curiosity-impact-${p.id}-${bestMatchRating.match.id}`,
        text: `${p.nickname} destruiu a partida com ${bestMatchRating.rating.toFixed(2)} de Rating na ${bestMatchRating.match.map.name}.`,
        category: "impact-beast",
        player: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl },
        metric: `${bestMatchRating.rating.toFixed(2)}`,
        score: Math.round(bestMatchRating.rating * 50),
      });
    }
  }

  // 8. Melhor Dupla Recente
  const bestDuo = getBestRecentDuoFromDataset(dataset);
  if (bestDuo && bestDuo.winrate >= 66) {
    candidates.push({
      id: `curiosity-duo-${bestDuo.playerA.id}-${bestDuo.playerB.id}`,
      text: `A dupla ${bestDuo.playerA.nickname} + ${bestDuo.playerB.nickname} venceu ${bestDuo.wins} de ${bestDuo.total} jogos juntos recentemente (${bestDuo.winrate}% winrate).`,
      category: "duo-perfect",
      player: { id: bestDuo.playerA.id, nickname: bestDuo.playerA.nickname, avatarUrl: bestDuo.playerA.avatarUrl },
      metric: `${bestDuo.winrate}%`,
      score: bestDuo.winrate,
    });
  }

  if (candidates.length === 0) return null;

  // Seleção rotativa baseada no dia do ano
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const selectedIndex = dayOfYear % candidates.length;

  const { score: _score, ...winner } = candidates[selectedIndex];
  return winner;
}

// ─── Funcionalidade 6: Alertas Inteligentes ────────────────────────────────

export type SmartAlertKind = "milestone" | "drop" | "best-map" | "worst-map";

export interface SmartAlert {
  id: string;
  text: string;
  severity: "positive" | "warning";
  kind: SmartAlertKind;
  player: { id: string; nickname: string; avatarUrl: string | null } | null;
}

const RATING_MILESTONES = [1.3, 1.2, 1.1, 1.0];

/**
 * Não recebe o dataset diretamente: opera sobre `seasonComparison` (já calculado por
 * getSeasonComparisonFromDataset) e sobre bestMap/worstMap, que a Dashboard já busca
 * separadamente via statsService.getMapWinrates(). Evita uma nova query e duplicar a
 * lógica de cálculo de winrate por mapa, que já existe em stats.service.ts. `kind`/
 * `player` são metadados de apresentação — não mudam quais alertas disparam.
 */
export function getSmartAlerts(
  seasonComparison: SeasonComparisonEntry[],
  bestMap: MapPerformanceEntry | null,
  worstMap: MapPerformanceEntry | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  // Jogadores que cruzaram um patamar de Rating nas últimas 10 partidas (não estavam lá na temporada)
  for (const entry of seasonComparison) {
    const milestone = RATING_MILESTONES.find((m) => entry.recent.rating >= m && entry.season.rating < m);
    if (milestone) {
      alerts.push({
        id: `alert-milestone-${entry.player.id}`,
        text: `${entry.player.nickname} chegou em Rating ${milestone.toFixed(2)}`,
        severity: "positive",
        kind: "milestone",
        player: { id: entry.player.id, nickname: entry.player.nickname, avatarUrl: entry.player.avatarUrl },
      });
    }
  }

  // Jogadores com queda de rating >= 10% nas últimas 10 partidas frente à temporada
  for (const entry of seasonComparison) {
    if (entry.season.rating <= 0) continue;
    const dropPercent = (entry.diff.rating / entry.season.rating) * 100;
    if (dropPercent <= -10) {
      alerts.push({
        id: `alert-drop-${entry.player.id}`,
        text: `${entry.player.nickname} caiu mais de 10% no Rating`,
        severity: "warning",
        kind: "drop",
        player: { id: entry.player.id, nickname: entry.player.nickname, avatarUrl: entry.player.avatarUrl },
      });
    }
  }

  // Mapa mais forte / mais fraco da temporada (mesmos dados já usados no card Map Pool)
  if (bestMap) {
    alerts.push({
      id: "alert-best-map",
      text: `${bestMap.map} é o mapa mais forte do time (${bestMap.winrate.toFixed(0)}% WR)`,
      severity: "positive",
      kind: "best-map",
      player: null,
    });
  }
  if (worstMap) {
    alerts.push({
      id: "alert-worst-map",
      text: `Evitem ${worstMap.map} — ${worstMap.winrate.toFixed(0)}% de aproveitamento na temporada`,
      severity: "warning",
      kind: "worst-map",
      player: null,
    });
  }

  return alerts.slice(0, 5);
}

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
  records: HallOfFameRecord[];
  bestPerformance: PerformanceExtreme | null;
  worstPerformance: PerformanceExtreme | null;
  smartAlerts: SmartAlert[];
  monitoredPlayers: MonitoredPlayerEntry[];
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
  seasonComparison: SeasonComparisonEntry[];
  topGainers: SeasonComparisonEntry[];
  topDecliners: SeasonComparisonEntry[];
  bestRecentDuo: DuoSummary | null;
  weeklyCuriosity: WeeklyCuriosity | null;
  /** Winrate por mapa da comunidade — fonte única para o gráfico Map Pool, InsightTiles e Smart Alerts. */
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
  advancedPerformance: AdvancedPerformanceStats;
  multikillsLeaderboards: MultikillsBundle;
  highlightsPool: DashboardHighlight[];
}

export interface MultikillLeaderboardEntry {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  count: number;
}

export interface MultikillsBundle {
  doubleKills: MultikillLeaderboardEntry[];
  tripleKills: MultikillLeaderboardEntry[];
  quadKills: MultikillLeaderboardEntry[];
  aces: MultikillLeaderboardEntry[];
}

export interface AdvancedPerformanceStats {
  sampleSize: number;
  averageDamage: number | null;
  averageGcRating: number | null;
  totalDoubleKills: number | null;
  totalTripleKills: number | null;
  totalQuadKills: number | null;
  totalAces: number | null;
}

/**
 * Aceita um dataset pré-carregado (compartilhado com dashboard.service via
 * Promise única em page.tsx) para evitar buscar PlayerMatchStats duas vezes na
 * mesma requisição. Chamadores sem dataset em mãos continuam funcionando normalmente.
 */
export async function getDashboardCompetitiveBundle(
  dataset?: CompetitiveDataset,
): Promise<DashboardCompetitiveBundle> {
  const ds = dataset ?? (await loadCompetitiveDataset());

  const decisive = await getDecisivePlayersFromDataset(ds, 3);

  const extremes = getPerformanceExtremesFromDataset(ds);
  const mapPerformance = getMapPerformanceFromDataset(ds);

  const streaks = getStreaksFromDataset(ds);
  const seasonComparison = getSeasonComparisonFromDataset(ds);
  const topGainers = seasonComparison.filter((e) => e.diff.rating > 0).slice(0, 3);
  const topDecliners = [...seasonComparison]
    .reverse()
    .filter((e) => e.diff.rating < 0)
    .slice(0, 3);

  return {
    powerRanking: getPowerRankingFromDataset(ds, 15),
    momentum: getPlayerMomentumFromDataset(ds, 3),
    decisive,
    archetypes: getPlayerArchetypesFromDataset(ds),
    matchups: getPlayerMatchupsFromDataset(ds),
    jogadorDaSemana: getJogadorDaSemanaFromDataset(ds),
    duos: getDuoLeaderboardFromDataset(ds, 2),
    dominantTrio: getDominantTrioFromDataset(ds),
    mapSpecialists: getMapSpecialistsFromDataset(ds),
    records: getHallOfFameRecordsFromDataset(ds),
    bestPerformance: extremes.best,
    worstPerformance: extremes.worst,
    smartAlerts: getSmartAlerts(seasonComparison, mapPerformance.bestMap, mapPerformance.worstMap),
    monitoredPlayers: getMonitoredPlayersFromDataset(ds),
    hotStreaks: streaks.hot,
    coldStreaks: streaks.cold,
    seasonComparison,
    topGainers,
    topDecliners,
    bestRecentDuo: getBestRecentDuoFromDataset(ds),
    mapWinrates: mapPerformance.mapWinrates,
    bestMap: mapPerformance.bestMap,
    worstMap: mapPerformance.worstMap,
    weeklyCuriosity: getWeeklyCuriosityFromDataset(ds, streaks, seasonComparison),
    advancedPerformance: getAdvancedPerformanceStatsFromDataset(ds),
    multikillsLeaderboards: getMultikillsLeaderboards(ds),
    highlightsPool: generateHighlights(ds),
  };
}

export function getAdvancedPerformanceStatsFromDataset(
  dataset: CompetitiveDataset
): AdvancedPerformanceStats {
  const { allStats } = dataset;

  const advancedStats = allStats.filter(
    (s) =>
      s.damage != null ||
      s.gcRating != null ||
      s.doubleKills != null ||
      s.tripleKills != null ||
      s.quadKills != null ||
      s.aces != null
  );

  const matchIdsWithAdvancedData = new Set(advancedStats.map((s) => s.matchId));
  const sampleSize = matchIdsWithAdvancedData.size;

  const damageStats = allStats.filter((s) => s.damage != null);
  const averageDamage = damageStats.length > 0
    ? Math.round(damageStats.reduce((sum, s) => sum + s.damage!, 0) / damageStats.length)
    : null;

  const gcRatingStats = allStats.filter((s) => s.gcRating != null);
  const averageGcRating = gcRatingStats.length > 0
    ? Number((gcRatingStats.reduce((sum, s) => sum + s.gcRating!, 0) / gcRatingStats.length).toFixed(2))
    : null;

  const doubleKillsStats = allStats.filter((s) => s.doubleKills != null);
  const totalDoubleKills = doubleKillsStats.length > 0
    ? doubleKillsStats.reduce((sum, s) => sum + s.doubleKills!, 0)
    : null;

  const tripleKillsStats = allStats.filter((s) => s.tripleKills != null);
  const totalTripleKills = tripleKillsStats.length > 0
    ? tripleKillsStats.reduce((sum, s) => sum + s.tripleKills!, 0)
    : null;

  const quadKillsStats = allStats.filter((s) => s.quadKills != null);
  const totalQuadKills = quadKillsStats.length > 0
    ? quadKillsStats.reduce((sum, s) => sum + s.quadKills!, 0)
    : null;

  const acesStats = allStats.filter((s) => s.aces != null);
  const totalAces = acesStats.length > 0
    ? acesStats.reduce((sum, s) => sum + s.aces!, 0)
    : null;

  return {
    sampleSize,
    averageDamage,
    averageGcRating,
    totalDoubleKills,
    totalTripleKills,
    totalQuadKills,
    totalAces,
  };
}

export function getMultikillsLeaderboards(dataset: CompetitiveDataset): MultikillsBundle {
  const { activePlayers, allStats } = dataset;

  const doubleMap = new Map<string, number>();
  const tripleMap = new Map<string, number>();
  const quadMap = new Map<string, number>();
  const aceMap = new Map<string, number>();

  for (const p of activePlayers) {
    doubleMap.set(p.id, 0);
    tripleMap.set(p.id, 0);
    quadMap.set(p.id, 0);
    aceMap.set(p.id, 0);
  }

  for (const s of allStats) {
    doubleMap.set(s.playerId, (doubleMap.get(s.playerId) ?? 0) + (s.doubleKills ?? 0));
    tripleMap.set(s.playerId, (tripleMap.get(s.playerId) ?? 0) + (s.tripleKills ?? 0));
    quadMap.set(s.playerId, (quadMap.get(s.playerId) ?? 0) + (s.quadKills ?? 0));
    aceMap.set(s.playerId, (aceMap.get(s.playerId) ?? 0) + (s.aces ?? 0));
  }

  const getTop6 = (map: Map<string, number>): MultikillLeaderboardEntry[] => {
    return Array.from(map.entries())
      .map(([playerId, count]) => {
        const player = activePlayers.find((pl) => pl.id === playerId);
        return {
          playerId,
          nickname: player?.nickname ?? "Desconhecido",
          avatarUrl: player?.avatarUrl ?? null,
          count,
        };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  return {
    doubleKills: getTop6(doubleMap),
    tripleKills: getTop6(tripleMap),
    quadKills: getTop6(quadMap),
    aces: getTop6(aceMap),
  };
}
