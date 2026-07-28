import { describe, expect, it } from "vitest";
import { generateHighlights } from "./highlights.service";
import { calculateConfidence } from "./highlight.scoring";

describe("calculateConfidence", () => {
  it("computa a confiança no formato decimal de forma correta", () => {
    // Caso 1: 6 jogos, 100% winrate
    const confA = calculateConfidence(1.0, 6);
    expect(Number(confA.toFixed(4))).toBe(0.4512);

    // Caso 2: 16 jogos, 75% winrate
    const confB = calculateConfidence(0.75, 16);
    expect(Number(confB.toFixed(4))).toBe(0.5986);

    // Caso B (59.86%) deve vencer o Caso A (45.12%)
    expect(confB).toBeGreaterThan(confA);
  });
});

describe("generateHighlights", () => {
  it("vence a dupla de maior volume com winrate decente frente à dupla com 100% winrate e baixo volume", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 10 },
        { id: "p4", nickname: "Player 4", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [],
    };

    // Dupla A (p1 e p2): 6 jogos juntos, 6 vitórias (100% WR)
    const statsP1: any[] = [];
    const statsP2: any[] = [];
    for (let i = 1; i <= 6; i++) {
      statsP1.push({ matchId: `m_a_${i}`, playerId: "p1", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
      statsP2.push({ matchId: `m_a_${i}`, playerId: "p2", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
    }

    // Dupla B (p3 e p4): 16 jogos juntos, 12 vitórias, 4 derrotas (75% WR)
    const statsP3: any[] = [];
    const statsP4: any[] = [];
    for (let i = 1; i <= 12; i++) {
      statsP3.push({ matchId: `m_b_${i}`, playerId: "p3", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
      statsP4.push({ matchId: `m_b_${i}`, playerId: "p4", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
    }
    for (let i = 13; i <= 16; i++) {
      statsP3.push({ matchId: `m_b_${i}`, playerId: "p3", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
      statsP4.push({ matchId: `m_b_${i}`, playerId: "p4", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
    }

    dataset.statsByPlayer.set("p1", statsP1);
    dataset.statsByPlayer.set("p2", statsP2);
    dataset.statsByPlayer.set("p3", statsP3);
    dataset.statsByPlayer.set("p4", statsP4);

    // @ts-ignore
    const result = generateHighlights(dataset);

    // Filtrar apenas destaques de sinergia de dupla da temporada (BEST_DUO / DUO_SYNERGY de época)
    const bestDuos = result.filter(
      (h) => h.type === "DUO_SYNERGY" && h.subtitle === "Melhor parceria da temporada"
    );

    expect(bestDuos).toHaveLength(2);
    // A dupla B (p3 & p4) deve ter prioridade maior que a dupla A (p1 & p2)
    expect(bestDuos[0].players.map(p => p.id)).toContain("p3");
    expect(bestDuos[0].players.map(p => p.id)).toContain("p4");
    expect(bestDuos[1].players.map(p => p.id)).toContain("p1");
    expect(bestDuos[1].players.map(p => p.id)).toContain("p2");
    expect(bestDuos[0].priority).toBeGreaterThan(bestDuos[1].priority);
  });

  it("não deve dar prioridade máxima para volume extremo e winrate mediocre", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 10 },
        { id: "p4", nickname: "Player 4", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [],
    };

    // Dupla A: 16 jogos juntos, 12 vitórias, 4 derrotas (75% WR) -> Confiança = 0.5986 -> Prioridade = 48
    const statsP1: any[] = [];
    const statsP2: any[] = [];
    for (let i = 1; i <= 12; i++) {
      statsP1.push({ matchId: `m_a_${i}`, playerId: "p1", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
      statsP2.push({ matchId: `m_a_${i}`, playerId: "p2", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
    }
    for (let i = 13; i <= 16; i++) {
      statsP1.push({ matchId: `m_a_${i}`, playerId: "p1", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
      statsP2.push({ matchId: `m_a_${i}`, playerId: "p2", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
    }

    // Dupla B: 100 jogos juntos, 55 vitórias, 45 derrotas (55% WR) -> Confiança = 0.5499 -> Prioridade = 44
    const statsP3: any[] = [];
    const statsP4: any[] = [];
    for (let i = 1; i <= 55; i++) {
      statsP3.push({ matchId: `m_b_${i}`, playerId: "p3", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
      statsP4.push({ matchId: `m_b_${i}`, playerId: "p4", team: "A", rating: 1.10, match: { scoreTeamA: 13, scoreTeamB: 5 } });
    }
    for (let i = 56; i <= 100; i++) {
      statsP3.push({ matchId: `m_b_${i}`, playerId: "p3", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
      statsP4.push({ matchId: `m_b_${i}`, playerId: "p4", team: "A", rating: 1.10, match: { scoreTeamA: 5, scoreTeamB: 13 } });
    }

    dataset.statsByPlayer.set("p1", statsP1);
    dataset.statsByPlayer.set("p2", statsP2);
    dataset.statsByPlayer.set("p3", statsP3);
    dataset.statsByPlayer.set("p4", statsP4);

    // @ts-ignore
    const result = generateHighlights(dataset);

    const bestDuos = result.filter(
      (h) => h.type === "DUO_SYNERGY" && h.subtitle === "Melhor parceria da temporada"
    );

    // A dupla A (75% WR, 16 jogos) deve vir antes da dupla B (55% WR, 100 jogos)
    expect(bestDuos[0].players.map(p => p.id)).toContain("p1");
    expect(bestDuos[1].players.map(p => p.id)).toContain("p3");
    expect(bestDuos[0].priority).toBeGreaterThan(bestDuos[1].priority);
  });

  it("detecta corretamente sequências quentes de vitórias (HOT_STREAK)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [],
    };

    // 5 partidas consecutivas vitoriosas (p1)
    const statsP1: any[] = [];
    for (let i = 1; i <= 5; i++) {
      statsP1.push({ matchId: `m_${i}`, playerId: "p1", team: "A", rating: 1.20, match: { scoreTeamA: 13, scoreTeamB: 4 } });
    }

    dataset.statsByPlayer.set("p1", statsP1);

    // @ts-ignore
    const result = generateHighlights(dataset);

    const streaks = result.filter((h) => h.type === "HOT_STREAK");
    expect(streaks).toHaveLength(1);
    expect(streaks[0]).toMatchObject({
      title: "Em Ritmo Quente",
      subtitle: "Sequência invicta",
      text: "Player 1 está dominando o servidor com uma sequência ativa de 5 vitórias seguidas.",
    });
  });
});
