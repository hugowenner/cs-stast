import * as achievementRepo from "@/server/repositories/achievement.repository";
import * as playerAchievementRepo from "@/server/repositories/playerAchievement.repository";
import * as playerRepo from "@/server/repositories/player.repository";
import type { AchievementGrant } from "@/server/domain/achievements";
import { ACHIEVEMENT_CATALOG } from "@/server/domain/achievementCatalog";

export function listCatalog() {
  return achievementRepo.listAchievementCatalog();
}

export function listRecent(take?: number, seasonId?: string) {
  return playerAchievementRepo.listRecentAchievements(take, seasonId);
}

export type RecentUnlock = Awaited<ReturnType<typeof playerAchievementRepo.listRecentAchievements>>[number];

export type AchievementsPageStats = {
  totalInCatalog: number;
  totalUnlocks: number;
  topCollector: { player: { id: string; nickname: string; avatarUrl: string | null }; count: number } | null;
  rarestEntry: (typeof ACHIEVEMENT_CATALOG)[number] & { unlockCount: number } | null;
  unlockCountByCode: Map<string, number>;
  recentUnlocks: RecentUnlock[];
};

export async function getPageStats(): Promise<AchievementsPageStats> {
  const [stats, dbCatalog, recentUnlocks] = await Promise.all([
    playerAchievementRepo.getAchievementsStats(),
    achievementRepo.listAchievementCatalog(),
    playerAchievementRepo.listRecentAchievements(40),
  ]);

  const { countByAchievementId, countByPlayerId, totalUnlocks } = stats;

  // achievementId → código → unlock count
  const unlockCountByCode = new Map<string, number>();
  for (const { id, code } of dbCatalog) {
    unlockCountByCode.set(code, countByAchievementId.get(id) ?? 0);
  }

  // Conquista mais rara: menor unlock count > 0 no catálogo
  let rarestEntry: AchievementsPageStats["rarestEntry"] = null;
  let rarestCount = Infinity;
  for (const entry of ACHIEVEMENT_CATALOG) {
    const count = unlockCountByCode.get(entry.code) ?? 0;
    if (count > 0 && count < rarestCount) {
      rarestCount = count;
      rarestEntry = { ...entry, unlockCount: count };
    }
  }

  // Maior colecionador: jogador com mais conquistas distintas
  let topCollector: AchievementsPageStats["topCollector"] = null;
  let topPlayerId: string | null = null;
  let topPlayerCount = 0;
  for (const [playerId, count] of countByPlayerId) {
    if (count > topPlayerCount) {
      topPlayerCount = count;
      topPlayerId = playerId;
    }
  }
  if (topPlayerId) {
    const player = await playerRepo.findPlayerBasicById(topPlayerId);
    if (player) topCollector = { player, count: topPlayerCount };
  }

  return {
    totalInCatalog: ACHIEVEMENT_CATALOG.length,
    totalUnlocks,
    topCollector,
    rarestEntry,
    unlockCountByCode,
    recentUnlocks,
  };
}

/**
 * Persiste os grants emitidos pelo AchievementEngine. Conquistas por partida (matchId
 * definido) podem se repetir livremente (novo clutch a cada partida). Conquistas
 * cumulativas (matchId nulo) só podem ser concedidas uma vez por jogador — checagem
 * feita aqui porque o índice parcial do banco não é visível para o Prisma Client
 * (ver prisma/README.md), então o dedupe fica explícito no Service.
 */
export async function grantAchievements(grants: AchievementGrant[]) {
  if (grants.length === 0) return;

  const catalogCache = new Map<string, string>(); // code -> achievementId
  const toCreate: playerAchievementRepo.NewPlayerAchievement[] = [];

  for (const grant of grants) {
    let achievementId = catalogCache.get(grant.code);
    if (!achievementId) {
      const achievement = await achievementRepo.findAchievementByCode(grant.code);
      if (!achievement) continue; // catálogo não semeado ainda — ignora silenciosamente
      achievementId = achievement.id;
      catalogCache.set(grant.code, achievementId);
    }

    if (grant.matchId === null) {
      const existing = await playerAchievementRepo.hasCumulativeAchievement(
        grant.playerId,
        achievementId,
      );
      if (existing) continue;
    }

    toCreate.push({ playerId: grant.playerId, achievementId, matchId: grant.matchId });
  }

  await playerAchievementRepo.createPlayerAchievements(toCreate);
}
