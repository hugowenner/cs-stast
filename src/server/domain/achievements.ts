import { ACHIEVEMENT_CODES, type AchievementCode } from "@/server/domain/achievementCatalog";

/**
 * Avalia as regras de conquista para todos os jogadores de uma partida já encerrada.
 * Função pura: recebe os dados já calculados (stats da partida + totais de carreira
 * incluindo esta partida) e devolve candidatos a conquista. Não decide se a conquista
 * já foi concedida antes — isso é responsabilidade do Service (dedupe contra o banco),
 * já que conquistas cumulativas (matchId nulo) não podem ser resolvidas sem consultar
 * o histórico do jogador.
 */
export interface PlayerMatchAchievementInput {
  playerId: string;
  entryKills: number;
  headshots: number;
  clutchWinsByTier: Record<1 | 2 | 3 | 4 | 5, number>;
  hadAce: boolean;
  hadFiveK: boolean;
  careerMatchesPlayed: number;
  careerKills: number;
  careerHeadshots: number;
}

export interface AchievementGrant {
  playerId: string;
  code: AchievementCode;
  /** null = conquista cumulativa (única por jogador); string = conquista da partida. */
  matchId: string | null;
}

export function evaluateMatchAchievements(
  matchId: string,
  players: PlayerMatchAchievementInput[],
): AchievementGrant[] {
  const grants: AchievementGrant[] = [];

  for (const player of players) {
    if (player.hadAce) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.ACE, matchId });
    }
    if (player.hadFiveK) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.FIVE_K, matchId });
    }
    for (const tier of [1, 2, 3, 4, 5] as const) {
      if (player.clutchWinsByTier[tier] > 0) {
        grants.push({ playerId: player.playerId, code: CLUTCH_CODE_BY_TIER[tier], matchId });
      }
    }
    if (player.careerMatchesPlayed >= 100) {
      grants.push({
        playerId: player.playerId,
        code: ACHIEVEMENT_CODES.MATCHES_100,
        matchId: null,
      });
    }
    if (player.careerHeadshots >= 500) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.HS_500, matchId: null });
    }
    if (player.careerKills >= 1000) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.KILLS_1000, matchId: null });
    }
  }

  const entryKing = maxBy(players, (p) => p.entryKills);
  if (entryKing && entryKing.entryKills > 0) {
    grants.push({
      playerId: entryKing.playerId,
      code: ACHIEVEMENT_CODES.ENTRY_KING_MATCH,
      matchId,
    });
  }

  const hsMachine = maxBy(players, (p) => p.headshots);
  if (hsMachine && hsMachine.headshots > 0) {
    grants.push({
      playerId: hsMachine.playerId,
      code: ACHIEVEMENT_CODES.HS_MACHINE_MATCH,
      matchId,
    });
  }

  return grants;
}

const CLUTCH_CODE_BY_TIER: Record<1 | 2 | 3 | 4 | 5, AchievementCode> = {
  1: ACHIEVEMENT_CODES.CLUTCH_1V1,
  2: ACHIEVEMENT_CODES.CLUTCH_1V2,
  3: ACHIEVEMENT_CODES.CLUTCH_1V3,
  4: ACHIEVEMENT_CODES.CLUTCH_1V4,
  5: ACHIEVEMENT_CODES.CLUTCH_1V5,
};

function maxBy<T>(items: T[], score: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (best === undefined || score(item) > score(best)) return item;
    return best;
  }, undefined);
}
