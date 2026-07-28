/**
 * Calcula a confiança de uma métrica estatística (como winrate) baseada no volume de partidas.
 * Evita o viés de amostras pequenas (ex: 6 jogos com 100% WR vencendo de 40 jogos com 75% WR).
 *
 * Fórmula: Confidence = Winrate (decimal) * (1 - e^(-0.1 * N))
 *
 * @param winrate Taxa de vitória em decimal (0.0 a 1.0)
 * @param games Número de partidas (N)
 * @returns Confiança em escala decimal (0.0 a 1.0)
 */
export function calculateConfidence(winrate: number, games: number): number {
  if (games <= 0) return 0;
  const factor = 1 - Math.exp(-0.1 * games);
  return winrate * factor;
}

/**
 * Calcula a prioridade final de um Highlight combinando confiança, fator de impacto e recência.
 *
 * @param baseScore Pontuação base da categoria de destaque (0 a 100)
 * @param confidence Confiança calculada em escala decimal (0.0 a 1.0)
 * @param impactFactor Multiplicador de impacto (ex: 1.0 a 1.5)
 * @param recencyFactor Multiplicador de recência (ex: 1.0 para recente, 0.8 para histórico)
 * @returns Score de prioridade de 0 a 100
 */
export function calculateHighlightScore(
  baseScore: number,
  confidence: number,
  impactFactor: number = 1.0,
  recencyFactor: number = 1.0
): number {
  const score = baseScore * confidence * impactFactor * recencyFactor;
  return Math.min(100, Math.max(0, Math.round(score)));
}
