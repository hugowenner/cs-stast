import { prisma } from "@/server/db";
import type { EventType, MatchTeam, Prisma } from "@/generated/prisma";
import { trackedMatchWhere, trackedPlayerWhere } from "./player.repository";

export function findMatchByGamersClubId(gamersClubMatchId: string) {
  return prisma.match.findUnique({ where: { gamersClubMatchId } });
}

export function countMatches() {
  return prisma.match.count({
    where: trackedMatchWhere(),
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
  playerStats: CreateMatchPlayerStatInput[];
  events: CreateMatchEventInput[];
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
