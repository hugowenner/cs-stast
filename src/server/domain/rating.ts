/**
 * Rating e Impact não são fornecidos pela Gamers Club — são calculados aqui a partir de
 * estatísticas primárias (kills, deaths, assists, KAST, ADR, rounds). A fórmula usada é a
 * aproximação pública e amplamente documentada pela comunidade de CS para o HLTV Rating 2.0
 * (não é o cálculo proprietário exato da HLTV, apenas uma aproximação de código aberto).
 */
export interface RatingInput {
  kills: number;
  deaths: number;
  assists: number;
  kast: number; // percentual, 0-100
  adr: number;
  roundsPlayed: number;
}

export interface RatingResult {
  impact: number;
  rating: number;
}

export function calculateRating(input: RatingInput): RatingResult {
  const rounds = Math.max(input.roundsPlayed, 1);
  const kpr = input.kills / rounds;
  const dpr = input.deaths / rounds;
  const apr = input.assists / rounds;

  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
  const rating =
    0.0073 * input.kast +
    0.3591 * kpr -
    0.5329 * dpr +
    0.2372 * impact +
    0.0032 * input.adr +
    0.1587;

  return {
    impact: roundTo(impact, 2),
    rating: roundTo(rating, 2),
  };
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
