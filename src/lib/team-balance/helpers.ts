import { RNG, randomInt } from "./rng";
import { PlayerData } from "./types";

/**
 * Fisher-Yates Shuffle determinístico.
 * Embaralha um array com base em um gerador RNG fornecido.
 */
export function fisherYatesShuffle<T>(arr: T[], rng: RNG): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Valida a lista de jogadores de entrada. Deve ter exatamente 10 jogadores com nomes.
 */
export function validatePlayers(players: PlayerData[]): void {
  if (players.length !== 10) {
    throw new Error("É necessário exatamente 10 jogadores.");
  }
  
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p.name || !p.name.trim()) {
      throw new Error(`Jogador ${i + 1} deve ter um nome válido.`);
    }
  }
}
