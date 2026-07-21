import * as achievementRepo from "@/server/repositories/achievement.repository";
import * as playerAchievementRepo from "@/server/repositories/playerAchievement.repository";
import type { AchievementGrant } from "@/server/domain/achievements";

export function listCatalog() {
  return achievementRepo.listAchievementCatalog();
}

export function listRecent(take?: number) {
  return playerAchievementRepo.listRecentAchievements(take);
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
