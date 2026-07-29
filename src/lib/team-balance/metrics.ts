import { PlayerData, BalanceMetric } from "./types";

/**
 * Retorna o peso/calibração de força do jogador baseado na métrica selecionada.
 * Suporta valores decimais e pesos compostos inteligentes.
 */
export function getPlayerWeight(player: PlayerData, metric: BalanceMetric): number {
  switch (metric) {
    case "LEVEL":
      // Nível GC (1-21)
      return player.levelGc || 1;
    case "RATING":
      // Rating da temporada ou geral (ex: 1.15)
      return player.rating || 1.0;
    case "ADR":
      // ADR da temporada (ex: 82.5)
      return player.adr || 75.0;
    case "KD":
      // Ratio K/D (ex: 1.05)
      return player.kd || 1.0;
    case "COMPOUND": {
      // Fórmula Inteligente: Peso Composto
      // 0.45 * Rating + 0.30 * (ADR/80) + 0.15 * K/D + 0.10 * (Winrate/50)
      const normRating = player.rating || 1.0;
      const normAdr = (player.adr || 75.0) / 80.0; // Normaliza em torno de 1.0 (média de ~80 ADR)
      const normKd = player.kd || 1.0;
      const normWinrate = (player.winrate || 50.0) / 50.0; // Normaliza em torno de 1.0 (média de ~50% winrate)
      
      const score = 0.45 * normRating + 0.30 * normAdr + 0.15 * normKd + 0.10 * normWinrate;
      return Number(score.toFixed(3));
    }
    default:
      return 1.0;
  }
}
