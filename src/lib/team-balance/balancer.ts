import { PlayerData, BalancedTeamResult, GameMode, BalanceMetric } from "./types";
import { RNG } from "./rng";
import { getPlayerWeight } from "./metrics";
import { fisherYatesShuffle, validatePlayers } from "./helpers";

/**
 * Calcula a soma dos pesos de uma equipe para a métrica selecionada.
 */
function calculateSum(players: PlayerData[], metric: BalanceMetric): number {
  return players.reduce((sum, p) => sum + getPlayerWeight(p, metric), 0);
}

/**
 * Modo RANDOM PURO (🎲) - Distribuição aleatória determinística (Fisher-Yates).
 */
export function randomBalance(
  players: PlayerData[], 
  metric: BalanceMetric, 
  rng: RNG
): BalancedTeamResult {
  const shuffled = fisherYatesShuffle(players, rng);
  
  const ct = shuffled.slice(0, 5);
  const tr = shuffled.slice(5);
  
  const ctSum = calculateSum(ct, metric);
  const trSum = calculateSum(tr, metric);
  const total = ctSum + trSum;
  
  return {
    ct,
    tr,
    ctSum: Number(ctSum.toFixed(3)),
    trSum: Number(trSum.toFixed(3)),
    diff: Number(Math.abs(ctSum - trSum).toFixed(3)),
    total: Number(total.toFixed(3))
  };
}

/**
 * Modo BALANCEADO (⚖️) - Algoritmo heurístico determinístico.
 * Procura minimizar a diferença de força entre os dois times em até 800 tentativas.
 */
export function balancedTeams(
  players: PlayerData[],
  metric: BalanceMetric,
  rng: RNG,
  maxTries: number = 800
): BalancedTeamResult {
  let best: BalancedTeamResult | null = null;
  let bestDiff = Infinity;
  
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const shuffled = fisherYatesShuffle(players, rng);
    
    const ct = shuffled.slice(0, 5);
    const tr = shuffled.slice(5);
    
    const ctSum = calculateSum(ct, metric);
    const trSum = calculateSum(tr, metric);
    const diff = Math.abs(ctSum - trSum);
    
    if (diff < bestDiff) {
      bestDiff = diff;
      best = {
        ct,
        tr,
        ctSum: Number(ctSum.toFixed(3)),
        trSum: Number(trSum.toFixed(3)),
        diff: Number(diff.toFixed(3)),
        total: Number((ctSum + trSum).toFixed(3))
      };
      
      // Early exit se o equilíbrio for perfeito (diferença nula)
      if (diff === 0) break;
    }
  }
  
  return best!;
}

/**
 * Geração principal de times CT e TR.
 * Valida a lista de jogadores e aplica o modo de sorteio configurado.
 */
export function generateTeams(
  players: PlayerData[],
  mode: GameMode,
  metric: BalanceMetric,
  rng: RNG
): BalancedTeamResult {
  validatePlayers(players);
  
  if (mode === "RANDOM") {
    return randomBalance(players, metric, rng);
  }
  
  return balancedTeams(players, metric, rng);
}
