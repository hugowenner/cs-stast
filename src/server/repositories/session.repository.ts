import { prisma } from "@/server/db";
import { trackedPlayerWhere } from "./player.repository";
import { communityMatchWhere } from "@/server/domain/matchClassification";

export function communitySessionWhere() {
  return {
    matches: {
      some: communityMatchWhere(),
    },
  };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Sessões não têm um id externo da Gamers Club — o agrupamento em uma "noite de jogo"
 * é inferido pela data (UTC) da partida. Uma partida em 2026-07-16 sempre cai na sessão
 * criada para esse dia, seja ela nova ou já existente.
 */
export async function findOrCreateSessionForDate(playedAt: Date) {
  const day = startOfUtcDay(playedAt);
  const existing = await prisma.session.findFirst({ where: { date: day } });
  if (existing) return existing;

  const label = day.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return prisma.session.create({
    data: { name: `Sessão de ${label}`, date: day },
  });
}

export function renameSession(id: string, name: string) {
  return prisma.session.update({ where: { id }, data: { name } });
}

export function listSessions(params: { skip?: number; take?: number; where?: any } = {}) {
  return prisma.session.findMany({
    where: {
      ...communitySessionWhere(),
      ...(params.where || {}),
    },
    select: {
      id: true,
      name: true,
      date: true,
      createdAt: true,
      matches: {
        where: communityMatchWhere(),
        select: {
          id: true,
          playedAt: true,
          scoreTeamA: true,
          scoreTeamB: true,
          map: {
            select: {
              name: true,
            },
          },
          playerStats: {
            where: {
              player: trackedPlayerWhere(),
            },
            select: {
              rating: true,
              kills: true,
              headshots: true,
              adr: true,
              eloBefore: true,
              eloAfter: true,
              team: true,
              playerId: true,
              player: {
                select: {
                  id: true,
                  nickname: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { playedAt: "asc" },
      },
    },
    skip: params.skip,
    take: params.take ?? 20,
    orderBy: { date: "desc" },
  });
}

export function countSessions() {
  return prisma.session.count({
    where: communitySessionWhere(),
  });
}

export function getLatestSession() {
  return prisma.session.findFirst({
    where: communitySessionWhere(),
    orderBy: { date: "desc" },
  });
}

export function findSessionById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      matches: {
        where: communityMatchWhere(),
        include: {
          map: true,
          playerStats: {
            where: {
              player: trackedPlayerWhere(),
            },
            include: {
              player: {
                select: {
                  id: true,
                  nickname: true,
                  avatarUrl: true,
                  trackedPlayer: { select: { active: true } },
                },
              },
            },
          },
        },
        orderBy: { playedAt: "asc" },
      },
    },
  });
}
