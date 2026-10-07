/**
 * Núcleo Matemático do Score da Temporada (CS2 Stats)
 * 
 * Implementa o modelo estatístico auditado e congelado na Etapa 3.5:
 * S = RHat + lambda * (pHat - p0)
 * RHat = R0 + (N / (N + h)) * (R - R0)
 * pHat = (W + k * p0) / (N + k)
 * 
 * Regra de Borda (N = 0):
 * Retorna neutralidade exata: score = 1.000, rHat = 1.000, pHat = 0.500, confidenceStatus = 'PROVISIONAL'
 */

export const MIN_RANKING_MATCHES = 10;

export const SEASON_SCORE_CONSTANTS = {
  RATING_NEUTRAL: 1.000,
  WR_NEUTRAL: 0.500,
  WR_PRIOR_STRENGTH: 10,   // k = 10
  RATING_SHRINKAGE: 10,    // h = 10
  WIN_RATE_WEIGHT: 0.15,   // lambda = 0.15
  MIN_RANKING_MATCHES,      // N >= 10 => Elegível para o ranking oficial
  CONFIDENCE_THRESHOLDS: {
    PROVISIONAL_MAX_N: 9,  // N < 10 => PROVISIONAL (Não elegível ao ranking oficial)
    MEDIUM_MAX_N: 24,       // 10 <= N < 25 => MEDIUM
    // N >= 25 => HIGH
  },
} as const;

export type ConfidenceStatus = "PROVISIONAL" | "MEDIUM" | "HIGH";

export function isEligibleForOfficialRanking(n: number): boolean {
  return typeof n === "number" && !isNaN(n) && n >= MIN_RANKING_MATCHES;
}

export interface PlayerScoreResult {
  score: number;
  rHat: number;
  pHat: number;
  confidenceStatus: ConfidenceStatus;
}

/**
 * Calcula o Score da Temporada para um jogador.
 * 
 * @param n Número de partidas elegíveis (N >= 0)
 * @param w Soma dos pontos de vitória/empate (W >= 0, W <= N)
 * @param r HLTV Rating médio simples (R > 0)
 * @param k Força do prior de WR (padrão: 10)
 * @param h Constante de shrinkage do Rating (padrão: 10)
 * @param lambda Peso do Win Rate (padrão: 0.15)
 */
export function calculatePlayerScore(
  n: number,
  w: number,
  r: number,
  k: number = SEASON_SCORE_CONSTANTS.WR_PRIOR_STRENGTH,
  h: number = SEASON_SCORE_CONSTANTS.RATING_SHRINKAGE,
  lambda: number = SEASON_SCORE_CONSTANTS.WIN_RATE_WEIGHT
): PlayerScoreResult {
  // Trata dados ausentes, nulos, NaN, Infinito ou N <= 0 (Borda auditada)
  if (
    typeof n !== "number" ||
    typeof w !== "number" ||
    typeof r !== "number" ||
    isNaN(n) ||
    isNaN(w) ||
    isNaN(r) ||
    !isFinite(n) ||
    !isFinite(w) ||
    !isFinite(r) ||
    n <= 0 ||
    r <= 0
  ) {
    return {
      score: SEASON_SCORE_CONSTANTS.RATING_NEUTRAL,
      rHat: SEASON_SCORE_CONSTANTS.RATING_NEUTRAL,
      pHat: SEASON_SCORE_CONSTANTS.WR_NEUTRAL,
      confidenceStatus: "PROVISIONAL",
    };
  }

  // Sanitiza N e W em limites válidos de software
  const safeN = Math.max(0, n);
  const safeW = Math.max(0, Math.min(w, safeN));

  const R0 = SEASON_SCORE_CONSTANTS.RATING_NEUTRAL;
  const p0 = SEASON_SCORE_CONSTANTS.WR_NEUTRAL;

  // 1. Rating ajustado por Shrinkage
  const rHat = R0 + (safeN / (safeN + h)) * (r - R0);

  // 2. Win Rate suavizado por Prior Bayesiano
  const pHat = (safeW + k * p0) / (safeN + k);

  // 3. Score Combinado
  const score = rHat + lambda * (pHat - p0);

  // 4. Status de Confiança
  let confidenceStatus: ConfidenceStatus = "PROVISIONAL";
  if (safeN >= 25) {
    confidenceStatus = "HIGH";
  } else if (safeN >= 10) {
    confidenceStatus = "MEDIUM";
  }

  return {
    score: roundTo(score, 3),
    rHat: roundTo(rHat, 3),
    pHat: roundTo(pHat, 3),
    confidenceStatus,
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
