import { describe, it, expect } from "vitest";
import { calculateWeightedAdr } from "./adr";

describe("calculateWeightedAdr", () => {
  it("calcula corretamente a média ponderada por rounds com dano bruto real", () => {
    // Exemplo do prompt:
    // Partida A: 1.000 de dano em 10 rounds (ADR individual = 100)
    // Partida B: 3.000 de dano em 20 rounds (ADR individual = 150)
    // Média simples = (100 + 150) / 2 = 125,00 (incorreta)
    // Média ponderada = (1000 + 3000) / (10 + 20) = 4000 / 30 = 133,333... (correta)
    const stats = [
      { damage: 1000, adr: 100, roundsPlayed: 10 },
      { damage: 3000, adr: 150, roundsPlayed: 20 },
    ];

    const result = calculateWeightedAdr(stats);
    expect(result).toBeCloseTo(133.333, 3);
  });

  it("calcula corretamente quando os rounds vêm de match.scoreTeamA + scoreTeamB", () => {
    const stats = [
      { damage: 1000, adr: 100, match: { scoreTeamA: 6, scoreTeamB: 4 } }, // 10 rounds
      { damage: 3000, adr: 150, match: { scoreTeamA: 13, scoreTeamB: 7 } }, // 20 rounds
    ];

    const result = calculateWeightedAdr(stats);
    expect(result).toBeCloseTo(133.333, 3);
  });

  it("reconstrói o dano a partir do ADR quando damage for nulo ou indefinido", () => {
    const stats = [
      { damage: null, adr: 100, match: { scoreTeamA: 6, scoreTeamB: 4 } }, // 100 * 10 = 1000 de dano inferido
      { damage: undefined, adr: 150, match: { scoreTeamA: 13, scoreTeamB: 7 } }, // 150 * 20 = 3000 de dano inferido
    ];

    const result = calculateWeightedAdr(stats);
    expect(result).toBeCloseTo(133.333, 3);
  });

  it("ignora partidas com 0 rounds ou dados inválidos sem distorcer o agregado", () => {
    const stats = [
      { damage: 0, adr: 0, roundsPlayed: 0 },
      { damage: 500, adr: 50, roundsPlayed: 10 },
    ];

    const result = calculateWeightedAdr(stats);
    expect(result).toBe(50); // 500 / 10 = 50
  });

  it("retorna 0 para array vazio ou partidas com 0 rounds totais (prevenção contra divisão por zero)", () => {
    expect(calculateWeightedAdr([])).toBe(0);
    expect(calculateWeightedAdr([{ damage: 0, adr: 0, roundsPlayed: 0 }])).toBe(0);
  });
});
