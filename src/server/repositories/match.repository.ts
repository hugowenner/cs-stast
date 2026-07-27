import { prisma } from "@/server/db";
import type { EventType, MatchTeam, Prisma } from "@/generated/prisma";
import { trackedMatchWhere, trackedPlayerWhere } from "./player.repository";
import { communityMatchWhere } from "@/server/domain/matchClassification";

export function findMatchByGamersClubId(gamersClubMatchId: string) {
  return prisma.match.findUnique({ where: { gamersClubMatchId } });
}

/**
 * Total de partidas COMUNIDADE (>= 2 jogadores monitorados) — é o número usado nas
 * estatísticas gerais do Dashboard ("X partidas analisadas"). Partidas SOLO existem no
 * banco e nunca deixam de ser sincronizadas, só não entram nessa contagem coletiva.
 */
export function countCommunityMatches() {
  return prisma.match.count({
    where: communityMatchWhere(),
  });
}

export function findMatchById(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      map: true,
      session: true,
      playerStats: {
        where: {
          player: trackedPlayerWhere(),
        },
        include: { player: true },
        orderBy: { rating: "desc" },
      },
      events: {
        where: {
          player: trackedPlayerWhere(),
        },
        include: { player: true, victim: true },
        orderBy: { roundNumber: "asc" },
      },
    },
  });
}

export function listRecentMatches(take = 20) {
  return prisma.match.findMany({
    where: trackedMatchWhere(),
    take,
    orderBy: { playedAt: "desc" },
    include: {
      map: true,
      session: true,
      playerStats: {
        where: {
          player: trackedPlayerWhere(),
        },
        include: { player: true },
        orderBy: { rating: "desc" },
      },
    },
  });
}

export interface CreateMatchPlayerStatInput {
  playerId: string;
  team: MatchTeam;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  adr: number;
  rating: number;
  kast: number;
  impact: number;
  entryKills: number;
  entryDeaths: number;
  tradeKills: number;
  clutch1v1Attempts: number;
  clutch1v1Wins: number;
  clutch1v2Attempts: number;
  clutch1v2Wins: number;
  clutch1v3Attempts: number;
  clutch1v3Wins: number;
  clutch1v4Attempts: number;
  clutch1v4Wins: number;
  clutch1v5Attempts: number;
  clutch1v5Wins: number;
  eloBefore: number;
  eloAfter: number;
  levelGc?: number | null;
  clutchesWon: number;
  flashAssists: number;
}

export interface CreateMatchEventInput {
  playerId: string;
  victimId?: string | null;
  type: EventType;
  roundNumber: number;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateMatchInput {
  sessionId: string;
  mapId: string;
  gamersClubMatchId?: string | null;
  playedAt: Date;
  scoreTeamA: number;
  scoreTeamB: number;
  durationSeconds: number;
  /** Quantos jogadores monitorados ativos participaram — ver matchClassification.ts. */
  trackedPlayersCount: number;
  playerStats: CreateMatchPlayerStatInput[];
  events: CreateMatchEventInput[];
  demoUrl?: string | null;
}

/**
 * Persiste uma partida completa (stats + eventos) em uma única transação. Recebe dados
 * já totalmente computados (rating, elo) pelas engines de domínio no Service — este
 * repository não decide nada, só grava atomicamente.
 */
export function createMatchWithStats(input: CreateMatchInput) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        sessionId: input.sessionId,
        mapId: input.mapId,
        gamersClubMatchId: input.gamersClubMatchId,
        playedAt: input.playedAt,
        scoreTeamA: input.scoreTeamA,
        scoreTeamB: input.scoreTeamB,
        durationSeconds: input.durationSeconds,
        trackedPlayersCount: input.trackedPlayersCount,
        demoUrl: input.demoUrl ?? null,
      },
    });

    await tx.playerMatchStats.createMany({
      data: input.playerStats.map((stat) => ({ ...stat, matchId: match.id })),
    });

    if (input.events.length > 0) {
      await tx.event.createMany({
        data: input.events.map((event) => ({ ...event, matchId: match.id })),
      });
    }

    return match;
  });
}

export function findMatchDetailsById(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      map: true,
      session: true,
      playerStats: {
        include: {
          player: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              steamId: true,
              trackedPlayer: { select: { active: true } },
            },
          },
        },
        orderBy: { rating: "desc" },
      },
      events: {
        include: {
          player: { select: { nickname: true } },
          victim: { select: { nickname: true } },
        },
        orderBy: { roundNumber: "asc" },
      },
    },
  });
}
