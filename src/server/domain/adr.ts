/**
 * Cálculo de ADR (Average Damage per Round) agregado ponderado por rounds válidos.
 * 
 * Regra Matemática:
 * ADR Agregado = (Soma do dano válido de todas as partidas) / (Soma dos rounds válidos de todas as partidas)
 * 
 * Priorização de Fontes de Dados:
 * 1. Prioriza o dano total real (s.damage) quando disponível (ex: enriquecimento de demo).
 * 2. Se s.damage for nulo (ex: partidas sincronizadas apenas com metadados básicos da GC que
 *    já traziam o ADR pré-calculado pela plataforma), reconstrói o dano como:
 *    danoEstimado = s.adr * roundsDaPartida
 *    (Nota técnica: há perda insignificante de precisão decimal proveniente do arredondamento
 *    original do ADR pela GC, devidamente tolerada como fallback seguro).
 * 
 * Tratamento de Casos Especiais:
 * - Partidas com 0 rounds ou sem placar válido são ignoradas na soma para evitar distorções.
 * - Se a soma total de rounds válidos for 0, retorna 0 (prevenção absoluta contra divisão por zero).
 */

export interface MatchStatForAdr {
  damage?: number | null;
  adr: number;
  match?: {
    scoreTeamA: number;
    scoreTeamB: number;
  } | null;
  roundsPlayed?: number | null;
}

export function calculateWeightedAdr(stats: MatchStatForAdr[]): number {
  let totalDamage = 0;
  let totalRounds = 0;

  for (const s of stats) {
    // Determina os rounds válidos da partida
    const rounds = s.roundsPlayed ?? ((s.match?.scoreTeamA ?? 0) + (s.match?.scoreTeamB ?? 0));
    if (rounds <= 0) continue;

    // Prioriza o dano bruto real; caso ausente, infere pelo ADR da partida * rounds
    const damage = s.damage != null ? s.damage : s.adr * rounds;
    totalDamage += damage;
    totalRounds += rounds;
  }

  if (totalRounds <= 0) return 0;
  return totalDamage / totalRounds;
}
