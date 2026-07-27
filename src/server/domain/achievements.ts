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
  entryDeaths: number;
  tradeKills: number;
  headshots: number;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  rating: number;
  impact: number;
  kast: number;
  /** Total de rounds da partida (scoreTeamA + scoreTeamB) — usado por Barata. */
  totalRounds: number;
  /** Se o time do jogador venceu a partida — usado por Sangue Frio. */
  wonMatch: boolean;
  clutchWinsByTier: Record<1 | 2 | 3 | 4 | 5, number>;
  hadAce: boolean;
  hadMultiKill3: boolean;
  hadMultiKill4: boolean;
  careerMatchesPlayed: number;
  careerKills: number;
  careerHeadshots: number;
  careerEntryKills: number;
  careerClutchWins: number;
  careerAssists: number;
  /** Rating médio de carreira já incluindo esta partida. */
  careerAvgRating: number;
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
    // ─── Combate ──────────────────────────────────────────────────────────────
    if (player.hadAce) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.ACE, matchId });
    }
    if (player.hadMultiKill4) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.MULTI_KILL_4, matchId });
    } else if (player.hadMultiKill3) {
      // Quad já cobre o feito maior — evita conceder Triple e Quad na mesma partida.
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.MULTI_KILL_3, matchId });
    }
    if (player.entryKills >= 3 && player.entryKills > player.entryDeaths) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.OPENING_DUELIST_MATCH, matchId });
    }
    if (player.tradeKills >= 3) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.TRADER_MATCH, matchId });
    }
    if (player.adr >= 100) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.DAMAGE_DEALER_MATCH, matchId });
    }
    if (player.headshots >= 15 && player.kills > 0 && player.headshots / player.kills >= 0.6) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.SHARP_SHOOTER_MATCH, matchId });
    }
    if (player.totalRounds > 0 && 1 - player.deaths / player.totalRounds >= 0.7) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.SURVIVOR_MATCH, matchId });
    }
    if (player.assists >= 8 && player.assists > player.kills) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.SUPPORT_MATCH, matchId });
    }
    if (player.impact >= 2.0) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.HIGH_IMPACT_MATCH, matchId });
    }

    // ─── Clutch ───────────────────────────────────────────────────────────────
    for (const tier of [1, 2, 3, 4, 5] as const) {
      if (player.clutchWinsByTier[tier] > 0) {
        grants.push({ playerId: player.playerId, code: CLUTCH_CODE_BY_TIER[tier], matchId });
      }
    }
    if (player.kast >= 90) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.WALL_MATCH, matchId });
    }
    if (player.deaths === 0 && player.kills >= 5) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.UNTOUCHABLE_MATCH, matchId });
    }
    if (player.rating >= 1.8) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.CARRY_MATCH, matchId });
    }

    const clutchWinsThisMatch = Object.values(player.clutchWinsByTier).reduce((s, w) => s + w, 0);
    if (clutchWinsThisMatch > 0 && !player.wonMatch) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.COLD_BLOOD_MATCH, matchId });
    }

    // ─── Carreira — progressão de partidas ────────────────────────────────────
    if (player.careerMatchesPlayed >= 10) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.MATCHES_10, matchId: null });
    }
    if (player.careerMatchesPlayed >= 50) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.MATCHES_50, matchId: null });
    }
    if (player.careerMatchesPlayed >= 100) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.MATCHES_100, matchId: null });
    }

    // ─── Carreira — progressão de kills ───────────────────────────────────────
    if (player.careerKills >= 250) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.KILLS_250, matchId: null });
    }
    if (player.careerKills >= 500) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.KILLS_500, matchId: null });
    }
    if (player.careerKills >= 1000) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.KILLS_1000, matchId: null });
    }

    // ─── Carreira — progressão de headshots ───────────────────────────────────
    if (player.careerHeadshots >= 100) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.HS_100, matchId: null });
    }
    if (player.careerHeadshots >= 500) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.HS_500, matchId: null });
    }

    // ─── Carreira — especialização ────────────────────────────────────────────
    if (player.careerEntryKills >= 250) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.ENTRY_FRAGGER_CAREER, matchId: null });
    }
    if (player.careerClutchWins >= 15) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.CLUTCH_MASTER_CAREER, matchId: null });
    }
    if (player.careerAssists >= 500) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.TEAM_PLAYER_CAREER, matchId: null });
    }
    if (player.careerMatchesPlayed >= 20 && player.careerAvgRating >= 1.05) {
      grants.push({ playerId: player.playerId, code: ACHIEVEMENT_CODES.CONSISTENCY_CAREER, matchId: null });
    }
  }

  // ─── Conquistas relativas à partida (comparação entre jogadores) ───────────

  // Abridor de Lata — mais entry kills da partida, mínimo 3
  const entryKing = maxBy(players, (p) => p.entryKills);
  if (entryKing && entryKing.entryKills >= 3) {
    grants.push({ playerId: entryKing.playerId, code: ACHIEVEMENT_CODES.ENTRY_KING_MATCH, matchId });
  }

  // One Tap — mais headshots da partida, mínimo 8
  const hsMachine = maxBy(players, (p) => p.headshots);
  if (hsMachine && hsMachine.headshots >= 8) {
    grants.push({ playerId: hsMachine.playerId, code: ACHIEVEMENT_CODES.HS_MACHINE_MATCH, matchId });
  }

  // Dono do Lobby — maior rating da partida, apenas quando há pelo menos 2 jogadores
  // monitorados (partida COMUNIDADE — comparação sem sentido com 1 jogador).
  if (players.length >= 2) {
    const mvp = maxBy(players, (p) => p.rating);
    if (mvp && mvp.rating > 0) {
      grants.push({ playerId: mvp.playerId, code: ACHIEVEMENT_CODES.MVP_MATCH, matchId });
    }
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
