import { prisma } from "@/server/db";
import { trackedPlayerStatsWhere } from "./player.repository";
import { communityMatchWhere } from "@/server/domain/matchClassification";

export function listPlayerAchievements(playerId: string) {
  return prisma.playerAchievement.findMany({
    where: { playerId },
    include: { achievement: true, match: { include: { map: true } } },
    orderBy: { earnedAt: "desc" },
  });
}

/**
 * Feed de "Conquistas Recentes" do Dashboard — métrica coletiva. Conquistas cumulativas
 * (matchId nulo, ex: "1000 Kills") não têm uma partida específica pra checar e sempre
 * aparecem; conquistas por partida (Ace, Clutch etc.) só aparecem se a partida em que
 * foram concedidas for COMUNIDADE (ver domain/matchClassification.ts).
 */
export function listRecentAchievements(take = 20) {
  return prisma.playerAchievement.findMany({
    where: {
      ...trackedPlayerStatsWhere(),
      OR: [{ matchId: null }, { match: communityMatchWhere() }],
    },
    take,
    orderBy: { earnedAt: "desc" },
    include: { achievement: true, player: true, match: { include: { map: true } } },
  });
}

export function hasCumulativeAchievement(playerId: string, achievementId: string) {
  return prisma.playerAchievement.findFirst({
    where: { playerId, achievementId, matchId: null },
  });
}

export interface NewPlayerAchievement {
  playerId: string;
  achievementId: string;
  matchId?: string | null;
}

/**
 * Sem `skipDuplicates` de propósito: não é suportado no SQLite (usado no modo demo,
 * ver docs/DEMO.md), e não é necessário no Postgres — os invariantes de quem chama
 * (achievement.service.ts) já garantem que uma única chamada nunca contém duplicatas
 * reais (cumulativas são filtradas antes via hasCumulativeAchievement; por partida,
 * cada código só pode ser emitido uma vez por jogador dentro de evaluateMatchAchievements).
 * Se esse invariante for violado algum dia, prefira o erro de constraint único ao
 * silêncio de um skipDuplicates.
 */
export function createPlayerAchievements(entries: NewPlayerAchievement[]) {
  if (entries.length === 0) return Promise.resolve({ count: 0 });
  return prisma.playerAchievement.createMany({ data: entries });
}
