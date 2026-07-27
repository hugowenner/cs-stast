import { prisma } from "@/server/db";
import { trackedPlayerStatsWhere } from "./player.repository";
import { communityMatchWhere } from "@/server/domain/matchClassification";

export function listStatsForPlayer(playerId: string, take = 50) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    take,
    orderBy: { match: { playedAt: "desc" } },
    include: { match: { include: { map: true, session: true } } },
  });
}

export function getPlayerCareerTotals(playerId: string) {
  return prisma.playerMatchStats.aggregate({
    where: { playerId },
    _sum: {
      kills: true,
      deaths: true,
      assists: true,
      headshots: true,
      // Campos abaixo adicionados para o AchievementEngine (conquistas cumulativas
      // Entry Fragger, Clutch Master, Team Player) — mesma query já existente,
      // sem nenhuma consulta nova ao banco.
      entryKills: true,
      clutch1v1Wins: true,
      clutch1v2Wins: true,
      clutch1v3Wins: true,
      clutch1v4Wins: true,
      clutch1v5Wins: true,
    },
    _avg: { rating: true, adr: true, kast: true, impact: true },
    _count: { _all: true },
  });
}

export function getPlayerEloHistory(playerId: string, take = 100) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    take,
    orderBy: { match: { playedAt: "asc" } },
    select: { eloAfter: true, match: { select: { playedAt: true, id: true } } },
  });
}

export function getLatestEloForPlayers(playerIds: string[]) {
  return prisma.playerMatchStats.findMany({
    where: { playerId: { in: playerIds } },
    distinct: ["playerId"],
    orderBy: [{ playerId: "asc" }, { match: { playedAt: "desc" } }],
    select: { playerId: true, eloAfter: true },
  });
}

/**
 * ELO é o valor mais recente por jogador, não uma média — não dá para expressar isso
 * num único groupBy do Prisma. Busca o ELO mais recente de todo mundo e ordena em
 * memória; aceitável na escala de um grupo privado (dezenas de jogadores). Ranking é
 * métrica coletiva — só considera partidas COMUNIDADE (ver matchClassification.ts);
 * "ELO mais recente" aqui significa o mais recente entre as partidas de comunidade,
 * não incluindo partidas SOLO que o jogador tenha feito depois.
 */
export async function getEloLeaderboard(take = 20) {
  const rows = await prisma.playerMatchStats.findMany({
    where: { ...trackedPlayerStatsWhere(), match: communityMatchWhere() },
    distinct: ["playerId"],
    orderBy: [{ playerId: "asc" }, { match: { playedAt: "desc" } }],
    select: { playerId: true, eloAfter: true },
  });
  return rows.sort((a, b) => b.eloAfter - a.eloAfter).slice(0, take);
}

export type RankingMetric = "rating" | "adr" | "kast" | "impact";

export async function getRankingByMetric(metric: RankingMetric, take = 20) {
  const latestMatch = await prisma.match.findFirst({
    orderBy: { playedAt: "desc" },
  });
  const today = latestMatch ? new Date(latestMatch.playedAt) : new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Ranking é métrica coletiva — combina o piso de comunidade com a janela de 30 dias.
  const whereClause = {
    ...trackedPlayerStatsWhere(),
    match: {
      playedAt: { gte: thirtyDaysAgo },
      ...communityMatchWhere(),
    },
  };

  switch (metric) {
    case "rating":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { rating: true },
        _count: { _all: true },
        orderBy: { _avg: { rating: "desc" } },
        take,
      });
    case "adr":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { adr: true },
        _count: { _all: true },
        orderBy: { _avg: { adr: "desc" } },
        take,
      });
    case "kast":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { kast: true },
        _count: { _all: true },
        orderBy: { _avg: { kast: "desc" } },
        take,
      });
    case "impact":
      return prisma.playerMatchStats.groupBy({
        where: whereClause,
        by: ["playerId"],
        _avg: { impact: true },
        _count: { _all: true },
        orderBy: { _avg: { impact: "desc" } },
        take,
      });
  }
}

export function getMapWinrates() {
  return prisma.playerMatchStats.findMany({
    where: { ...trackedPlayerStatsWhere(), match: communityMatchWhere() },
    select: {
      team: true,
      match: {
        select: {
          id: true,
          mapId: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: { select: { name: true } },
        },
      },
    },
  });
}

export function getPlayerMatchOutcomes(playerId: string) {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    select: {
      team: true,
      rating: true,
      eloAfter: true,
      kills: true,
      deaths: true,
      match: {
        select: {
          id: true,
          playedAt: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: { select: { name: true } },
        },
      },
    },
    orderBy: { match: { playedAt: "asc" } },
  });
}

/**
 * Mesma seleção de `getPlayerMatchOutcomes`, mas para múltiplos jogadores em uma
 * única query — usada por rivalry.service.listTopRivalriesWithH2H (elimina N+1) e por
 * comparison.service.getPlayerComparison (cálculo de H2H do /compare).
 *
 * Filtra por communityMatchWhere() como segunda camada de proteção: a ingestão já
 * não gera deltas de Rivalry para partidas SOLO (ver match.service.ts), mas isso não
 * apaga deltas gravados antes dessa correção existir, nem impede que dois jogadores
 * hoje monitorados tenham uma partida SOLO antiga em comum. Sem este filtro aqui, os
 * detalhes de H2H (K/D, último confronto, together/against) ainda poderiam incluir
 * essa partida.
 */
export function getPlayerMatchOutcomesForPlayers(playerIds: string[]) {
  return prisma.playerMatchStats.findMany({
    where: { playerId: { in: playerIds }, match: communityMatchWhere() },
    select: {
      playerId: true,
      team: true,
      rating: true,
      eloAfter: true,
      kills: true,
      deaths: true,
      match: {
        select: {
          id: true,
          playedAt: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: { select: { name: true } },
        },
      },
    },
    orderBy: { match: { playedAt: "asc" } },
  });
}
