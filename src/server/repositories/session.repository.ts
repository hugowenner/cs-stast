import { prisma } from "@/server/db";
import { trackedMatchWhere, trackedPlayerWhere, trackedSessionWhere } from "./player.repository";

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

export function listSessions(params: { skip?: number; take?: number } = {}) {
  return prisma.session.findMany({
    where: trackedSessionWhere(),
    skip: params.skip,
    take: params.take ?? 20,
    orderBy: { date: "desc" },
  });
}

export function countSessions() {
  return prisma.session.count({
    where: trackedSessionWhere(),
  });
}

export function getLatestSession() {
  return prisma.session.findFirst({
    where: trackedSessionWhere(),
    orderBy: { date: "desc" },
  });
}

export function findSessionById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      matches: {
        where: trackedMatchWhere(),
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
