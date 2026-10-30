import { prisma } from "@/server/db";
import { cleanMapName } from "@/lib/utils";
import { communityMatchStatsWhere, communityMatchWhere, individualMatchWhere } from "@/server/domain/matchClassification";
import { calculateWeightedAdr } from "@/server/domain/adr";
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
  rawRating?: number;
  rawImpact?: number;
  rawKast?: number;
  rawWinrate?: number;
  rawAdr?: number;
  rawKd?: number;
  rawHsPercent?: number;
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
  isForming?: boolean;
  dataUnavailable?: boolean;
}

export interface FeaturedPlayerInfo {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  rating: number;
  rawRating: number;
  matchCount: number;
  wins: number;
  winrate: number;
  winrateMatchesCount: number;
  justification: string;
  evolution: {
    diffRating: number;
    text: string;
    direction: "up" | "down" | "stable";
  } | null;
}

export type PeriodFactKind = "streak-active" | "streak-concluded" | "collective-map";

export interface PeriodFactInfo {
  kind: PeriodFactKind;
  title: string;
  description: string;
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null } | null;
  badgeLabel: string;
  badgeVariant: "gold" | "info" | "neutral" | "warning";
  detail?: string;
  streakCount?: number;
  mapName?: string;
  endDate?: string;
}

export interface AttentionPointInfo {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  dropRating: number;
  rawDiff: number;
  previousRating: number;
  recentRating: number;
  previousMatchesCount: number;
  recentMatchesCount: number;
  explanation: string;
}

export interface SquadMomentumBlock {
  matchesCount: number;
  wins: number;
  losses: number;
  ties: number;
  winrate: number;
  roundsFor: number;
  roundsAgainst: number;
  roundDiff: number;
  startDate: string;
  endDate: string;
}

export interface SquadMomentumInfo {
  eligibleMatchesCount: number;
  recentBlock: SquadMomentumBlock | null;
  previousBlock: SquadMomentumBlock | null;
  diffPp: number | null;
  hasComparison: boolean;
  sampleStatus: "full" | "partial" | "insufficient";
  emptyReason: string | null;
}

export interface SessionPaceInfo {
  totalEligibleSessions: number;
  totalEligibleMatches: number;
  averageMatchesPerSession: number;
  latestSession: {
    id: string;
    name: string;
    date: string;
    eligibleMatchesCount: number;
    latestMatchPlayedAt: string;
    latestMatchTimeFormatted: string;
  } | null;
  emptyReason: string | null;
}

export interface MatchCompositionInfo {
  totalUniverse: number;
  soloCount: number;
  soloPercentage: number;
  smallTeamCount: number;
  smallTeamPercentage: number;
  fullTeamCount: number;
  fullTeamPercentage: number;
  confrontationCount: number;
  confrontationPercentage: number;
  otherCount: number;
  teamCount: number;
  teamPercentage: number;
  emptyReason: string | null;
}

export interface RecentParticipationInfo {
  windowDays: number;
  windowStartDate: string;
  windowEndDate: string;
  activeCount: number;
  totalActiveMonitored: number;
  latestMatchPlayedAt: string | null;
  participatingPlayers: Array<{
    id: string;
    nickname: string;
    avatarUrl: string | null;
    matchesCount: number;
  }>;
  emptyReason: string | null;
}

export interface GroupRadarBundle {
  squadMomentum: SquadMomentumInfo;
  sessionPace: SessionPaceInfo;
  matchComposition: MatchCompositionInfo;
  recentParticipation: RecentParticipationInfo;

  // Legado mantido para retrocompatibilidade e snapshots históricos
  featuredPlayer?: FeaturedPlayerInfo | null;
  featuredPlayerEmptyReason?: string | null;
  periodFact?: PeriodFactInfo | null;
  periodFactEmptyReason?: string | null;
  attentionPoint?: AttentionPointInfo | null;
  attentionPointEmptyReason?: string | null;
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

export interface MapSpecialistPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  levelGc: number | null;
}

export interface MapPodiumEntry {
  player: MapSpecialistPlayer;
  rating: number;
  rawRating?: number;
  wins?: number;
  matches?: number;
  winrate?: number;
  rawWinrate?: number;
  wilsonScore?: number;
}

export interface MapSpecialist {
  mapId?: string;
  mapName: string;
  cleanMapName: string;
  player: MapSpecialistPlayer | null;
  rating: number | null;
  rawRating?: number;
  wins?: number;
  matches?: number;
  winrate?: number;
  rawWinrate?: number;
  wilsonScore?: number | null;
  minMatches: number;
  podium: MapPodiumEntry[];
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

import type {
  DecisivePlayerEntry,
  ClutchTierStats,
  CategoryLeaderResult,
  DecisiveCategoriesSummary,
} from "@/lib/decisive-categories";
export * from "@/lib/decisive-categories";

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

export interface RecordHolderContext {
  player: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
  matchId?: string;
  mapName?: string;
  cleanMapName?: string;
  playedAt?: string;
  playedAtFormatted?: string;
  scoreFor?: number;
  scoreAgainst?: number;
  scoreFormatted?: string;
  outcome?: "win" | "loss" | "tie";
  isOvertime?: boolean;
  participationContext?: string;
  individualStreak?: RecordSequenceContext;
  individualCumulative?: RecordCumulativeContext;
}

export interface RecordSequenceContext {
  count: number;
  startDate?: string;
  endDate?: string;
  formattedRange?: string;
  status: "active" | "ended";
  endedReason?: string;
  activeStreakCount?: number;
}

export interface RecordCumulativeContext {
  total: number;
  matchesPlayed: number;
  averagePerMatch: number;
  breakdown?: string;
}

export interface HallOfFameRecord {
  // Campos legados mantidos para retrocompatibilidade
  category: string;
  playerName: string;
  value: string;
  detail: string;
  matchId?: string;
  mapName?: string;

  // Campos estruturados enriquecidos (Fase 11)
  id?: string;
  title?: string;
  shortLabel?: string;
  scope?: "match" | "season_cumulative" | "streak";
  scopeLabel?: string;
  explanation?: string;
  isShared?: boolean;
  sharedCount?: number;
  holders?: RecordHolderContext[];
  sequenceContext?: RecordSequenceContext;
  cumulativeContext?: RecordCumulativeContext;
  availability?: "available" | "unavailable" | "unknown";
  unavailableReason?: string;
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
  let targetSeasonId = seasonId;
  if (seasonId === "all") {
    allStats = await prisma.playerMatchStats.findMany({
      where: {
        playerId: { in: activePlayers.map((p) => p.id) },
        match: individualMatchWhere(),
      },
      include: { match: { include: { map: true, session: true } } },
      orderBy: { match: { playedAt: "desc" } },
    });
  } else {
    if (!targetSeasonId) {
      const activeSeason = await getActiveSeason();
      targetSeasonId = activeSeason?.id;
    }

    allStats = await prisma.playerMatchStats.findMany({
      where: {
        playerId: { in: activePlayers.map((p) => p.id) },
        match: {
          seasonId: targetSeasonId || undefined,
          ...individualMatchWhere(),
        },
      },
      include: { match: { include: { map: true, session: true } } },
      orderBy: { match: { playedAt: "desc" } },
    });
  }

  const statsByPlayer = new Map<string, typeof allStats>();
  for (const p of activePlayers) statsByPlayer.set(p.id, []);
  for (const s of allStats) {
    statsByPlayer.get(s.playerId)?.push(s);
  }

  return { activePlayers, statsByPlayer, allStats, seasonId: targetSeasonId };
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

export function getPowerRankingFromDataset(dataset: CompetitiveDataset, take?: number): PowerRankingEntry[] {
  const entries: PowerRankingEntry[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const totalMatches = stats.length;
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
    const avgImpact = stats.reduce((sum, s) => sum + s.impact, 0) / totalMatches;
    const avgAdr = calculateWeightedAdr(stats);
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
      rawRating: avgRating,
      rawImpact: avgImpact,
      rawKast: avgKast,
      rawWinrate: winrate,
      rawAdr: avgAdr,
      rawKd: kd,
      rawHsPercent: hsPercent,
    });
  }

  entries.sort((a, b) => {
    const valA = a.rawRating ?? a.rating;
    const valB = b.rawRating ?? b.rating;
    const diff = valB - valA;
    if (Math.abs(diff) > 1e-9) return diff;
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    const nickDiff = a.player.nickname.localeCompare(b.player.nickname);
    if (nickDiff !== 0) return nickDiff;
    return a.player.id.localeCompare(b.player.id);
  });

  return take !== undefined ? entries.slice(0, take) : entries;
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
    const avgAdr = calculateWeightedAdr(stats);
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
        label: "Perfil em formação",
        metricLabel: "Amostra em consolidação",
        metricValue: `${item.totalMatches} partidas`,
        rankText: "Mínimo de 10 partidas para definição de perfil",
        rating: Math.round(item.avgRating * 100) / 100,
        matchCount: item.totalMatches,
        isForming: true,
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

    // Amostra inicial (< 10 partidas): identifica o arquétipo internamente mas expõe como "Perfil em formação"
    if (item.totalMatches < 10) {
      return {
        player: item.player,
        archetype,
        label: "Perfil em formação",
        metricLabel: "Amostra em consolidação",
        metricValue: `${item.totalMatches} partidas`,
        rankText: "Mínimo de 10 partidas para definição de perfil",
        rating: Math.round(item.avgRating * 100) / 100,
        matchCount: item.totalMatches,
        isForming: true,
      };
    }

    // Caso a temporada não tenha dados da métrica associada (ex: clutch ausente em súmula GC sem demo)
    if (archetype === "clutch" && allClutch.every((v) => v === 0)) {
      return {
        player: item.player,
        archetype,
        label: "Perfil Indeterminado",
        metricLabel: "Telemetria ausente",
        metricValue: "—",
        rankText: "Dados insuficientes para definir o perfil",
        rating: Math.round(item.avgRating * 100) / 100,
        matchCount: item.totalMatches,
        dataUnavailable: true,
      };
    }

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
      isForming: false,
    };
  });
}

function getJogadorDaSemanaFromDataset(
  dataset: CompetitiveDataset,
  featuredPlayer?: FeaturedPlayerInfo | null
): JogadorDaSemanaInfo | null {
  const feat =
    featuredPlayer !== undefined
      ? featuredPlayer
      : getFeaturedPlayerFromDataset(dataset, getSeasonComparisonFromDataset(dataset)).player;

  if (!feat) return null;

  return {
    player: feat.player,
    rating: feat.rating,
    winrate: Math.round(feat.winrate),
    evolution: feat.evolution ? Math.round(feat.evolution.diffRating * 100) : 0,
    evolutionText: feat.evolution?.text ?? "Estável",
  };
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

export const MAP_MIN_MATCHES = 5;

/**
 * Calcula o limite inferior do intervalo de confiança de Wilson (95% nominal) para a proporção de vitórias.
 *
 * z = 1.959963984540054 (nível de confiança de 95%)
 * Score conservador de aproveitamento penalizando amostras muito pequenas sem favorecer
 * desproporcionalmente casos como 5/5 frente a 14/20.
 */
export function calculateWilsonScore(wins: number, matches: number): number {
  if (!Number.isFinite(wins) || !Number.isFinite(matches) || matches <= 0 || wins <= 0) {
    return 0;
  }
  const safeWins = Math.min(wins, matches);
  const z = 1.959963984540054;
  const p = safeWins / matches;
  const z2 = z * z;

  const score =
    (
      p +
      z2 / (2 * matches) -
      z * Math.sqrt(
        (p * (1 - p)) / matches +
        z2 / (4 * matches * matches)
      )
    ) /
    (1 + z2 / matches);

  return Number.isFinite(score) ? Math.max(0, score) : 0;
}

export function getMapSpecialistsFromDataset(dataset: CompetitiveDataset): MapSpecialist[] {
  const byMap = new Map<
    string,
    {
      mapId?: string;
      playerStats: Map<string, { player: PlayerRow; matches: number; wins: number; ratings: number[] }>;
    }
  >();

  for (const s of dataset.allStats) {
    const mapName = s.match.map.name;
    const mapId = (s.match.map as any)?.id;
    const player = dataset.activePlayers.find((p) => p.id === s.playerId);
    if (!player) continue;

    const mapEntry = byMap.get(mapName) ?? {
      mapId,
      playerStats: new Map<string, { player: PlayerRow; matches: number; wins: number; ratings: number[] }>(),
    };
    if (!mapEntry.mapId && mapId) {
      mapEntry.mapId = mapId;
    }

    const entry = mapEntry.playerStats.get(s.playerId) ?? { player, matches: 0, wins: 0, ratings: [] };
    entry.matches += 1;
    entry.ratings.push(s.rating);
    if (isWin(s)) entry.wins += 1;
    mapEntry.playerStats.set(s.playerId, entry);
    byMap.set(mapName, mapEntry);
  }

  const specialists: MapSpecialist[] = [];

  for (const [mapName, mapEntry] of byMap.entries()) {
    const playersList = Array.from(mapEntry.playerStats.values()).map((p) => {
      const avgRating = p.ratings.reduce((sum, r) => sum + r, 0) / p.ratings.length;
      const rawWinrate = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
      const wilsonScore = calculateWilsonScore(p.wins, p.matches);
      return {
        ...p,
        rawRating: avgRating,
        avgRating: Number(avgRating.toFixed(2)),
        rawWinrate,
        winrate: Math.round(rawWinrate * 10) / 10,
        wilsonScore,
      };
    });

    const minMatches = MAP_MIN_MATCHES;

    // Elegibilidade fixa por mapa: pelo menos 5 partidas válidas E pelo menos 1 vitória
    const eligible = playersList.filter((p) => p.matches >= minMatches && p.wins >= 1);

    if (eligible.length === 0) {
      specialists.push({
        mapId: mapEntry.mapId,
        mapName,
        cleanMapName: cleanMapName(mapName),
        player: null,
        rating: null,
        wins: 0,
        matches: 0,
        winrate: 0,
        wilsonScore: null,
        minMatches,
        podium: [],
      });
      continue;
    }

    // Regra de ordenação do Top 3:
    // 1. Maior score de Wilson (wilsonScore DESC)
    // 2. Maior aproveitamento bruto, sem arredondamento (rawWinrate DESC)
    // 3. Maior quantidade de vitórias (wins DESC)
    // 4. Maior rating individual, sem arredondamento (rawRating DESC)
    // 5. ID do jogador em ordem crescente, como desempate estável (a.player.id.localeCompare(b.player.id) ASC)
    eligible.sort((a, b) => {
      if (b.wilsonScore !== a.wilsonScore) return b.wilsonScore - a.wilsonScore;
      if (b.rawWinrate !== a.rawWinrate) return b.rawWinrate - a.rawWinrate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.rawRating !== a.rawRating) return b.rawRating - a.rawRating;
      return a.player.id.localeCompare(b.player.id);
    });

    const leader = eligible[0];
    const podium: MapPodiumEntry[] = eligible.slice(0, 3).map((item) => ({
      player: {
        id: item.player.id,
        nickname: item.player.nickname,
        avatarUrl: item.player.avatarUrl,
        levelGc: item.player.levelGc,
      },
      rating: item.avgRating,
      rawRating: item.rawRating,
      wins: item.wins,
      matches: item.matches,
      winrate: item.winrate,
      rawWinrate: item.rawWinrate,
      wilsonScore: item.wilsonScore,
    }));

    specialists.push({
      mapId: mapEntry.mapId,
      mapName,
      cleanMapName: cleanMapName(mapName),
      player: {
        id: leader.player.id,
        nickname: leader.player.nickname,
        avatarUrl: leader.player.avatarUrl,
        levelGc: leader.player.levelGc,
      },
      rating: leader.avgRating,
      rawRating: leader.rawRating,
      wins: leader.wins,
      matches: leader.matches,
      winrate: leader.winrate,
      rawWinrate: leader.rawWinrate,
      wilsonScore: leader.wilsonScore,
      minMatches,
      podium,
    });
  }

  return specialists.sort((a, b) => {
    if (a.player && !b.player) return -1;
    if (!a.player && b.player) return 1;
    const aMatches = typeof a.matches === "number" ? a.matches : 0;
    const bMatches = typeof b.matches === "number" ? b.matches : 0;
    const aWins = typeof a.wins === "number" ? a.wins : 0;
    const bWins = typeof b.wins === "number" ? b.wins : 0;
    return bMatches - aMatches || bWins - aWins || a.cleanMapName.localeCompare(b.cleanMapName);
  });
}

/**
 * Normaliza especialistas de mapa legados ou incompletos vindos de snapshots.
 * Garante que campos ausentes não quebrem a tipagem e prioriza o recálculo via dataset quando disponível.
 */
export function normalizeLegacyMapSpecialists(
  specialists: any[] | undefined,
  fallbackSpecialists?: MapSpecialist[]
): MapSpecialist[] {
  if (fallbackSpecialists && fallbackSpecialists.length > 0) {
    const hasValidWinrates = fallbackSpecialists.some((s) => typeof s.winrate === "number");
    if (hasValidWinrates) {
      return fallbackSpecialists;
    }
  }

  if (!Array.isArray(specialists) || specialists.length === 0) {
    return [];
  }

  return specialists.map((s) => {
    const mapName = s.mapName || "Desconhecido";
    const wins = typeof s.wins === "number" ? s.wins : (s.player ? undefined : 0);
    const matches = typeof s.matches === "number" ? s.matches : (s.player ? undefined : 0);
    const rawWinrate =
      typeof s.rawWinrate === "number"
        ? s.rawWinrate
        : typeof s.winrate === "number"
          ? s.winrate
          : wins !== undefined && matches !== undefined && matches > 0
            ? (wins / matches) * 100
            : undefined;

    const winrate = rawWinrate !== undefined ? Math.round(rawWinrate * 10) / 10 : undefined;
    const rating = typeof s.rating === "number" ? s.rating : null;
    const rawRating = typeof s.rawRating === "number" ? s.rawRating : (rating ?? undefined);

    const podium: MapPodiumEntry[] = Array.isArray(s.podium) && s.podium.length > 0
      ? s.podium
      : s.player
        ? [
            {
              player: s.player,
              rating: rating ?? 0,
              rawRating,
              wins,
              matches,
              winrate,
              rawWinrate,
              wilsonScore: s.wilsonScore ?? undefined,
            },
          ]
        : [];

    return {
      mapId: s.mapId,
      mapName,
      cleanMapName: cleanMapName(s.cleanMapName || mapName),
      player: s.player ?? null,
      rating,
      rawRating,
      wins,
      matches,
      winrate,
      rawWinrate,
      wilsonScore: s.wilsonScore ?? null,
      minMatches: typeof s.minMatches === "number" ? s.minMatches : MAP_MIN_MATCHES,
      podium,
    };
  });
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

function getWinnerSide(winnerTeam: string | null): "A" | "B" | null {
  if (!winnerTeam) return null;
  const t = winnerTeam.toUpperCase();
  if (t === "T" || t === "TERRORIST") return "A";
  if (t === "CT" || t === "COUNTER_TERRORIST") return "B";
  return null;
}



export async function getDecisivePlayersFromDataset(
  dataset: CompetitiveDataset,
  take?: number
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

  const matchIdsInDataset = Array.from(new Set(dataset.allStats.map((s) => s.matchId)));
  const playerIdsInDataset = dataset.activePlayers.map((p) => p.id);

  // 1. Clutches detalhados por tier (1v1 até 1v5) e desfecho
  const clutchGroup = matchIdsInDataset.length > 0
    ? await prisma.playerClutch.groupBy({
        by: ["playerId", "opponents", "won"],
        where: {
          matchId: { in: matchIdsInDataset },
          playerId: { in: playerIdsInDataset },
        },
        _count: { id: true },
      })
    : [];

  const clutchDataByPlayer = new Map<
    string,
    {
      totalAttempts: number;
      totalWins: number;
      highDisadvantageWins: number;
      tiers: Record<number, { wins: number; attempts: number }>;
    }
  >();

  for (const c of clutchGroup) {
    let p = clutchDataByPlayer.get(c.playerId);
    if (!p) {
      p = {
        totalAttempts: 0,
        totalWins: 0,
        highDisadvantageWins: 0,
        tiers: {
          1: { wins: 0, attempts: 0 },
          2: { wins: 0, attempts: 0 },
          3: { wins: 0, attempts: 0 },
          4: { wins: 0, attempts: 0 },
          5: { wins: 0, attempts: 0 },
        },
      };
      clutchDataByPlayer.set(c.playerId, p);
    }
    const count = c._count.id;
    p.totalAttempts += count;
    if (p.tiers[c.opponents]) {
      p.tiers[c.opponents].attempts += count;
    }
    if (c.won) {
      p.totalWins += count;
      if (p.tiers[c.opponents]) {
        p.tiers[c.opponents].wins += count;
      }
      if (c.opponents >= 2) {
        p.highDisadvantageWins += count;
      }
    }
  }

  // 2. Telemetria real de trades (PlayerTradeEvent)
  const traderGroup = matchIdsInDataset.length > 0
    ? await prisma.playerTradeEvent.groupBy({
        by: ["traderId"],
        where: {
          matchId: { in: matchIdsInDataset },
          traderId: { in: playerIdsInDataset },
        },
        _count: { id: true },
        _avg: { timeDiff: true },
      })
    : [];

  const tradesByPlayer = new Map<string, { count: number; avgTime: number | null }>();
  for (const t of traderGroup) {
    tradesByPlayer.set(t.traderId, {
      count: t._count.id,
      avgTime: t._avg.timeDiff !== null ? Number(t._avg.timeDiff.toFixed(2)) : null,
    });
  }

  const tradedDeathsGroup = matchIdsInDataset.length > 0
    ? await prisma.playerTradeEvent.groupBy({
        by: ["victimId"],
        where: {
          matchId: { in: matchIdsInDataset },
          victimId: { in: playerIdsInDataset },
        },
        _count: { id: true },
      })
    : [];

  const tradedDeathsByPlayer = new Map<string, number>();
  for (const group of tradedDeathsGroup) {
    tradedDeathsByPlayer.set(group.victimId, group._count.id);
  }

  // Identifica partidas com telemetria de trades para cálculo honesto do denominador
  const matchesWithTrades = matchIdsInDataset.length > 0
    ? await prisma.playerTradeEvent.findMany({
        where: { matchId: { in: matchIdsInDataset } },
        select: { matchId: true },
        distinct: ["matchId"],
      })
    : [];
  const tradeMatchIdSet = new Set(matchesWithTrades.map((m) => m.matchId));

  // 3. Telemetria de duelos de abertura (PlayerEntryDuel)
  const entryGroup = matchIdsInDataset.length > 0
    ? await prisma.playerEntryDuel.groupBy({
        by: ["playerId", "isKiller"],
        where: {
          matchId: { in: matchIdsInDataset },
          playerId: { in: playerIdsInDataset },
        },
        _count: { id: true },
      })
    : [];

  const entryDuelByPlayer = new Map<string, { fk: number; fd: number }>();
  for (const ed of entryGroup) {
    let p = entryDuelByPlayer.get(ed.playerId);
    if (!p) {
      p = { fk: 0, fd: 0 };
      entryDuelByPlayer.set(ed.playerId, p);
    }
    if (ed.isKiller) {
      p.fk += ed._count.id;
    } else {
      p.fd += ed._count.id;
    }
  }

  // First kills para aferição da taxa de vitória da equipe após FK
  const playerFirstKills = matchIdsInDataset.length > 0
    ? await prisma.playerEntryDuel.findMany({
        where: {
          matchId: { in: matchIdsInDataset },
          playerId: { in: playerIdsInDataset },
          isKiller: true,
        },
        select: {
          matchId: true,
          playerId: true,
          roundNumber: true,
          side: true,
        },
      })
    : [];

  const matchRoundsMap = new Map<string, any[]>();
  for (const s of dataset.allStats) {
    if (s.match?.roundsJson && !matchRoundsMap.has(s.matchId)) {
      matchRoundsMap.set(s.matchId, s.match.roundsJson as any[]);
    }
  }

  const fkConversionByPlayer = new Map<string, { roundsWonAfterFk: number; firstKillsWithRoundData: number }>();
  for (const fk of playerFirstKills) {
    let conv = fkConversionByPlayer.get(fk.playerId);
    if (!conv) {
      conv = { roundsWonAfterFk: 0, firstKillsWithRoundData: 0 };
      fkConversionByPlayer.set(fk.playerId, conv);
    }
    const rounds = matchRoundsMap.get(fk.matchId);
    if (rounds && Array.isArray(rounds)) {
      const r = rounds.find((rnd) => rnd && (rnd.number === fk.roundNumber || rnd.position === fk.roundNumber));
      if (r && r.winner_team) {
        const winnerSide = getWinnerSide(r.winner_team);
        if (winnerSide) {
          conv.firstKillsWithRoundData++;
          if (winnerSide === fk.side) conv.roundsWonAfterFk++;
        }
      } else if (r && r.teamAWin !== undefined) {
        conv.firstKillsWithRoundData++;
        const won = fk.side === "A" ? r.teamAWin : r.teamBWin;
        if (won) conv.roundsWonAfterFk++;
      }
    }
  }

  // Detecção de cobertura real de telemetria no dataset
  const totalEntryDeathsInDataset =
    dataset.allStats.reduce((sum, s) => sum + s.entryDeaths, 0) +
    Array.from(entryDuelByPlayer.values()).reduce((sum, e) => sum + e.fd, 0);
  const totalTradeKillsInDataset =
    dataset.allStats.reduce((sum, s) => sum + s.tradeKills, 0) +
    Array.from(tradesByPlayer.values()).reduce((sum, t) => sum + t.count, 0);
  const totalClutchesInDataset =
    Array.from(clutchDataByPlayer.values()).reduce((sum, c) => sum + c.totalWins, 0) +
    dataset.allStats.reduce(
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
  const totalTradedDeathsInDataset = Array.from(tradedDeathsByPlayer.values()).reduce((a, b) => a + b, 0);

  const hasOpeningDeathsTelemetry = totalEntryDeathsInDataset > 0;
  const hasTradeTelemetry = totalTradeKillsInDataset > 0 || totalTradedDeathsInDataset > 0;
  const hasClutchTelemetry = totalClutchesInDataset > 0;

  const entries: DecisivePlayerEntry[] = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const totalRounds = stats.reduce((sum, s) => sum + s.match.scoreTeamA + s.match.scoreTeamB, 0);
    if (totalRounds === 0) continue;

    // Entry Duels & Telemetria de Abertura
    const entryDuel = entryDuelByPlayer.get(player.id);
    const entryKills = entryDuel ? entryDuel.fk : stats.reduce((sum, s) => sum + s.entryKills, 0);

    let entryDeaths: number | null = null;
    let totalOpeningDuels: number | null = null;
    let rawOpeningWinrate: number | null = null;
    let openingWinrate: number | null = null;

    if (hasOpeningDeathsTelemetry && entryDuel) {
      entryDeaths = entryDuel.fd;
      totalOpeningDuels = entryKills + entryDeaths;
      if (totalOpeningDuels > 0) {
        rawOpeningWinrate = (entryKills / totalOpeningDuels) * 100;
        openingWinrate = Math.round(rawOpeningWinrate);
      }
    }

    // Team Win Rate after FK (só calculável quando há registro de rounds)
    const fkConv = fkConversionByPlayer.get(player.id);
    let rawTeamWinrateAfterFk: number | null = null;
    let teamWinrateAfterFk: number | null = null;
    let roundsWonAfterFk: number | null = null;
    let firstKillsWithRoundData: number | null = null;

    if (fkConv && fkConv.firstKillsWithRoundData > 0) {
      roundsWonAfterFk = fkConv.roundsWonAfterFk;
      firstKillsWithRoundData = fkConv.firstKillsWithRoundData;
      rawTeamWinrateAfterFk = (roundsWonAfterFk / firstKillsWithRoundData) * 100;
      teamWinrateAfterFk = Math.round(rawTeamWinrateAfterFk);
    }

    // Trades
    const tradeInfo = tradesByPlayer.get(player.id);
    const tradeKills = tradeInfo ? tradeInfo.count : stats.reduce((sum, s) => sum + s.tradeKills, 0);
    const avgTradeReactionTime = tradeInfo?.avgTime ?? null;
    const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
    const tradedDeaths = tradedDeathsByPlayer.get(player.id) ?? 0;

    // Denominador correto para Trade Efficiency (apenas partidas com telemetria de trade)
    const tradeMatchesStats = stats.filter((s) => tradeMatchIdSet.has(s.matchId));
    const deathsInTradeMatches = tradeMatchesStats.reduce((sum, s) => sum + s.deaths, 0);
    const tradeTelemetryMatchesCount = tradeMatchesStats.length;

    let rawTradeEfficiency: number | null = null;
    let tradeEfficiency: number | null = null;
    if (deathsInTradeMatches > 0) {
      rawTradeEfficiency = (tradedDeaths / deathsInTradeMatches) * 100;
      tradeEfficiency = Math.round(rawTradeEfficiency);
    }

    // Clutches
    const clutchData = clutchDataByPlayer.get(player.id);
    const statsClutchWins = stats.reduce(
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

    const clutchWins = clutchData ? clutchData.totalWins : statsClutchWins;
    const clutchAttempts = clutchData ? clutchData.totalAttempts : null;
    const rawClutchWinrate = clutchAttempts && clutchAttempts > 0 ? (clutchWins / clutchAttempts) * 100 : null;
    const clutchWinrate = rawClutchWinrate !== null ? Math.round(rawClutchWinrate) : null;
    const clutchHighDisadvantageWins = clutchData?.highDisadvantageWins ?? null;

    let clutchTiers: DecisivePlayerEntry["clutchTiers"] = null;
    if (clutchData) {
      const buildTierStats = (tier: number): ClutchTierStats => {
        const t = clutchData.tiers[tier] ?? { wins: 0, attempts: 0 };
        const wr = t.attempts > 0 ? Math.round((t.wins / t.attempts) * 100) : 0;
        return { wins: t.wins, attempts: t.attempts, winrate: wr };
      };

      clutchTiers = {
        "1v1": buildTierStats(1),
        "1v2": buildTierStats(2),
        "1v3": buildTierStats(3),
        "1v4": buildTierStats(4),
        "1v5": buildTierStats(5),
      };
    }

    const impactedRounds = entryKills + (hideTradesAndClutches ? 0 : tradeKills + clutchWins);
    const rawImpactPercent = Math.min(100, (impactedRounds / totalRounds) * 100);
    const impactPercent = Math.round(rawImpactPercent);

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      impactPercent,
      entryKills,
      entryDeaths,
      openingWinrate,
      tradeKills,
      tradedDeaths,
      tradeEfficiency,
      clutchWins,
      hideTradesAndClutches,
      matchCount: stats.length,
      totalRounds,
      totalDeaths,
      totalOpeningDuels,
      rawOpeningWinrate,
      rawTradeEfficiency,
      rawImpactPercent,
      hasOpeningDeathsTelemetry,
      hasTradeTelemetry,
      hasClutchTelemetry,

      // Novas métricas estruturadas
      clutchAttempts,
      clutchWinrate,
      rawClutchWinrate,
      clutchHighDisadvantageWins,
      clutchTiers,

      teamWinrateAfterFk,
      rawTeamWinrateAfterFk,
      roundsWonAfterFk,
      firstKillsWithRoundData,

      avgTradeReactionTime,
      deathsInTradeMatches,
      tradeTelemetryMatchesCount,
    });
  }

  entries.sort((a, b) => {
    const diff = (b.rawImpactPercent ?? b.impactPercent) - (a.rawImpactPercent ?? a.impactPercent);
    if (Math.abs(diff) > 1e-9) return diff;
    if ((b.matchCount ?? 0) !== (a.matchCount ?? 0)) return (b.matchCount ?? 0) - (a.matchCount ?? 0);
    const nickDiff = a.player.nickname.localeCompare(b.player.nickname);
    if (nickDiff !== 0) return nickDiff;
    return a.player.id.localeCompare(b.player.id);
  });

  return take !== undefined ? entries.slice(0, take) : entries;
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

function formatDateTimeSP(d?: Date | string | null): string | undefined {
  if (!d) return undefined;
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return undefined;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(dateObj);
}

function formatDateRangeSP(startDate?: Date | string | null, endDate?: Date | string | null): string | undefined {
  if (!startDate) return undefined;
  const dStart = typeof startDate === "string" ? new Date(startDate) : startDate;
  const dEnd = endDate ? (typeof endDate === "string" ? new Date(endDate) : endDate) : dStart;
  if (isNaN(dStart.getTime())) return undefined;

  const fmtDayMonth = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const startStr = fmtDayMonth.format(dStart);
  const endStr = fmtDayMonth.format(dEnd);
  const yearStr = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(dEnd);

  if (startStr === endStr) {
    return `${startStr}/${yearStr}`;
  }
  return `${startStr} a ${endStr}/${yearStr}`;
}

function getMatchParticipationContext(
  matchId: string,
  playerTeam: string,
  allStats: CompetitiveDataset["allStats"]
): string {
  const matchStats = allStats.filter((st) => st.matchId === matchId);
  if (matchStats.length <= 1) {
    return "1 monitorado na partida";
  }
  const sameTeamCount = matchStats.filter((st) => st.team === playerTeam).length;
  const opposingTeamCount = matchStats.filter((st) => st.team !== playerTeam).length;

  if (opposingTeamCount > 0) {
    return "Monitorados nos dois times";
  }
  if (sameTeamCount === 1) {
    return "1 monitorado na partida";
  }
  return `${sameTeamCount} monitorados no mesmo time`;
}

function buildHolderContextFromStat(
  stat: CompetitiveDataset["allStats"][number],
  player: { id: string; nickname: string; avatarUrl: string | null },
  allStats: CompetitiveDataset["allStats"]
): RecordHolderContext {
  const scoreFor = stat.team === "A" ? stat.match.scoreTeamA : stat.match.scoreTeamB;
  const scoreAgainst = stat.team === "A" ? stat.match.scoreTeamB : stat.match.scoreTeamA;
  const outcome: "win" | "loss" | "tie" =
    scoreFor > scoreAgainst ? "win" : scoreFor < scoreAgainst ? "loss" : "tie";
  const outcomeLabel = outcome === "win" ? "Vitória" : outcome === "loss" ? "Derrota" : "Empate";
  const isOvertime = stat.match.scoreTeamA + stat.match.scoreTeamB > 24;
  const scoreFormatted = `${scoreFor}x${scoreAgainst} (${outcomeLabel}${isOvertime ? " OT" : ""})`;
  const mapName = stat.match.map?.name ?? "Desconhecido";
  const cMap = cleanMapName(mapName);
  const playedAtIso = stat.match.playedAt
    ? typeof stat.match.playedAt === "string"
      ? stat.match.playedAt
      : stat.match.playedAt.toISOString()
    : undefined;

  return {
    player: {
      id: player.id,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
    },
    matchId: stat.match.id,
    mapName,
    cleanMapName: cMap,
    playedAt: playedAtIso,
    playedAtFormatted: formatDateTimeSP(stat.match.playedAt),
    scoreFor,
    scoreAgainst,
    scoreFormatted,
    outcome,
    isOvertime,
    participationContext: getMatchParticipationContext(stat.matchId, stat.team, allStats),
  };
}

function findExtremeMatchHolders(
  stats: CompetitiveDataset["allStats"],
  activePlayers: PlayerRow[],
  allUniverseStats: CompetitiveDataset["allStats"],
  getValue: (s: CompetitiveDataset["allStats"][number]) => number | null,
  mode: "max" | "min",
  tolerance: number = 0.0001
): { holders: RecordHolderContext[]; extremeValue: number | null; extremeStats: CompetitiveDataset["allStats"][number][] } {
  let extreme: number | null = null;
  for (const s of stats) {
    const v = getValue(s);
    if (v === null || isNaN(v)) continue;
    if (extreme === null) {
      extreme = v;
    } else if (mode === "max" && v > extreme) {
      extreme = v;
    } else if (mode === "min" && v < extreme) {
      extreme = v;
    }
  }

  if (extreme === null) return { holders: [], extremeValue: null, extremeStats: [] };

  const matchingStats = stats.filter((s) => {
    const v = getValue(s);
    if (v === null || isNaN(v)) return false;
    return Math.abs(v - extreme!) <= tolerance;
  });

  // Agrupar por jogador (se o mesmo jogador atingir a marca em múltiplas partidas, seleciona a mais recente)
  const statByPlayer = new Map<string, CompetitiveDataset["allStats"][number]>();
  for (const s of matchingStats) {
    if (!statByPlayer.has(s.playerId)) {
      statByPlayer.set(s.playerId, s);
    }
  }

  const holders: RecordHolderContext[] = [];
  for (const [playerId, s] of statByPlayer.entries()) {
    const p = activePlayers.find((ap) => ap.id === playerId) ?? {
      id: playerId,
      nickname: "Jogador",
      avatarUrl: null,
      levelGc: null,
    };
    holders.push(buildHolderContextFromStat(s, p, allUniverseStats));
  }

  // Ordenação determinística: nickname ASC, id ASC
  holders.sort((a, b) =>
    a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id)
  );

  return { holders, extremeValue: extreme, extremeStats: matchingStats };
}

function formatHoldersPlayerName(holders: RecordHolderContext[]): string {
  if (holders.length === 0) return "N/A";
  if (holders.length === 1) return holders[0].player.nickname;
  if (holders.length === 2) return `${holders[0].player.nickname} e ${holders[1].player.nickname}`;
  return `${holders[0].player.nickname}, ${holders[1].player.nickname} e +${holders.length - 2}`;
}

export function getHallOfFameRecordsFromDataset(
  dataset: CompetitiveDataset,
  statsOverride?: typeof dataset.allStats
): HallOfFameRecord[] {
  const statsToUse = statsOverride ?? dataset.allStats;
  const allUniverseStats = dataset.allStats;
  const activePlayers = dataset.activePlayers;
  const records: HallOfFameRecord[] = [];

  // 1. Recorde de Rating (Maior Rating em Jogo)
  const ratingRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.rating,
    "max"
  );
  if (ratingRes.holders.length > 0 && ratingRes.extremeValue !== null) {
    const primary = ratingRes.holders[0];
    const isShared = ratingRes.holders.length > 1;
    records.push({
      id: "elite-rating",
      category: "Recorde de Rating",
      title: "Maior Rating em Jogo",
      shortLabel: "Rating",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior pontuação de Rating 2.0 individual registrada em um único confronto.",
      playerName: formatHoldersPlayerName(ratingRes.holders),
      value: ratingRes.extremeValue.toFixed(2),
      detail: isShared
        ? `Recorde compartilhado por ${ratingRes.holders.length} jogadores`
        : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: ratingRes.holders.length,
      holders: ratingRes.holders,
      availability: "available",
    });
  }

  // 2. Maior K/D em Jogo
  const kdRes = findExtremeMatchHolders(
    statsToUse.filter((s) => s.deaths > 0 || s.kills > 0),
    activePlayers,
    allUniverseStats,
    (s) => (s.deaths > 0 ? s.kills / s.deaths : s.kills),
    "max",
    0.0001
  );
  if (kdRes.holders.length > 0 && kdRes.extremeValue !== null) {
    const primary = kdRes.holders[0];
    const isShared = kdRes.holders.length > 1;
    records.push({
      id: "elite-kd",
      category: "Maior K/D em Jogo",
      title: "Maior K/D em Jogo",
      shortLabel: "K/D",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Melhor proporção de eliminações por morte (K/D) registrada em um único confronto.",
      playerName: formatHoldersPlayerName(kdRes.holders),
      value: `${kdRes.extremeValue.toFixed(2)} K/D`,
      detail: isShared
        ? `Recorde compartilhado por ${kdRes.holders.length} jogadores`
        : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: kdRes.holders.length,
      holders: kdRes.holders,
      availability: "available",
    });
  }

  // 3. Maior ADR em Jogo
  const adrRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.adr,
    "max",
    0.05
  );
  if (adrRes.holders.length > 0 && adrRes.extremeValue !== null) {
    const primary = adrRes.holders[0];
    const isShared = adrRes.holders.length > 1;
    records.push({
      id: "elite-adr",
      category: "Maior ADR em Jogo",
      title: "Maior ADR em Jogo",
      shortLabel: "ADR",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior média de dano causado por round (Average Damage per Round) registrada em uma partida.",
      playerName: formatHoldersPlayerName(adrRes.holders),
      value: `${adrRes.extremeValue.toFixed(1)} ADR`,
      detail: isShared
        ? `Recorde compartilhado por ${adrRes.holders.length} jogadores`
        : `Dano médio por round na ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: adrRes.holders.length,
      holders: adrRes.holders,
      availability: "available",
    });
  }

  // 4. Recorde de Kills (Mais Kills em Jogo)
  const killsRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.kills,
    "max",
    0
  );
  if (killsRes.holders.length > 0 && killsRes.extremeValue !== null) {
    const primary = killsRes.holders[0];
    const isShared = killsRes.holders.length > 1;
    records.push({
      id: "elite-kills",
      category: "Recorde de Kills",
      title: "Mais Kills em Jogo",
      shortLabel: "Kills",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior número absoluto de eliminações registradas por um jogador em uma única partida.",
      playerName: formatHoldersPlayerName(killsRes.holders),
      value: `${killsRes.extremeValue} kills`,
      detail: isShared
        ? `Recorde compartilhado por ${killsRes.holders.length} jogadores`
        : `Partida no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: killsRes.holders.length,
      holders: killsRes.holders,
      availability: "available",
    });
  }

  // 5. Maior HS% em Jogo (mínimo de 10 kills para relevância de amostragem)
  let hsEligibleStats = statsToUse.filter((s) => s.kills >= 10);
  if (hsEligibleStats.length === 0) {
    hsEligibleStats = statsToUse.filter((s) => s.kills > 0);
  }
  const hsRes = findExtremeMatchHolders(
    hsEligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => (s.kills > 0 ? (s.headshots / s.kills) * 100 : 0),
    "max",
    0.05
  );
  if (hsRes.holders.length > 0 && hsRes.extremeValue !== null) {
    const primary = hsRes.holders[0];
    const isShared = hsRes.holders.length > 1;
    records.push({
      id: "elite-hs",
      category: "Maior HS% em Jogo",
      title: "Maior HS% em Jogo",
      shortLabel: "HS%",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior taxa de tiros na cabeça em eliminações (mínimo de 10 kills para relevância estatística).",
      playerName: formatHoldersPlayerName(hsRes.holders),
      value: `${hsRes.extremeValue.toFixed(0)}% HS`,
      detail: isShared
        ? `Recorde compartilhado por ${hsRes.holders.length} jogadores`
        : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: hsRes.holders.length,
      holders: hsRes.holders,
      availability: "available",
    });
  }

  // 6. Maior Sequência de Vitórias
  interface PlayerStreakCalc {
    player: PlayerRow;
    maxStreak: number;
    streakMatches: typeof statsToUse;
    startDate?: string;
    endDate?: string;
    formattedRange?: string;
    status: "active" | "ended";
    endedReason?: string;
  }
  const streakCalcs: PlayerStreakCalc[] = [];

  for (const player of activePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;

    // Ordem cronológica ascendente
    const chronological = [...playerStats].reverse();
    let currentStreak: typeof playerStats = [];
    let bestStreak: typeof playerStats = [];
    let bestStreakEndIndex = -1;

    for (let i = 0; i < chronological.length; i++) {
      const stat = chronological[i];
      if (isWin(stat)) {
        currentStreak.push(stat);
        if (currentStreak.length > bestStreak.length) {
          bestStreak = [...currentStreak];
          bestStreakEndIndex = i;
        }
      } else {
        currentStreak = [];
      }
    }

    if (bestStreak.length > 0) {
      const startMatch = bestStreak[0];
      const endMatch = bestStreak[bestStreak.length - 1];
      const isStillActive = bestStreakEndIndex === chronological.length - 1;
      let endedReason: string | undefined = undefined;
      if (!isStillActive && bestStreakEndIndex + 1 < chronological.length) {
        const nextMatch = chronological[bestStreakEndIndex + 1];
        const isTie = nextMatch.match.scoreTeamA === nextMatch.match.scoreTeamB;
        endedReason = isTie ? "Encerrada por empate" : "Encerrada por derrota";
      }

      streakCalcs.push({
        player,
        maxStreak: bestStreak.length,
        streakMatches: bestStreak,
        startDate: startMatch.match.playedAt ? new Date(startMatch.match.playedAt).toISOString() : undefined,
        endDate: endMatch.match.playedAt ? new Date(endMatch.match.playedAt).toISOString() : undefined,
        formattedRange: formatDateRangeSP(startMatch.match.playedAt, endMatch.match.playedAt),
        status: isStillActive ? "active" : "ended",
        endedReason,
      });
    }
  }

  const maxStreakVal = streakCalcs.length > 0 ? Math.max(...streakCalcs.map((c) => c.maxStreak)) : 0;
  if (maxStreakVal > 0) {
    const tiedStreaks = streakCalcs
      .filter((c) => c.maxStreak === maxStreakVal)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const streakHolders: RecordHolderContext[] = tiedStreaks.map((c) => {
      const lastStat = c.streakMatches[c.streakMatches.length - 1];
      const baseHolder = buildHolderContextFromStat(lastStat, c.player, allUniverseStats);
      return {
        ...baseHolder,
        individualStreak: {
          count: c.maxStreak,
          startDate: c.startDate,
          endDate: c.endDate,
          formattedRange: c.formattedRange,
          status: c.status,
          endedReason: c.endedReason,
        },
      };
    });

    const isShared = streakHolders.length > 1;
    const primary = streakHolders[0];
    records.push({
      id: "elite-win-streak",
      category: "Maior Sequência de Vitórias",
      title: "Maior Sequência de Vitórias",
      shortLabel: "Sequência",
      scope: "streak",
      scopeLabel: "Sequência",
      explanation: "Maior número consecutivo de vitórias nesta temporada. Derrota ou empate encerram a contagem.",
      playerName: formatHoldersPlayerName(streakHolders),
      value: `${maxStreakVal} vitórias`,
      detail: isShared
        ? `Recorde compartilhado por ${streakHolders.length} jogadores`
        : primary.individualStreak?.formattedRange
        ? `Período: ${primary.individualStreak.formattedRange}`
        : "Sequência invicta da temporada",
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: streakHolders.length,
      holders: streakHolders,
      sequenceContext: {
        count: maxStreakVal,
        startDate: primary.individualStreak?.startDate,
        endDate: primary.individualStreak?.endDate,
        formattedRange: primary.individualStreak?.formattedRange,
        status: primary.individualStreak?.status ?? "ended",
        endedReason: primary.individualStreak?.endedReason,
      },
      availability: "available",
    });
  }

  // 7. Maior ELO GC registrado (antes "Pico de Rating do Hub")
  const eloRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.eloAfter ?? null,
    "max",
    0
  );
  if (eloRes.holders.length > 0 && eloRes.extremeValue !== null) {
    const primary = eloRes.holders[0];
    const isShared = eloRes.holders.length > 1;
    records.push({
      id: "elite-elo",
      category: "Pico de Rating do Hub",
      title: "Maior ELO GC registrado",
      shortLabel: "ELO GC",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior pontuação de ELO Gamers Club registrada após uma partida durante o período da temporada.",
      playerName: formatHoldersPlayerName(eloRes.holders),
      value: `${eloRes.extremeValue} pts GC`,
      detail: isShared
        ? `Recorde compartilhado por ${eloRes.holders.length} jogadores`
        : `Registrado após confronto na ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: eloRes.holders.length,
      holders: eloRes.holders,
      availability: "available",
    });
  }

  // 8. Maior índice combinado de Rating e ADR (antes "Maior Impacto em Jogo")
  const impactRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.rating * 100 + s.adr,
    "max",
    0.01
  );
  if (impactRes.holders.length > 0 && impactRes.extremeStats.length > 0) {
    const primaryStat = impactRes.extremeStats[0];
    const primary = impactRes.holders[0];
    const isShared = impactRes.holders.length > 1;
    records.push({
      id: "elite-combined-impact",
      category: "Maior Impacto em Jogo",
      title: "Maior índice combinado de Rating e ADR",
      shortLabel: "Impacto",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Índice combinado calculado por (Rating × 100) + ADR em uma única partida. Mede o impacto simultâneo extremo de pontuação e dano.",
      playerName: formatHoldersPlayerName(impactRes.holders),
      value: `${primaryStat.rating.toFixed(2)} Rating / ${primaryStat.adr.toFixed(1)} ADR`,
      detail: isShared
        ? `Recorde compartilhado por ${impactRes.holders.length} jogadores`
        : `Performance dominante no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: impactRes.holders.length,
      holders: impactRes.holders,
      availability: "available",
    });
  }

  // 9. Mais MultiKills na Temporada
  interface PlayerMultiKillCalc {
    player: PlayerRow;
    total: number;
    matchesPlayed: number;
    averagePerMatch: number;
    breakdown: string;
    latestStat: (typeof statsToUse)[number] | null;
  }
  const multiKillCalcs: PlayerMultiKillCalc[] = [];

  for (const player of activePlayers) {
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
    if (total > 0) {
      const breakdown = `${doubleSum}x 2K, ${tripleSum}x 3K, ${quadSum}x 4K` + (aceSum > 0 ? `, ${aceSum}x Ace` : "");
      multiKillCalcs.push({
        player,
        total,
        matchesPlayed: playerStats.length,
        averagePerMatch: playerStats.length > 0 ? total / playerStats.length : 0,
        breakdown,
        latestStat: playerStats[0] ?? null,
      });
    }
  }

  const maxMultiVal = multiKillCalcs.length > 0 ? Math.max(...multiKillCalcs.map((c) => c.total)) : 0;
  if (maxMultiVal > 0) {
    const tiedMultis = multiKillCalcs
      .filter((c) => c.total === maxMultiVal)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const multiHolders: RecordHolderContext[] = tiedMultis.map((c) => {
      const baseHolder = c.latestStat
        ? buildHolderContextFromStat(c.latestStat, c.player, allUniverseStats)
        : {
            player: { id: c.player.id, nickname: c.player.nickname, avatarUrl: c.player.avatarUrl },
          };
      return {
        ...baseHolder,
        individualCumulative: {
          total: c.total,
          matchesPlayed: c.matchesPlayed,
          averagePerMatch: c.averagePerMatch,
          breakdown: c.breakdown,
        },
      };
    });

    const isShared = multiHolders.length > 1;
    const primary = multiHolders[0];
    records.push({
      id: "elite-multikills",
      category: "Mais MultiKills na Temporada",
      title: "Mais MultiKills na Temporada",
      shortLabel: "MultiKills",
      scope: "season_cumulative",
      scopeLabel: "Acumulado da temporada",
      explanation: "Soma total de rodadas com multikills (2K, 3K, 4K e Aces) acumuladas em partidas elegíveis da temporada.",
      playerName: formatHoldersPlayerName(multiHolders),
      value: `${maxMultiVal} multikills`,
      detail: isShared
        ? `Recorde compartilhado por ${multiHolders.length} jogadores`
        : `${primary.individualCumulative?.breakdown} (${primary.individualCumulative?.averagePerMatch.toFixed(1)} por partida)`,
      isShared,
      sharedCount: multiHolders.length,
      holders: multiHolders,
      cumulativeContext: {
        total: maxMultiVal,
        matchesPlayed: primary.individualCumulative?.matchesPlayed ?? 0,
        averagePerMatch: primary.individualCumulative?.averagePerMatch ?? 0,
        breakdown: primary.individualCumulative?.breakdown,
      },
      availability: "available",
    });
  }

  // 10. Maior Dano em Jogo
  const damageRes = findExtremeMatchHolders(
    statsToUse.filter((s) => s.damage !== null && s.damage !== undefined),
    activePlayers,
    allUniverseStats,
    (s) => s.damage ?? null,
    "max",
    0
  );
  if (damageRes.holders.length > 0 && damageRes.extremeValue !== null) {
    const primary = damageRes.holders[0];
    const isShared = damageRes.holders.length > 1;
    records.push({
      id: "elite-damage",
      category: "Maior Dano em Jogo",
      title: "Maior Dano em Jogo",
      shortLabel: "Dano",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Volume absoluto de dano causado por um jogador ao longo de uma única partida.",
      playerName: formatHoldersPlayerName(damageRes.holders),
      value: `${damageRes.extremeValue} DMG`,
      detail: isShared
        ? `Recorde compartilhado por ${damageRes.holders.length} jogadores`
        : `Dano bruto na ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: damageRes.holders.length,
      holders: damageRes.holders,
      availability: "available",
    });
  }

  // 11. Mais Clutches na Temporada (Maior Clutch na Temporada)
  interface PlayerClutchCalc {
    player: PlayerRow;
    total: number;
    matchesPlayed: number;
    averagePerMatch: number;
    breakdown: string;
    latestStat: (typeof statsToUse)[number] | null;
  }
  const clutchCalcs: PlayerClutchCalc[] = [];

  for (const player of activePlayers) {
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
    if (totalClutches > 0) {
      const breakdown = `${c1v1}x 1v1, ${c1v2}x 1v2, ${c1v3}x 1v3` + (c1v4 + c1v5 > 0 ? `, ${c1v4 + c1v5}x 1v4+` : "");
      clutchCalcs.push({
        player,
        total: totalClutches,
        matchesPlayed: playerStats.length,
        averagePerMatch: playerStats.length > 0 ? totalClutches / playerStats.length : 0,
        breakdown,
        latestStat: playerStats[0] ?? null,
      });
    }
  }

  const maxClutchVal = clutchCalcs.length > 0 ? Math.max(...clutchCalcs.map((c) => c.total)) : 0;
  if (maxClutchVal > 0) {
    const tiedClutches = clutchCalcs
      .filter((c) => c.total === maxClutchVal)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const clutchHolders: RecordHolderContext[] = tiedClutches.map((c) => {
      const baseHolder = c.latestStat
        ? buildHolderContextFromStat(c.latestStat, c.player, allUniverseStats)
        : {
            player: { id: c.player.id, nickname: c.player.nickname, avatarUrl: c.player.avatarUrl },
          };
      return {
        ...baseHolder,
        individualCumulative: {
          total: c.total,
          matchesPlayed: c.matchesPlayed,
          averagePerMatch: c.averagePerMatch,
          breakdown: c.breakdown,
        },
      };
    });

    const isShared = clutchHolders.length > 1;
    const primary = clutchHolders[0];
    records.push({
      id: "elite-clutch",
      category: "Maior Clutch na Temporada",
      title: "Mais Clutches na Temporada",
      shortLabel: "Clutches",
      scope: "season_cumulative",
      scopeLabel: "Acumulado da temporada",
      explanation: "Maior quantidade de situações 1vX vencidas sob pressão durante a temporada.",
      playerName: formatHoldersPlayerName(clutchHolders),
      value: `${maxClutchVal} clutches`,
      detail: isShared
        ? `Recorde compartilhado por ${clutchHolders.length} jogadores`
        : primary.individualCumulative?.breakdown ?? "Decisivo nos momentos críticos",
      isShared,
      sharedCount: clutchHolders.length,
      holders: clutchHolders,
      cumulativeContext: {
        total: maxClutchVal,
        matchesPlayed: primary.individualCumulative?.matchesPlayed ?? 0,
        averagePerMatch: primary.individualCumulative?.averagePerMatch ?? 0,
        breakdown: primary.individualCumulative?.breakdown,
      },
      availability: "available",
    });
  } else {
    // Telemetria de clutches ausente ou sem registros na temporada
    records.push({
      id: "elite-clutch",
      category: "Maior Clutch na Temporada",
      title: "Mais Clutches na Temporada",
      shortLabel: "Clutches",
      scope: "season_cumulative",
      scopeLabel: "Acumulado da temporada",
      explanation: "Maior quantidade de situações 1vX vencidas sob pressão durante a temporada.",
      playerName: "N/A",
      value: "Indisponível",
      detail: "Sem registros de clutches na telemetria deste período",
      availability: "unavailable",
      unavailableReason: "Dados de clutches indisponíveis na telemetria deste período",
      holders: [],
    });
  }

  // 12. Maior Consistência na Temporada
  let minMatches = 3;
  let candidatePlayers = activePlayers.filter((p) => {
    const stats = dataset.statsByPlayer.get(p.id) ?? [];
    const statsToCount = statsOverride
      ? stats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : stats;
    return statsToCount.length >= minMatches;
  });

  if (candidatePlayers.length === 0) {
    minMatches = 1;
    candidatePlayers = activePlayers.filter((p) => {
      const stats = dataset.statsByPlayer.get(p.id) ?? [];
      const statsToCount = statsOverride
        ? stats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
        : stats;
      return statsToCount.length >= minMatches;
    });
  }

  interface PlayerConsistencyCalc {
    player: PlayerRow;
    score: number;
    avgRating: number;
    aboveBaselineCount: number;
    totalMatches: number;
    aboveBaselinePct: number;
    latestStat: (typeof statsToUse)[number] | null;
  }
  const consistencyCalcs: PlayerConsistencyCalc[] = [];

  for (const player of candidatePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;

    const totalMatches = playerStats.length;
    if (totalMatches === 0) continue;

    const totalRating = playerStats.reduce((sum, s) => sum + s.rating, 0);
    const avgRating = totalRating / totalMatches;
    const aboveBaselineCount = playerStats.filter((s) => s.rating >= 1.0).length;
    const aboveBaselinePct = aboveBaselineCount / totalMatches;

    const score = avgRating * (1 + aboveBaselinePct);
    consistencyCalcs.push({
      player,
      score,
      avgRating,
      aboveBaselineCount,
      totalMatches,
      aboveBaselinePct,
      latestStat: playerStats[0] ?? null,
    });
  }

  const maxConsScore = consistencyCalcs.length > 0 ? Math.max(...consistencyCalcs.map((c) => c.score)) : 0;
  if (maxConsScore > 0) {
    const tiedCons = consistencyCalcs
      .filter((c) => Math.abs(c.score - maxConsScore) <= 0.001)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const consHolders: RecordHolderContext[] = tiedCons.map((c) => {
      const baseHolder = c.latestStat
        ? buildHolderContextFromStat(c.latestStat, c.player, allUniverseStats)
        : {
            player: { id: c.player.id, nickname: c.player.nickname, avatarUrl: c.player.avatarUrl },
          };
      return {
        ...baseHolder,
        individualCumulative: {
          total: c.aboveBaselineCount,
          matchesPlayed: c.totalMatches,
          averagePerMatch: c.avgRating,
          breakdown: `${c.aboveBaselineCount} de ${c.totalMatches} partidas com rating ≥ 1.0`,
        },
      };
    });

    const isShared = consHolders.length > 1;
    const primaryCalc = tiedCons[0];
    records.push({
      id: "elite-consistency",
      category: "Maior Consistência na Temporada",
      title: "Maior Consistência na Temporada",
      shortLabel: "Consistência",
      scope: "season_cumulative",
      scopeLabel: "Acumulado da temporada",
      explanation: `Índice de consistência = Rating Médio × (1 + % de partidas com Rating ≥ 1.00). Amostra mínima de ${minMatches} partidas.`,
      playerName: formatHoldersPlayerName(consHolders),
      value: `${primaryCalc.avgRating.toFixed(2)} Rating`,
      detail: isShared
        ? `Recorde compartilhado por ${consHolders.length} jogadores`
        : `${primaryCalc.aboveBaselineCount} de ${primaryCalc.totalMatches} partidas (${Math.round(primaryCalc.aboveBaselinePct * 100)}%) com rating ≥ 1.0`,
      isShared,
      sharedCount: consHolders.length,
      holders: consHolders,
      cumulativeContext: {
        total: primaryCalc.aboveBaselineCount,
        matchesPlayed: primaryCalc.totalMatches,
        averagePerMatch: primaryCalc.avgRating,
        breakdown: `${primaryCalc.aboveBaselineCount} de ${primaryCalc.totalMatches} partidas com rating ≥ 1.0`,
      },
      availability: "available",
    });
  }

  return records;
}

export function getWorstRecordsFromDataset(
  dataset: CompetitiveDataset,
  statsOverride?: typeof dataset.allStats
): HallOfFameRecord[] {
  const statsToUse = statsOverride ?? dataset.allStats;
  const allUniverseStats = dataset.allStats;
  const activePlayers = dataset.activePlayers;
  const records: HallOfFameRecord[] = [];

  // Critério de elegibilidade para marcas negativas:
  // Participação substancial no jogo (evita substitutos imediatos ou desistências com 0-2 mortes)
  const isEligibleWorst = (s: CompetitiveDataset["allStats"][number]) =>
    s.deaths >= 10 || (s.kills >= 3 && s.deaths >= 8);

  const eligibleStats = statsToUse.filter(isEligibleWorst);

  // 1. Pior Rating em Jogo (Menor Rating em Jogo)
  const ratingRes = findExtremeMatchHolders(
    eligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => s.rating,
    "min"
  );
  if (ratingRes.holders.length > 0 && ratingRes.extremeValue !== null) {
    const primary = ratingRes.holders[0];
    const isShared = ratingRes.holders.length > 1;
    records.push({
      id: "worst-rating",
      category: "Pior Rating em Jogo",
      title: "Menor Rating em Jogo",
      shortLabel: "Rating",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Menor pontuação individual de Rating registrada em uma partida com participação substancial.",
      playerName: formatHoldersPlayerName(ratingRes.holders),
      value: ratingRes.extremeValue.toFixed(2),
      detail: isShared
        ? `Marca compartilhada por ${ratingRes.holders.length} jogadores`
        : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: ratingRes.holders.length,
      holders: ratingRes.holders,
      availability: "available",
    });
  }

  // 2. Pior K/D em Jogo (Menor K/D em Jogo)
  const kdRes = findExtremeMatchHolders(
    eligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => (s.deaths > 0 ? s.kills / s.deaths : s.kills),
    "min",
    0.0001
  );
  if (kdRes.holders.length > 0 && kdRes.extremeValue !== null) {
    const primary = kdRes.holders[0];
    const isShared = kdRes.holders.length > 1;
    records.push({
      id: "worst-kd",
      category: "Pior K/D em Jogo",
      title: "Menor K/D em Jogo",
      shortLabel: "K/D",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Pior relação entre eliminações e mortes em um confronto com participação substancial.",
      playerName: formatHoldersPlayerName(kdRes.holders),
      value: `${kdRes.extremeValue.toFixed(2)} K/D`,
      detail: isShared
        ? `Marca compartilhada por ${kdRes.holders.length} jogadores`
        : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: kdRes.holders.length,
      holders: kdRes.holders,
      availability: "available",
    });
  }

  // 3. Menor ADR em Jogo
  const adrRes = findExtremeMatchHolders(
    eligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => s.adr,
    "min",
    0.05
  );
  if (adrRes.holders.length > 0 && adrRes.extremeValue !== null) {
    const primary = adrRes.holders[0];
    const isShared = adrRes.holders.length > 1;
    records.push({
      id: "worst-adr",
      category: "Menor ADR em Jogo",
      title: "Menor ADR em Jogo",
      shortLabel: "ADR",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Menor média de dano por round registrada em um confronto com participação substancial.",
      playerName: formatHoldersPlayerName(adrRes.holders),
      value: `${adrRes.extremeValue.toFixed(1)} ADR`,
      detail: isShared
        ? `Marca compartilhada por ${adrRes.holders.length} jogadores`
        : `Dano médio por round na ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: adrRes.holders.length,
      holders: adrRes.holders,
      availability: "available",
    });
  }

  // 4. Mais Mortes em Jogo
  const deathsRes = findExtremeMatchHolders(
    eligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => s.deaths,
    "max",
    0
  );
  if (deathsRes.holders.length > 0 && deathsRes.extremeValue !== null) {
    const primary = deathsRes.holders[0];
    const isShared = deathsRes.holders.length > 1;
    records.push({
      id: "worst-deaths",
      category: "Mais Mortes em Jogo",
      title: "Mais Mortes em Jogo",
      shortLabel: "Mortes",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Maior quantidade de mortes sofridas em uma única partida (incluindo prorrogações).",
      playerName: formatHoldersPlayerName(deathsRes.holders),
      value: `${deathsRes.extremeValue} mortes`,
      detail: isShared
        ? `Marca compartilhada por ${deathsRes.holders.length} jogadores`
        : `Partida no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: deathsRes.holders.length,
      holders: deathsRes.holders,
      availability: "available",
    });
  }

  // 5. Menor HS% em Jogo (mínimo de 10 kills para haver relevância estatística)
  const hsEligible = eligibleStats.filter((s) => s.kills >= 10);
  if (hsEligible.length > 0) {
    const hsRes = findExtremeMatchHolders(
      hsEligible,
      activePlayers,
      allUniverseStats,
      (s) => (s.kills > 0 ? (s.headshots / s.kills) * 100 : 0),
      "min",
      0.05
    );
    if (hsRes.holders.length > 0 && hsRes.extremeValue !== null) {
      const primary = hsRes.holders[0];
      const isShared = hsRes.holders.length > 1;
      records.push({
        id: "worst-hs",
        category: "Menor HS% em Jogo",
        title: "Menor HS% em Jogo",
        shortLabel: "HS%",
        scope: "match",
        scopeLabel: "Em uma partida",
        explanation: "Menor porcentagem de eliminações por tiro na cabeça (mínimo de 10 kills para significância).",
        playerName: formatHoldersPlayerName(hsRes.holders),
        value: `${hsRes.extremeValue.toFixed(0)}% HS`,
        detail: isShared
          ? `Marca compartilhada por ${hsRes.holders.length} jogadores`
          : `Registrado no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
        matchId: primary.matchId,
        mapName: primary.mapName,
        isShared,
        sharedCount: hsRes.holders.length,
        holders: hsRes.holders,
        availability: "available",
      });
    }
  }

  // 6. Maior Sequência de Derrotas
  interface PlayerLossStreakCalc {
    player: PlayerRow;
    maxStreak: number;
    streakMatches: typeof statsToUse;
    startDate?: string;
    endDate?: string;
    formattedRange?: string;
    status: "active" | "ended";
    endedReason?: string;
  }
  const lossStreakCalcs: PlayerLossStreakCalc[] = [];

  for (const player of activePlayers) {
    const rawPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    const playerStats = statsOverride
      ? rawPlayerStats.filter((s) => statsOverride.some((so) => so.matchId === s.matchId))
      : rawPlayerStats;

    const chronological = [...playerStats].reverse();
    let currentStreak: typeof playerStats = [];
    let bestStreak: typeof playerStats = [];
    let bestStreakEndIndex = -1;

    for (let i = 0; i < chronological.length; i++) {
      const stat = chronological[i];
      if (!isWin(stat)) {
        currentStreak.push(stat);
        if (currentStreak.length > bestStreak.length) {
          bestStreak = [...currentStreak];
          bestStreakEndIndex = i;
        }
      } else {
        currentStreak = [];
      }
    }

    if (bestStreak.length > 0) {
      const startMatch = bestStreak[0];
      const endMatch = bestStreak[bestStreak.length - 1];
      const isStillActive = bestStreakEndIndex === chronological.length - 1;

      lossStreakCalcs.push({
        player,
        maxStreak: bestStreak.length,
        streakMatches: bestStreak,
        startDate: startMatch.match.playedAt ? new Date(startMatch.match.playedAt).toISOString() : undefined,
        endDate: endMatch.match.playedAt ? new Date(endMatch.match.playedAt).toISOString() : undefined,
        formattedRange: formatDateRangeSP(startMatch.match.playedAt, endMatch.match.playedAt),
        status: isStillActive ? "active" : "ended",
        endedReason: isStillActive ? undefined : "Encerrada por vitória",
      });
    }
  }

  const maxLossStreakVal = lossStreakCalcs.length > 0 ? Math.max(...lossStreakCalcs.map((c) => c.maxStreak)) : 0;
  if (maxLossStreakVal > 0) {
    const tiedLossStreaks = lossStreakCalcs
      .filter((c) => c.maxStreak === maxLossStreakVal)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const lossHolders: RecordHolderContext[] = tiedLossStreaks.map((c) => {
      const lastStat = c.streakMatches[c.streakMatches.length - 1];
      const baseHolder = buildHolderContextFromStat(lastStat, c.player, allUniverseStats);
      return {
        ...baseHolder,
        individualStreak: {
          count: c.maxStreak,
          startDate: c.startDate,
          endDate: c.endDate,
          formattedRange: c.formattedRange,
          status: c.status,
          endedReason: c.endedReason,
        },
      };
    });

    const isShared = lossHolders.length > 1;
    const primary = lossHolders[0];
    records.push({
      id: "worst-loss-streak",
      category: "Maior Sequência de Derrotas",
      title: "Maior Sequência de Derrotas",
      shortLabel: "Derrotas",
      scope: "streak",
      scopeLabel: "Sequência",
      explanation: "Maior sequência consecutiva de partidas sem vitória (derrotas e empates) na temporada.",
      playerName: formatHoldersPlayerName(lossHolders),
      value: `${maxLossStreakVal} derrotas`,
      detail: isShared
        ? `Marca compartilhada por ${lossHolders.length} jogadores`
        : primary.individualStreak?.formattedRange
        ? `Período: ${primary.individualStreak.formattedRange}`
        : "Sequência de resultados negativos na temporada",
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: lossHolders.length,
      holders: lossHolders,
      sequenceContext: {
        count: maxLossStreakVal,
        startDate: primary.individualStreak?.startDate,
        endDate: primary.individualStreak?.endDate,
        formattedRange: primary.individualStreak?.formattedRange,
        status: primary.individualStreak?.status ?? "ended",
        endedReason: primary.individualStreak?.endedReason,
      },
      availability: "available",
    });
  }

  // 7. Menor ELO GC registrado (antes "Pior Momento no Ranking")
  const eloRes = findExtremeMatchHolders(
    statsToUse,
    activePlayers,
    allUniverseStats,
    (s) => s.eloAfter ?? null,
    "min",
    0
  );
  if (eloRes.holders.length > 0 && eloRes.extremeValue !== null) {
    const primary = eloRes.holders[0];
    const isShared = eloRes.holders.length > 1;
    records.push({
      id: "worst-elo",
      category: "Pior Momento no Ranking",
      title: "Menor ELO GC registrado",
      shortLabel: "ELO GC",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Menor pontuação de ELO Gamers Club registrada após uma partida durante o período da temporada.",
      playerName: formatHoldersPlayerName(eloRes.holders),
      value: `${eloRes.extremeValue} pts GC`,
      detail: isShared
        ? `Marca compartilhada por ${eloRes.holders.length} jogadores`
        : `Menor pontuação registrada na ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: eloRes.holders.length,
      holders: eloRes.holders,
      availability: "available",
    });
  }

  // 8. Menor índice combinado de Rating e ADR (antes "Partida Fantasma")
  const ghostRes = findExtremeMatchHolders(
    eligibleStats,
    activePlayers,
    allUniverseStats,
    (s) => s.rating * 100 + s.adr,
    "min",
    0.01
  );
  if (ghostRes.holders.length > 0 && ghostRes.extremeStats.length > 0) {
    const primaryStat = ghostRes.extremeStats[0];
    const primary = ghostRes.holders[0];
    const isShared = ghostRes.holders.length > 1;
    records.push({
      id: "worst-ghost",
      category: "Partida Fantasma",
      title: "Menor índice combinado de Rating e ADR",
      shortLabel: "Fantasma",
      scope: "match",
      scopeLabel: "Em uma partida",
      explanation: "Menor índice combinado calculado por (Rating × 100) + ADR em uma partida com participação substancial.",
      playerName: formatHoldersPlayerName(ghostRes.holders),
      value: `${primaryStat.rating.toFixed(2)} Rating / ${primaryStat.adr.toFixed(1)} ADR`,
      detail: isShared
        ? `Marca compartilhada por ${ghostRes.holders.length} jogadores`
        : `Performance apagada no mapa ${primary.cleanMapName ?? primary.mapName} (${primary.scoreFormatted})`,
      matchId: primary.matchId,
      mapName: primary.mapName,
      isShared,
      sharedCount: ghostRes.holders.length,
      holders: ghostRes.holders,
      availability: "available",
    });
  }

  // 9. Maior Inconsistência na Temporada
  const candidatePlayers = activePlayers.filter((p) => {
    const stats = dataset.statsByPlayer.get(p.id) ?? [];
    return stats.length >= 3;
  });

  interface PlayerInconsistencyCalc {
    player: PlayerRow;
    score: number;
    avgRating: number;
    belowCount: number;
    totalMatches: number;
    latestStat: (typeof statsToUse)[number] | null;
  }
  const inconsistencyCalcs: PlayerInconsistencyCalc[] = [];

  for (const player of candidatePlayers) {
    const playerStats = dataset.statsByPlayer.get(player.id) ?? [];
    if (playerStats.length === 0) continue;

    const avgRating = playerStats.reduce((sum, s) => sum + s.rating, 0) / playerStats.length;
    const aboveBaselineCount = playerStats.filter((s) => s.rating >= 1.0).length;
    const aboveBaselinePct = aboveBaselineCount / playerStats.length;
    const belowCount = playerStats.length - aboveBaselineCount;
    const score = avgRating * (1 + aboveBaselinePct);

    inconsistencyCalcs.push({
      player,
      score,
      avgRating,
      belowCount,
      totalMatches: playerStats.length,
      latestStat: playerStats[0] ?? null,
    });
  }

  const minConsScore = inconsistencyCalcs.length > 0 ? Math.min(...inconsistencyCalcs.map((c) => c.score)) : Infinity;
  if (minConsScore < Infinity) {
    const tiedIncons = inconsistencyCalcs
      .filter((c) => Math.abs(c.score - minConsScore) <= 0.001)
      .sort((a, b) => a.player.nickname.localeCompare(b.player.nickname) || a.player.id.localeCompare(b.player.id));

    const inconsHolders: RecordHolderContext[] = tiedIncons.map((c) => {
      const baseHolder = c.latestStat
        ? buildHolderContextFromStat(c.latestStat, c.player, allUniverseStats)
        : {
            player: { id: c.player.id, nickname: c.player.nickname, avatarUrl: c.player.avatarUrl },
          };
      return {
        ...baseHolder,
        individualCumulative: {
          total: c.belowCount,
          matchesPlayed: c.totalMatches,
          averagePerMatch: c.avgRating,
          breakdown: `${c.belowCount} de ${c.totalMatches} partidas com rating < 1.0`,
        },
      };
    });

    const isShared = inconsHolders.length > 1;
    const primaryCalc = tiedIncons[0];
    records.push({
      id: "worst-inconsistency",
      category: "Maior Inconsistência na Temporada",
      title: "Maior Inconsistência na Temporada",
      shortLabel: "Inconsistência",
      scope: "season_cumulative",
      scopeLabel: "Acumulado da temporada",
      explanation: "Menor índice de consistência entre jogadores com ao menos 3 partidas: Rating Médio × (1 + % partidas com Rating ≥ 1.00).",
      playerName: formatHoldersPlayerName(inconsHolders),
      value: `${primaryCalc.avgRating.toFixed(2)} Rating`,
      detail: isShared
        ? `Marca compartilhada por ${inconsHolders.length} jogadores`
        : `${primaryCalc.belowCount} de ${primaryCalc.totalMatches} partidas (${Math.round((primaryCalc.belowCount / primaryCalc.totalMatches) * 100)}%) com rating < 1.0`,
      isShared,
      sharedCount: inconsHolders.length,
      holders: inconsHolders,
      cumulativeContext: {
        total: primaryCalc.belowCount,
        matchesPlayed: primaryCalc.totalMatches,
        averagePerMatch: primaryCalc.avgRating,
        breakdown: `${primaryCalc.belowCount} de ${primaryCalc.totalMatches} partidas com rating < 1.0`,
      },
      availability: "available",
    });
  }

  return records;
}

export function getPerformanceExtremesFromDataset(dataset: CompetitiveDataset): {
  best: PerformanceExtreme | null;
  worst: PerformanceExtreme | null;
} {
  const MIN_TOTAL_ROUNDS = 20; // partida precisa ter duração mínima competitiva (exclui desistências precoces)
  const MIN_PLAYER_MATCHES = 5; // jogador precisa ter presença mínima na temporada (exclui "1 partida isolada")

  let bestStat: (typeof dataset.allStats)[number] | null = null;
  let worstStat: (typeof dataset.allStats)[number] | null = null;

  for (const s of dataset.allStats) {
    const totalRounds = s.match.scoreTeamA + s.match.scoreTeamB;
    if (totalRounds < MIN_TOTAL_ROUNDS) continue;

    const playerMatchCount = dataset.statsByPlayer.get(s.playerId)?.length ?? 0;
    if (playerMatchCount < MIN_PLAYER_MATCHES) continue;

    // Melhor atuação: requer volume mínimo de abates (pelo menos 5 kills)
    if (s.kills >= 5) {
      if (!bestStat || s.rating > bestStat.rating) bestStat = s;
    }

    // Pior atuação: jogador precisa ter jogado a partida substancialmente (mínimo de 10 mortes
    // ou pelo menos 3 kills com >= 8 mortes), excluindo substituições com 0-2 mortes e desconexões.
    const isSubstantialParticipation = s.deaths >= 10 || (s.kills >= 3 && s.deaths >= 8);
    if (isSubstantialParticipation) {
      if (!worstStat || s.rating < worstStat.rating) worstStat = s;
    }
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
  cleanMapName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winrate: number;
  rawWinrate?: number;
  directMatchesExcluded: number;
}

const MIN_MATCHES_FOR_MAP_HIGHLIGHT = 3;

/**
 * Cálculo de aproveitamento coletivo por mapa sobre partidas únicas elegíveis.
 * Partidas com jogadores monitorados em lados opostos são excluídas do cálculo
 * coletivo para não distorcer a vitória/derrota do grupo. Empates contam no total
 * de partidas disputadas, sem pontuar como vitória.
 */
export function getMapPerformanceFromDataset(dataset: CompetitiveDataset): {
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
} {
  const matchMap = new Map<string, {
    mapId: string;
    mapName: string;
    scoreTeamA: number;
    scoreTeamB: number;
    teams: Set<string>;
  }>();

  for (const s of dataset.allStats) {
    let m = matchMap.get(s.match.id);
    if (!m) {
      m = {
        mapId: s.match.mapId,
        mapName: s.match.map.name,
        scoreTeamA: s.match.scoreTeamA,
        scoreTeamB: s.match.scoreTeamB,
        teams: new Set<string>(),
      };
      matchMap.set(s.match.id, m);
    }
    m.teams.add(s.team);
  }

  const byMap = new Map<string, {
    mapName: string;
    wins: number;
    losses: number;
    ties: number;
    eligibleMatches: number;
    directMatchesExcluded: number;
  }>();

  for (const m of matchMap.values()) {
    const key = m.mapName;
    const entry = byMap.get(key) ?? {
      mapName: m.mapName,
      wins: 0,
      losses: 0,
      ties: 0,
      eligibleMatches: 0,
      directMatchesExcluded: 0,
    };

    if (m.teams.size > 1) {
      // Confronto direto entre monitorados em lados opostos: excluir do cálculo coletivo
      entry.directMatchesExcluded += 1;
    } else {
      const [monitoredTeam] = Array.from(m.teams);
      entry.eligibleMatches += 1;
      if (m.scoreTeamA === m.scoreTeamB) {
        entry.ties += 1;
      } else if (
        (monitoredTeam === "A" && m.scoreTeamA > m.scoreTeamB) ||
        (monitoredTeam === "B" && m.scoreTeamB > m.scoreTeamA)
      ) {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }
    }
    byMap.set(key, entry);
  }

  const mapWinrates: MapPerformanceEntry[] = Array.from(byMap.values()).map((entry) => ({
    map: entry.mapName,
    cleanMapName: cleanMapName(entry.mapName),
    matchesPlayed: entry.eligibleMatches,
    wins: entry.wins,
    losses: entry.losses,
    ties: entry.ties,
    winrate: entry.eligibleMatches > 0 ? Math.round((entry.wins / entry.eligibleMatches) * 1000) / 10 : 0,
    rawWinrate: entry.eligibleMatches > 0 ? (entry.wins / entry.eligibleMatches) * 100 : 0,
    directMatchesExcluded: entry.directMatchesExcluded,
  })).sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.winrate - a.winrate);

  const eligibleForHighlights = mapWinrates.filter((m) => m.matchesPlayed >= MIN_MATCHES_FOR_MAP_HIGHLIGHT);

  // bestMap: >= 3 partidas elegíveis E winrate >= 50% (não atribuir DOMÍNIO com WR < 50%)
  const bestMapEligible = eligibleForHighlights.filter((m) => m.winrate >= 50);
  const bestMap = [...bestMapEligible].sort((a, b) => b.winrate - a.winrate || b.matchesPlayed - a.matchesPlayed)[0] ?? null;

  // worstMap: >= 3 partidas elegíveis, diferente do bestMap se houver mais de 1 elegível
  const worstCandidates = eligibleForHighlights.filter((m) => m.map !== bestMap?.map);
  const worstMap = [...(worstCandidates.length > 0 ? worstCandidates : eligibleForHighlights)].sort(
    (a, b) => a.winrate - b.winrate || a.matchesPlayed - b.matchesPlayed
  )[0] ?? null;

  return { mapWinrates, bestMap, worstMap };
}

// ---------------------------------------------------------------------------
// Bundle único consumido pela Dashboard — 2 queries no total (dentro de
// loadCompetitiveDataset), todo o resto é cálculo em memória sobre o mesmo dataset.
// ---------------------------------------------------------------------------

export interface MonitoredPlayerEntry {
  rank: number;
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null; steamAvatarFull?: string | null };
  rating: number;
  adr: number;
  kd: number;
  kast: number;
  winrate: number;
  hsPercent: number;
  matchCount: number;
  seasonMatchCount?: number;
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
    const allPlayerStats = dataset.statsByPlayer.get(player.id) ?? [];
    if (allPlayerStats.length === 0) continue;

    const seasonMatchCount = allPlayerStats.length;
    // stats already sorted desc by playedAt — take the most recent 10
    const stats = allPlayerStats.slice(0, MONITORED_RECENT_WINDOW);

    const matchCount = stats.length;
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / matchCount;
    const avgAdr = calculateWeightedAdr(stats);
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
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc, steamAvatarFull: player.steamAvatarFull },
      rating: Number(avgRating.toFixed(2)),
      adr: Math.round(avgAdr),
      kd: Number(kd.toFixed(2)),
      kast: Math.round(avgKast),
      winrate: Math.round(winrate),
      hsPercent: Math.round(hsPercent),
      matchCount,
      seasonMatchCount,
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
  const avgAdr = calculateWeightedAdr(stats);
  const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

  let wins = 0;
  for (const s of stats) if (isWin(s)) wins++;
  const winrate = (wins / matchCount) * 100;

  return { rating: avgRating, adr: avgAdr, kd, winrate, matchCount };
}

// ─── Funcionalidade 1: Hot Streak / Cold Streak ────────────────────────────

export interface StreakRecentMatch {
  matchId: string;
  result: "V" | "D" | "E";
  score: string;
  mapName: string;
  playedAt: string;
  isMostRecent: boolean;
}

export interface StreakEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  type: "hot" | "cold";
  /** Vitórias (hot) ou derrotas/empates (cold) consecutivos a partir da partida mais recente. */
  streak: number;
  recentRating: number;
  /** Variação percentual do ADR das últimas 10 partidas frente à média da temporada (retrocompatibilidade). */
  adrChangePercent: number;
  matchCount: number;
  latestMatchAt: string;
  recentResults: StreakRecentMatch[];
}

export function getStreaksFromDataset(dataset: CompetitiveDataset): { hot: StreakEntry[]; cold: StreakEntry[] } {
  const hot: StreakEntry[] = [];
  const cold: StreakEntry[] = [];

  for (const player of dataset.activePlayers) {
    const fullStats = dataset.statsByPlayer.get(player.id) ?? [];
    if (fullStats.length < 2) continue; // Mínimo de 2 partidas para haver sequência

    // fullStats já vem ordenado desc por playedAt — índice 0 é a partida mais recente.
    const mostRecentMatch = fullStats[0];
    const mostRecentIsWin = isWin(mostRecentMatch);

    let streak = 0;
    if (mostRecentIsWin) {
      // Sequência de vitórias: vitórias consecutivas a partir da partida mais recente.
      // Derrota ou empate quebra a sequência.
      for (const s of fullStats) {
        if (isWin(s)) {
          streak++;
        } else {
          break;
        }
      }
    } else {
      // Sequência sem vencer: derrotas ou empates consecutivos a partir da partida mais recente.
      // Vitória quebra a sequência.
      for (const s of fullStats) {
        if (!isWin(s)) {
          streak++;
        } else {
          break;
        }
      }
    }

    if (streak < 2) continue; // Mínimo de 2 partidas consecutivas

    // Últimas 5 partidas do jogador em ordem cronológica (mais antiga para mais recente)
    const recent5Desc = fullStats.slice(0, 5);
    const recentResults: StreakRecentMatch[] = [...recent5Desc].reverse().map((s, idx, arr) => {
      const isTie = s.match.scoreTeamA === s.match.scoreTeamB;
      const won = isWin(s);
      const result: "V" | "D" | "E" = isTie ? "E" : won ? "V" : "D";
      const myScore = s.team === "A" ? s.match.scoreTeamA : s.match.scoreTeamB;
      const oppScore = s.team === "A" ? s.match.scoreTeamB : s.match.scoreTeamA;
      return {
        matchId: s.match.id,
        result,
        score: `${myScore} - ${oppScore}`,
        mapName: cleanMapName(s.match.map?.name ?? "Desconhecido"),
        playedAt:
          s.match.playedAt instanceof Date
            ? s.match.playedAt.toISOString()
            : String(s.match.playedAt ?? ""),
        isMostRecent: idx === arr.length - 1,
      };
    });

    const recentStats = fullStats.slice(0, 10);
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
      matchCount: fullStats.length,
      latestMatchAt:
        mostRecentMatch.match.playedAt instanceof Date
          ? mostRecentMatch.match.playedAt.toISOString()
          : String(mostRecentMatch.match.playedAt ?? ""),
      recentResults,
    };

    if (mostRecentIsWin) {
      hot.push(entry);
    } else {
      cold.push(entry);
    }
  }

  // Desempate determinístico:
  // 1. Tamanho da sequência decrescente
  // 2. Timestamp da partida mais recente decrescente
  // 3. ID estável do jogador crescente
  const sortStreaks = (a: StreakEntry, b: StreakEntry) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    const timeA = new Date(a.latestMatchAt).getTime();
    const timeB = new Date(b.latestMatchAt).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return a.player.id.localeCompare(b.player.id);
  };

  hot.sort(sortStreaks);
  cold.sort(sortStreaks);

  return { hot, cold };
}

// ─── Funcionalidades 2 e 3: Evolução recente / Queda de performance ────────

export interface RecentMatchPoint {
  matchId: string;
  playedAt: string;
  mapName: string;
  rating: number;
}

export interface SeasonComparisonEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc: number | null };
  /** Amostra imediatamente anterior (10 partidas anteriores). */
  season: { rating: number; adr: number; kd: number; winrate: number; matchCount: number };
  /** Amostra recente (últimas 10 partidas). */
  recent: { rating: number; adr: number; kd: number; winrate: number; matchCount: number };
  diff: { rating: number; adr: number; kd: number; winrate: number };
  /** Diferença exata de rating (recent.rating - previous.rating) sem arredondamento. */
  rawDiff: number;
  /** Pontos das últimas 10 partidas em ordem cronológica (mais antiga para mais recente). */
  recentMatches: RecentMatchPoint[];
}

/**
 * Compara dois blocos consecutivos e não-sobrepostos de 10 partidas:
 * - Últimas 10 partidas do jogador com rating disponível.
 * - 10 partidas imediatamente anteriores, dentro do mesmo período.
 * Exige estritamente 20 partidas válidas com rating no período.
 */
export function getSeasonComparisonFromDataset(dataset: CompetitiveDataset): SeasonComparisonEntry[] {
  const entries: SeasonComparisonEntry[] = [];

  for (const player of dataset.activePlayers) {
    const fullStats = dataset.statsByPlayer.get(player.id) ?? [];
    // Filtrar partidas com rating numérico disponível
    const validStats = fullStats.filter((s) => s.rating != null && !isNaN(s.rating));

    // Regra estrita: exigir 20 partidas com rating disponível no período
    if (validStats.length < 20) continue;

    // Duas janelas consecutivas e sem sobreposição:
    // Índices 0..9: as 10 mais recentes
    const recentStats = validStats.slice(0, 10);
    // Índices 10..19: as 10 imediatamente anteriores
    const previousStats = validStats.slice(10, 20);

    const recentMetrics = computeWindowMetrics(recentStats);
    const previousMetrics = computeWindowMetrics(previousStats);

    // Média real sem arredondamento para ordenação precisa
    const recentSumRating = recentStats.reduce((acc, s) => acc + (s.rating ?? 0), 0);
    const previousSumRating = previousStats.reduce((acc, s) => acc + (s.rating ?? 0), 0);
    const rawRecentRating = recentSumRating / 10;
    const rawPreviousRating = previousSumRating / 10;
    const rawDiff = rawRecentRating - rawPreviousRating;

    // 10 pontos em ordem cronológica (da mais antiga [índice 9] para a mais recente [índice 0])
    const recentMatches: RecentMatchPoint[] = [...recentStats].reverse().map((s) => ({
      matchId: s.match.id,
      playedAt:
        s.match.playedAt instanceof Date
          ? s.match.playedAt.toISOString()
          : String(s.match.playedAt ?? ""),
      mapName: cleanMapName(s.match.map?.name ?? "Desconhecido"),
      rating: Number((s.rating ?? 0).toFixed(2)),
    }));

    entries.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, levelGc: player.levelGc },
      season: {
        rating: Number(previousMetrics.rating.toFixed(2)),
        adr: Math.round(previousMetrics.adr),
        kd: Number(previousMetrics.kd.toFixed(2)),
        winrate: Math.round(previousMetrics.winrate),
        matchCount: previousMetrics.matchCount,
      },
      recent: {
        rating: Number(recentMetrics.rating.toFixed(2)),
        adr: Math.round(recentMetrics.adr),
        kd: Number(recentMetrics.kd.toFixed(2)),
        winrate: Math.round(recentMetrics.winrate),
        matchCount: recentMetrics.matchCount,
      },
      diff: {
        rating: Number((recentMetrics.rating - previousMetrics.rating).toFixed(2)),
        adr: Math.round(recentMetrics.adr - previousMetrics.adr),
        kd: Number((recentMetrics.kd - previousMetrics.kd).toFixed(2)),
        winrate: Math.round(recentMetrics.winrate - previousMetrics.winrate),
      },
      rawDiff,
      recentMatches,
    });
  }

  // Ordenação desc por rawDiff (maior evolução primeiro) com desempate por id
  return entries.sort((a, b) => b.rawDiff - a.rawDiff || a.player.id.localeCompare(b.player.id));
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

// ─── Radar do Grupo (Destaque, Fato do Período, Ponto de Atenção) ───────────

export function getFeaturedPlayerFromDataset(
  dataset: CompetitiveDataset,
  seasonComparison: SeasonComparisonEntry[]
): { player: FeaturedPlayerInfo | null; emptyReason: string | null } {
  const candidates: Array<{
    player: PlayerRow;
    rawRating: number;
    matchCount: number;
    wins: number;
    winrate: number;
    winrateMatchesCount: number;
  }> = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    const validStats = stats.filter((s) => s.rating != null && !isNaN(s.rating));
    if (validStats.length < 5) continue;

    const matchCount = validStats.length;
    const rawRating = validStats.reduce((sum, s) => sum + s.rating, 0) / matchCount;

    let wins = 0;
    for (const s of stats) {
      if (isWin(s)) wins++;
    }
    const winrateMatchesCount = stats.length;
    const winrate = winrateMatchesCount > 0 ? (wins / winrateMatchesCount) * 100 : 0;

    candidates.push({
      player,
      rawRating,
      matchCount,
      wins,
      winrate,
      winrateMatchesCount,
    });
  }

  if (candidates.length === 0) {
    return {
      player: null,
      emptyReason: "São necessárias pelo menos 5 partidas com rating no período.",
    };
  }

  candidates.sort((a, b) => {
    if (b.rawRating !== a.rawRating) return b.rawRating - a.rawRating;
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.player.id.localeCompare(b.player.id);
  });

  const best = candidates[0];

  // Comparação com janela anterior (seasonComparison exige 20 partidas para comparar 2 blocos de 10)
  const sc = seasonComparison.find((entry) => entry.player.id === best.player.id);
  let evolution: FeaturedPlayerInfo["evolution"] = null;

  if (sc) {
    const diffRating = Number(sc.rawDiff.toFixed(2));
    const direction: "up" | "down" | "stable" =
      diffRating > 0.02 ? "up" : diffRating < -0.02 ? "down" : "stable";
    const sign = diffRating > 0 ? "+" : diffRating < 0 ? "−" : "";
    const text =
      diffRating === 0
        ? "Rating estável vs 10 partidas anteriores"
        : `${sign}${Math.abs(diffRating).toFixed(2).replace(".", ",")} de rating vs 10 partidas anteriores`;

    evolution = {
      diffRating,
      text,
      direction,
    };
  }

  return {
    player: {
      player: {
        id: best.player.id,
        nickname: best.player.nickname,
        avatarUrl: best.player.avatarUrl,
        levelGc: best.player.levelGc,
      },
      rating: Number(best.rawRating.toFixed(2)),
      rawRating: best.rawRating,
      matchCount: best.matchCount,
      wins: best.wins,
      winrate: best.winrate,
      winrateMatchesCount: best.winrateMatchesCount,
      justification: "Maior rating médio entre jogadores com pelo menos 5 partidas com rating no período.",
      evolution,
    },
    emptyReason: null,
  };
}

export function getPeriodFactFromDataset(
  dataset: CompetitiveDataset,
  featuredPlayerId: string | null
): { periodFact: PeriodFactInfo | null; emptyReason: string | null } {
  // Prioridade 1: Maior sequência de vitórias (streak >= 3) iniciada ou concluída no período
  const streakCandidates: Array<{
    player: PlayerRow;
    streak: number;
    isActive: boolean;
    endDate: Date;
    isFeatured: boolean;
  }> = [];

  for (const player of dataset.activePlayers) {
    const stats = dataset.statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    let currentStreakStats: typeof stats = [];
    let isCurrentBlockActive = true;

    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      if (isWin(s)) {
        currentStreakStats.push(s);
      } else {
        if (currentStreakStats.length >= 3) {
          streakCandidates.push({
            player,
            streak: currentStreakStats.length,
            isActive: isCurrentBlockActive,
            endDate: new Date(currentStreakStats[0].match.playedAt),
            isFeatured: player.id === featuredPlayerId,
          });
        }
        currentStreakStats = [];
        isCurrentBlockActive = false;
      }
    }

    if (currentStreakStats.length >= 3) {
      streakCandidates.push({
        player,
        streak: currentStreakStats.length,
        isActive: isCurrentBlockActive,
        endDate: new Date(currentStreakStats[0].match.playedAt),
        isFeatured: player.id === featuredPlayerId,
      });
    }
  }

  if (streakCandidates.length > 0) {
    streakCandidates.sort((a, b) => {
      // 1. Maior sequência primeiro
      if (b.streak !== a.streak) return b.streak - a.streak;
      // 2. Regra de não repetição: em caso de empate na sequência, preferir jogador diferente do destaque
      if (a.isFeatured !== b.isFeatured) {
        return (a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0);
      }
      // 3. Sequência encerrada mais recentemente (ou em andamento mais recente)
      const dateDiff = b.endDate.getTime() - a.endDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      // 4. ID estável crescente
      return a.player.id.localeCompare(b.player.id);
    });

    const top = streakCandidates[0];
    const day = String(top.endDate.getUTCDate()).padStart(2, "0");
    const month = String(top.endDate.getUTCMonth() + 1).padStart(2, "0");
    const year = top.endDate.getUTCFullYear();

    if (top.isActive) {
      return {
        periodFact: {
          kind: "streak-active",
          title: "Sequência ativa",
          description: `${top.player.nickname} está com uma sequência de ${top.streak} vitórias consecutivas em andamento.`,
          player: {
            id: top.player.id,
            nickname: top.player.nickname,
            avatarUrl: top.player.avatarUrl,
            levelGc: top.player.levelGc,
          },
          badgeLabel: "EM ANDAMENTO",
          badgeVariant: "gold",
          detail: `${top.streak} vitórias consecutivas ativas`,
          streakCount: top.streak,
          endDate: top.endDate.toISOString(),
        },
        emptyReason: null,
      };
    } else {
      return {
        periodFact: {
          kind: "streak-concluded",
          title: "Sequência do período",
          description: `${top.player.nickname} conquistou uma sequência de ${top.streak} vitórias consecutivas no período.`,
          player: {
            id: top.player.id,
            nickname: top.player.nickname,
            avatarUrl: top.player.avatarUrl,
            levelGc: top.player.levelGc,
          },
          badgeLabel: "CONCLUÍDA",
          badgeVariant: "info",
          detail: `Encerrada em ${day}/${month}/${year}`,
          streakCount: top.streak,
          endDate: top.endDate.toISOString(),
        },
        emptyReason: null,
      };
    }
  }

  // Prioridade 2: Melhor mapa coletivo com >= 5 partidas válidas e winrate > 50%
  const { mapWinrates } = getMapPerformanceFromDataset(dataset);
  const eligibleMaps = mapWinrates.filter((m) => m.matchesPlayed >= 5 && (m.rawWinrate ?? m.winrate) > 50);

  if (eligibleMaps.length > 0) {
    eligibleMaps.sort(
      (a, b) =>
        (b.rawWinrate ?? b.winrate) - (a.rawWinrate ?? a.winrate) ||
        b.matchesPlayed - a.matchesPlayed ||
        a.map.localeCompare(b.map)
    );
    const bestMap = eligibleMaps[0];
    return {
      periodFact: {
        kind: "collective-map",
        title: "Domínio coletivo",
        description: `O time tem ${bestMap.winrate.toFixed(1).replace(".", ",")}% de aproveitamento na ${bestMap.cleanMapName} (${bestMap.wins}V - ${bestMap.losses}D em ${bestMap.matchesPlayed} partidas).`,
        player: null,
        badgeLabel: "MAPA DO GRUPO",
        badgeVariant: "neutral",
        detail: `${bestMap.wins} vitórias em ${bestMap.matchesPlayed} partidas coletivas`,
        mapName: bestMap.cleanMapName,
      },
      emptyReason: null,
    };
  }

  return {
    periodFact: null,
    emptyReason: "Nenhum fato atende aos critérios neste período.",
  };
}

export function getAttentionPointFromDataset(
  seasonComparison: SeasonComparisonEntry[],
  dataset: CompetitiveDataset
): { attentionPoint: AttentionPointInfo | null; emptyReason: string | null } {
  // Verificar se há qualquer jogador com pelo menos 20 partidas válidas com rating no período
  const hasAnyPlayerWith20Matches = dataset.activePlayers.some((p) => {
    const stats = dataset.statsByPlayer.get(p.id) ?? [];
    return stats.filter((s) => s.rating != null && !isNaN(s.rating)).length >= 20;
  });

  if (!hasAnyPlayerWith20Matches) {
    return {
      attentionPoint: null,
      emptyReason: "Dados insuficientes para comparar dois blocos de 10 partidas.",
    };
  }

  // Filtrar quem teve queda de pelo menos 0,10 de rating
  const drops = seasonComparison.filter((e) => e.rawDiff <= -0.10);

  if (drops.length === 0) {
    return {
      attentionPoint: null,
      emptyReason: "Nenhuma queda de rating de 0,10 ou mais identificada.",
    };
  }

  // Maior queda primeiro (mais negativo -> menor rawDiff), desempate por id
  drops.sort((a, b) => a.rawDiff - b.rawDiff || a.player.id.localeCompare(b.player.id));

  const worst = drops[0];
  const dropAbs = Math.abs(worst.rawDiff);

  return {
    attentionPoint: {
      player: worst.player,
      dropRating: Number(dropAbs.toFixed(2)),
      rawDiff: worst.rawDiff,
      previousRating: worst.season.rating,
      recentRating: worst.recent.rating,
      previousMatchesCount: 10,
      recentMatchesCount: 10,
      explanation: "A média de rating caiu entre os dois blocos de partidas.",
    },
    emptyReason: null,
  };
}

export function getGroupRadarFromDataset(
  dataset: CompetitiveDataset,
  seasonComparison: SeasonComparisonEntry[],
  seasonBounds?: { startDate?: Date | string | null; endDate?: Date | string | null; status?: string | null } | null,
): GroupRadarBundle {
  const featured = getFeaturedPlayerFromDataset(dataset, seasonComparison);
  const fact = getPeriodFactFromDataset(dataset, featured.player?.player.id ?? null);
  const attention = getAttentionPointFromDataset(seasonComparison, dataset);

  // 1. Deduplicar partidas únicas a partir de dataset.allStats
  const uniqueMatchesMap = new Map<
    string,
    {
      matchId: string;
      playedAt: Date;
      scoreTeamA: number;
      scoreTeamB: number;
      sessionId: string | null;
      sessionName: string | null;
      sessionDate: Date | null;
      trackedPlayersCount: number;
      monitoredStats: Array<{
        playerId: string;
        team: string;
        nickname: string;
      }>;
    }
  >();

  for (const s of dataset.allStats) {
    if (!uniqueMatchesMap.has(s.matchId)) {
      uniqueMatchesMap.set(s.matchId, {
        matchId: s.matchId,
        playedAt: new Date(s.match.playedAt),
        scoreTeamA: s.match.scoreTeamA,
        scoreTeamB: s.match.scoreTeamB,
        sessionId: s.match.sessionId ?? null,
        sessionName: (s.match as any).session?.name ?? null,
        sessionDate: (s.match as any).session?.date ? new Date((s.match as any).session.date) : null,
        trackedPlayersCount: s.match.trackedPlayersCount,
        monitoredStats: [],
      });
    }
    const matchRecord = uniqueMatchesMap.get(s.matchId)!;
    matchRecord.monitoredStats.push({
      playerId: s.playerId,
      team: s.team,
      nickname: (s as any).player?.nickname ?? "",
    });
  }

  const uniqueMatches = Array.from(uniqueMatchesMap.values()).map((m) => {
    const teams = new Set(m.monitoredStats.map((st) => st.team));
    const isDirectConfrontation = teams.size > 1;
    const isSameTeam = teams.size === 1;
    const monitoredTeam = isSameTeam ? Array.from(teams)[0] : null;

    let isWin = false;
    let isLoss = false;
    let isTie = false;
    let roundsFor = 0;
    let roundsAgainst = 0;

    if (isSameTeam && monitoredTeam) {
      if (m.scoreTeamA === m.scoreTeamB) {
        isTie = true;
      } else if (
        (monitoredTeam === "A" && m.scoreTeamA > m.scoreTeamB) ||
        (monitoredTeam === "B" && m.scoreTeamB > m.scoreTeamA)
      ) {
        isWin = true;
      } else {
        isLoss = true;
      }
      roundsFor = monitoredTeam === "A" ? m.scoreTeamA : m.scoreTeamB;
      roundsAgainst = monitoredTeam === "A" ? m.scoreTeamB : m.scoreTeamA;
    }

    return {
      ...m,
      isDirectConfrontation,
      isSameTeam,
      monitoredTeam,
      isWin,
      isLoss,
      isTie,
      roundsFor,
      roundsAgainst,
    };
  });

  // Ordenação determinística: playedAt desc -> matchId desc
  uniqueMatches.sort(
    (a, b) => b.playedAt.getTime() - a.playedAt.getTime() || b.matchId.localeCompare(a.matchId)
  );

  // ─── Bloco 1: Momento Coletivo ──────────────────────────────────────────
  // Partidas com pelo menos 2 monitorados no mesmo time, sem confrontos internos
  const eligibleCollective = uniqueMatches.filter((m) => m.monitoredStats.length >= 2 && m.isSameTeam);
  const eligibleMatchesCount = eligibleCollective.length;

  let squadMomentum: SquadMomentumInfo;

  if (eligibleMatchesCount === 0) {
    squadMomentum = {
      eligibleMatchesCount: 0,
      recentBlock: null,
      previousBlock: null,
      diffPp: null,
      hasComparison: false,
      sampleStatus: "insufficient",
      emptyReason: "Nenhuma partida coletiva com monitorados no mesmo time registrada no período.",
    };
  } else {
    const formatBlockDates = (matches: typeof eligibleCollective) => {
      if (matches.length === 0) return { startDate: "", endDate: "" };
      const mostRecent = matches[0].playedAt;
      const oldest = matches[matches.length - 1].playedAt;
      const fmt = (d: Date) =>
        new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);
      return {
        startDate: fmt(oldest),
        endDate: fmt(mostRecent),
      };
    };

    const buildBlock = (matches: typeof eligibleCollective): SquadMomentumBlock => {
      const wins = matches.filter((m) => m.isWin).length;
      const losses = matches.filter((m) => m.isLoss).length;
      const ties = matches.filter((m) => m.isTie).length;
      const winrate = matches.length > 0 ? (wins / matches.length) * 100 : 0;
      const roundsFor = matches.reduce((acc, m) => acc + m.roundsFor, 0);
      const roundsAgainst = matches.reduce((acc, m) => acc + m.roundsAgainst, 0);
      const { startDate, endDate } = formatBlockDates(matches);
      return {
        matchesCount: matches.length,
        wins,
        losses,
        ties,
        winrate: Number(winrate.toFixed(1)),
        roundsFor,
        roundsAgainst,
        roundDiff: roundsFor - roundsAgainst,
        startDate,
        endDate,
      };
    };

    if (eligibleMatchesCount < 10) {
      squadMomentum = {
        eligibleMatchesCount,
        recentBlock: buildBlock(eligibleCollective),
        previousBlock: null,
        diffPp: null,
        hasComparison: false,
        sampleStatus: "insufficient",
        emptyReason: null,
      };
    } else if (eligibleMatchesCount < 20) {
      squadMomentum = {
        eligibleMatchesCount,
        recentBlock: buildBlock(eligibleCollective.slice(0, 10)),
        previousBlock: null,
        diffPp: null,
        hasComparison: false,
        sampleStatus: "partial",
        emptyReason: null,
      };
    } else {
      const recentBlock = buildBlock(eligibleCollective.slice(0, 10));
      const previousBlock = buildBlock(eligibleCollective.slice(10, 20));
      const diffPp = Number((recentBlock.winrate - previousBlock.winrate).toFixed(1));
      squadMomentum = {
        eligibleMatchesCount,
        recentBlock,
        previousBlock,
        diffPp,
        hasComparison: true,
        sampleStatus: "full",
        emptyReason: null,
      };
    }
  }

  // ─── Bloco 2: Ritmo de Sessões ──────────────────────────────────────────
  const eligibleSessionsMap = new Map<string, { id: string; name: string; date: Date | null; matchesCount: number }>();
  for (const m of eligibleCollective) {
    if (m.sessionId) {
      if (!eligibleSessionsMap.has(m.sessionId)) {
        eligibleSessionsMap.set(m.sessionId, {
          id: m.sessionId,
          name: m.sessionName ?? `Sessão ${m.sessionId.slice(-6)}`,
          date: m.sessionDate,
          matchesCount: 0,
        });
      }
      eligibleSessionsMap.get(m.sessionId)!.matchesCount++;
    }
  }

  const totalEligibleSessions = eligibleSessionsMap.size;
  const averageMatchesPerSession =
    totalEligibleSessions > 0 ? Number((eligibleMatchesCount / totalEligibleSessions).toFixed(1)) : 0;

  let latestSessionInfo: SessionPaceInfo["latestSession"] = null;
  if (eligibleCollective.length > 0 && eligibleCollective[0].sessionId) {
    const latestMatch = eligibleCollective[0];
    const sessionObj = eligibleSessionsMap.get(latestMatch.sessionId!);
    if (sessionObj) {
      const timeFmt = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(latestMatch.playedAt);

      latestSessionInfo = {
        id: sessionObj.id,
        name: sessionObj.name,
        date: sessionObj.date?.toISOString() ?? latestMatch.playedAt.toISOString(),
        eligibleMatchesCount: sessionObj.matchesCount,
        latestMatchPlayedAt: latestMatch.playedAt.toISOString(),
        latestMatchTimeFormatted: `${timeFmt} (Horário de Brasília)`,
      };
    }
  }

  const sessionPace: SessionPaceInfo = {
    totalEligibleSessions,
    totalEligibleMatches: eligibleMatchesCount,
    averageMatchesPerSession,
    latestSession: latestSessionInfo,
    emptyReason: totalEligibleSessions === 0 ? "Nenhuma sessão com partidas coletivas no mesmo time registrada." : null,
  };

  // ─── Bloco 3: Composição das Partidas ────────────────────────────────────
  const totalUniverse = uniqueMatches.length;
  let matchComposition: MatchCompositionInfo;

  if (totalUniverse === 0) {
    matchComposition = {
      totalUniverse: 0,
      soloCount: 0,
      soloPercentage: 0,
      smallTeamCount: 0,
      smallTeamPercentage: 0,
      fullTeamCount: 0,
      fullTeamPercentage: 0,
      confrontationCount: 0,
      confrontationPercentage: 0,
      otherCount: 0,
      teamCount: 0,
      teamPercentage: 0,
      emptyReason: "Nenhuma partida registrada no universo do período selecionado.",
    };
  } else {
    const soloCount = uniqueMatches.filter((m) => m.monitoredStats.length === 1).length;
    const smallTeamCount = uniqueMatches.filter(
      (m) => m.monitoredStats.length >= 2 && m.monitoredStats.length <= 4 && m.isSameTeam
    ).length;
    const fullTeamCount = uniqueMatches.filter((m) => m.monitoredStats.length === 5 && m.isSameTeam).length;
    const confrontationCount = uniqueMatches.filter((m) => m.isDirectConfrontation).length;
    const otherCount = totalUniverse - (soloCount + smallTeamCount + fullTeamCount + confrontationCount);

    const teamCount = smallTeamCount + fullTeamCount;
    const teamPercentage = Number(((teamCount / totalUniverse) * 100).toFixed(1));

    const soloPercentage = Number(((soloCount / totalUniverse) * 100).toFixed(1));
    const smallTeamPercentage = Number(((smallTeamCount / totalUniverse) * 100).toFixed(1));
    const fullTeamPercentage = Number(((fullTeamCount / totalUniverse) * 100).toFixed(1));
    const confrontationPercentage = Number(((confrontationCount / totalUniverse) * 100).toFixed(1));

    matchComposition = {
      totalUniverse,
      soloCount,
      soloPercentage,
      smallTeamCount,
      smallTeamPercentage,
      fullTeamCount,
      fullTeamPercentage,
      confrontationCount,
      confrontationPercentage,
      otherCount,
      teamCount,
      teamPercentage,
      emptyReason: null,
    };
  }

  // ─── Bloco 4: Participação Recente (7 dias) ──────────────────────────────
  const now = new Date();
  const seasonStart = seasonBounds?.startDate ? new Date(seasonBounds.startDate) : null;
  const seasonEnd = seasonBounds?.endDate ? new Date(seasonBounds.endDate) : null;

  // Se a temporada estiver encerrada (endDate < now), a âncora é endDate; caso contrário now
  const windowEnd = seasonEnd && seasonEnd < now ? seasonEnd : now;
  const rawWindowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowStart = seasonStart && seasonStart > rawWindowStart ? seasonStart : rawWindowStart;

  const matchesInWindow = uniqueMatches.filter((m) => m.playedAt >= windowStart && m.playedAt <= windowEnd);

  // Jogadores ativos no dataset que jogaram pelo menos uma partida na janela
  const participatingPlayersList: RecentParticipationInfo["participatingPlayers"] = [];
  for (const player of dataset.activePlayers) {
    const matchesCount = matchesInWindow.filter((m) =>
      m.monitoredStats.some((st) => st.playerId === player.id)
    ).length;
    if (matchesCount > 0) {
      participatingPlayersList.push({
        id: player.id,
        nickname: player.nickname,
        avatarUrl: player.avatarUrl,
        matchesCount,
      });
    }
  }

  participatingPlayersList.sort((a, b) => b.matchesCount - a.matchesCount || a.nickname.localeCompare(b.nickname));

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

  const latestMatchPlayedAt = uniqueMatches.length > 0 ? uniqueMatches[0].playedAt.toISOString() : null;

  const recentParticipation: RecentParticipationInfo = {
    windowDays: 7,
    windowStartDate: `${fmtDate(windowStart)}`,
    windowEndDate: `${fmtDate(windowEnd)}`,
    activeCount: participatingPlayersList.length,
    totalActiveMonitored: dataset.activePlayers.length,
    latestMatchPlayedAt,
    participatingPlayers: participatingPlayersList,
    emptyReason:
      dataset.activePlayers.length === 0
        ? "Nenhum jogador monitorado cadastrado."
        : participatingPlayersList.length === 0
        ? "Nenhum jogador monitorado participou de partidas nos últimos 7 dias."
        : null,
  };

  return {
    squadMomentum,
    sessionPace,
    matchComposition,
    recentParticipation,
    featuredPlayer: featured.player,
    featuredPlayerEmptyReason: featured.emptyReason,
    periodFact: fact.periodFact,
    periodFactEmptyReason: fact.emptyReason,
    attentionPoint: attention.attentionPoint,
    attentionPointEmptyReason: attention.emptyReason,
  };
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
  radar: GroupRadarBundle;
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
  worstRecords: HallOfFameRecord[];
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
  clutchesBundle: ClutchesBundle;
  combatBundle: CombatBundle;
  highlightsPool: DashboardHighlight[];
}

export interface ClutchTierSummary {
  tier: "1v1" | "1v2" | "1v3" | "1v4" | "1v5";
  label: string;
  attempts: number;
  wins: number;
  winrate: number;
}

export interface ClutchLeaderEntry {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  clutchWins: number;
  clutchAttempts: number;
  winrate: number;
}

export interface ClutchesBundle {
  totalAttempts: number;
  totalWins: number;
  winrate: number;
  tiers: ClutchTierSummary[];
  leaders: ClutchLeaderEntry[];
}

export interface CombatBundle {
  wallbangKills: number;
  throughSmokeKills: number;
  noScopeKills: number;
  blindedKills: number;
  totalSkillKills: number;
  headDamagePercent: number | null;
  avgDamagePerHit: number | null;
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
  seasonBounds?: { startDate?: Date | string | null; endDate?: Date | string | null; status?: string | null } | null,
): Promise<DashboardCompetitiveBundle> {
  const ds = dataset ?? (await loadCompetitiveDataset());

  let resolvedSeason = seasonBounds;
  if (!resolvedSeason && (ds as any).seasonId) {
    resolvedSeason = await prisma.season.findUnique({ where: { id: (ds as any).seasonId } });
  }
  if (!resolvedSeason) {
    resolvedSeason = await getActiveSeason();
  }

  const decisive = await getDecisivePlayersFromDataset(ds);

  const extremes = getPerformanceExtremesFromDataset(ds);
  const mapPerformance = getMapPerformanceFromDataset(ds);

  const streaks = getStreaksFromDataset(ds);
  const seasonComparison = getSeasonComparisonFromDataset(ds);
  const topGainers = seasonComparison
    .filter((e) => e.rawDiff > 0)
    .sort((a, b) => b.rawDiff - a.rawDiff || a.player.id.localeCompare(b.player.id))
    .slice(0, 3);
  const topDecliners = seasonComparison
    .filter((e) => e.rawDiff < 0)
    .sort((a, b) => a.rawDiff - b.rawDiff || a.player.id.localeCompare(b.player.id))
    .slice(0, 3);

  const radar = getGroupRadarFromDataset(ds, seasonComparison, resolvedSeason);

  return {
    radar,
    powerRanking: getPowerRankingFromDataset(ds),
    momentum: getPlayerMomentumFromDataset(ds, 3),
    decisive,
    archetypes: getPlayerArchetypesFromDataset(ds),
    matchups: getPlayerMatchupsFromDataset(ds),
    jogadorDaSemana: getJogadorDaSemanaFromDataset(ds, radar.featuredPlayer),
    duos: getDuoLeaderboardFromDataset(ds, 2),
    dominantTrio: getDominantTrioFromDataset(ds),
    mapSpecialists: getMapSpecialistsFromDataset(ds),
    records: getHallOfFameRecordsFromDataset(ds),
    worstRecords: getWorstRecordsFromDataset(ds),
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
    clutchesBundle: getClutchesBundleFromDataset(ds),
    combatBundle: await getCombatBundleFromDataset(ds),
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

export function getClutchesBundleFromDataset(dataset: CompetitiveDataset): ClutchesBundle {
  const { activePlayers, statsByPlayer } = dataset;

  const tierMap: Record<"1v1" | "1v2" | "1v3" | "1v4" | "1v5", { attempts: number; wins: number }> = {
    "1v1": { attempts: 0, wins: 0 },
    "1v2": { attempts: 0, wins: 0 },
    "1v3": { attempts: 0, wins: 0 },
    "1v4": { attempts: 0, wins: 0 },
    "1v5": { attempts: 0, wins: 0 },
  };

  const leaders: ClutchLeaderEntry[] = [];

  let grandTotalAttempts = 0;
  let grandTotalWins = 0;

  for (const player of activePlayers) {
    const stats = statsByPlayer.get(player.id) ?? [];
    let pAttempts = 0;
    let pWins = 0;

    for (const s of stats) {
      const a1 = s.clutch1v1Attempts ?? 0;
      const w1 = s.clutch1v1Wins ?? 0;
      const a2 = s.clutch1v2Attempts ?? 0;
      const w2 = s.clutch1v2Wins ?? 0;
      const a3 = s.clutch1v3Attempts ?? 0;
      const w3 = s.clutch1v3Wins ?? 0;
      const a4 = s.clutch1v4Attempts ?? 0;
      const w4 = s.clutch1v4Wins ?? 0;
      const a5 = s.clutch1v5Attempts ?? 0;
      const w5 = s.clutch1v5Wins ?? 0;

      tierMap["1v1"].attempts += a1; tierMap["1v1"].wins += w1;
      tierMap["1v2"].attempts += a2; tierMap["1v2"].wins += w2;
      tierMap["1v3"].attempts += a3; tierMap["1v3"].wins += w3;
      tierMap["1v4"].attempts += a4; tierMap["1v4"].wins += w4;
      tierMap["1v5"].attempts += a5; tierMap["1v5"].wins += w5;

      const sWins = Math.max(s.clutchesWon ?? 0, w1 + w2 + w3 + w4 + w5);
      const sAttempts = a1 + a2 + a3 + a4 + a5;

      pWins += sWins;
      pAttempts += sAttempts;
    }

    grandTotalAttempts += pAttempts;
    grandTotalWins += pWins;

    if (pWins > 0 || pAttempts > 0) {
      leaders.push({
        playerId: player.id,
        nickname: player.nickname,
        avatarUrl: player.avatarUrl,
        clutchWins: pWins,
        clutchAttempts: pAttempts,
        winrate: pAttempts > 0 ? Math.round((pWins / pAttempts) * 100) : 0,
      });
    }
  }

  leaders.sort((a, b) => b.clutchWins - a.clutchWins || b.winrate - a.winrate);

  const tiersKey: ("1v1" | "1v2" | "1v3" | "1v4" | "1v5")[] = ["1v1", "1v2", "1v3", "1v4", "1v5"];
  const tiers: ClutchTierSummary[] = tiersKey.map((t) => {
    const data = tierMap[t];
    return {
      tier: t,
      label: t,
      attempts: data.attempts,
      wins: data.wins,
      winrate: data.attempts > 0 ? Math.round((data.wins / data.attempts) * 100) : 0,
    };
  });

  return {
    totalAttempts: grandTotalAttempts,
    totalWins: grandTotalWins,
    winrate: grandTotalAttempts > 0 ? Math.round((grandTotalWins / grandTotalAttempts) * 100) : 0,
    tiers,
    leaders: leaders.slice(0, 5),
  };
}

export async function getCombatBundleFromDataset(dataset: CompetitiveDataset): Promise<CombatBundle> {
  const { allStats, activePlayers } = dataset;
  const gcMatchIds = Array.from(
    new Set(allStats.map((s) => s.match.gamersClubMatchId).filter((id): id is string => Boolean(id)))
  );

  if (gcMatchIds.length === 0) {
    return {
      wallbangKills: 0,
      throughSmokeKills: 0,
      noScopeKills: 0,
      blindedKills: 0,
      totalSkillKills: 0,
      headDamagePercent: null,
      avgDamagePerHit: null,
    };
  }

  const activeSteamIds = new Set(
    (
      await prisma.player.findMany({
        where: { id: { in: activePlayers.map((p) => p.id) } },
        select: { steamId: true },
      })
    ).map((p) => p.steamId)
  );

  const payloads = await prisma.matchPayload.findMany({
    where: { sourceMatchId: { in: gcMatchIds } },
    select: { payload: true },
  });

  let wallbangKills = 0;
  let throughSmokeKills = 0;
  let noScopeKills = 0;
  let blindedKills = 0;
  let totalSkillKills = 0;

  let totalDamage = 0;
  let totalHits = 0;
  let headDamage = 0;

  for (const { payload } of payloads) {
    const kills: any[] = (payload as any)?.kills ?? [];
    for (const k of kills) {
      if (!activeSteamIds.has(k.killer_steamid)) continue;
      if (k.killer_steamid === k.victim_steamid) continue;
      if (k.analytics?.teamkill === true) continue;

      const isWallbang = k.wallbang === true;
      const isThruSmoke = k.thrusmoke === true;
      const isNoScope = k.noscope === true;
      const isBlinded = k.attacker_blind === true;

      if (isWallbang) wallbangKills++;
      if (isThruSmoke) throughSmokeKills++;
      if (isNoScope) noScopeKills++;
      if (isBlinded) blindedKills++;
      if (isWallbang || isThruSmoke || isNoScope || isBlinded) totalSkillKills++;
    }

    const damageEvents: any[] = (payload as any)?.damage ?? [];
    for (const d of damageEvents) {
      if (!activeSteamIds.has(d.attacker_steamid)) continue;
      if (d.victim_steamid === d.attacker_steamid) continue;

      const hp = d.damage_health ?? 0;
      totalDamage += hp;
      totalHits++;
      if (d.hitgroup === "head") {
        headDamage += hp;
      }
    }
  }

  return {
    wallbangKills,
    throughSmokeKills,
    noScopeKills,
    blindedKills,
    totalSkillKills,
    headDamagePercent: totalDamage > 0 ? Math.round((headDamage / totalDamage) * 100) : null,
    avgDamagePerHit: totalHits > 0 ? Math.round((totalDamage / totalHits) * 10) / 10 : null,
  };
}
