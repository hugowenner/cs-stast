import { describe, expect, it } from "vitest";
import { generateHighlights } from "./highlights.service";
import { calculateConfidence } from "./highlight.scoring";

describe("calculateConfidence", () => {
  it("computa a confiança no formato decimal de forma correta", () => {
    const confA = calculateConfidence(1.0, 6);
    expect(Number(confA.toFixed(4))).toBe(0.4512);

    const confB = calculateConfidence(0.75, 16);
    expect(Number(confB.toFixed(4))).toBe(0.5986);

    expect(confB).toBeGreaterThan(confA);
  });
});

function makeDatasetForDuo(
  duoA: { matchCount: number; wins: number; rating?: number },
  duoB: { matchCount: number; wins: number; rating?: number },
) {
  const rA = duoA.rating ?? 1.1;
  const rB = duoB.rating ?? 1.1;
  const dataset = {
    activePlayers: [
      { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
      { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
      { id: "p3", nickname: "P3", avatarUrl: null, levelGc: 10 },
      { id: "p4", nickname: "P4", avatarUrl: null, levelGc: 10 },
    ],
    statsByPlayer: new Map<string, any[]>(),
    allStats: [] as any[],
  };

  const [sP1, sP2] = [[], []] as [any[], any[]];
  for (let i = 1; i <= duoA.wins; i++) {
    sP1.push({ matchId: `ma${i}`, playerId: "p1", team: "A", rating: rA, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 13, scoreTeamB: 5, map: { name: "Mirage" } } });
    sP2.push({ matchId: `ma${i}`, playerId: "p2", team: "A", rating: rA, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 13, scoreTeamB: 5, map: { name: "Mirage" } } });
  }
  for (let i = duoA.wins + 1; i <= duoA.matchCount; i++) {
    sP1.push({ matchId: `ma${i}`, playerId: "p1", team: "A", rating: rA, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 5, scoreTeamB: 13, map: { name: "Mirage" } } });
    sP2.push({ matchId: `ma${i}`, playerId: "p2", team: "A", rating: rA, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 5, scoreTeamB: 13, map: { name: "Mirage" } } });
  }

  const [sP3, sP4] = [[], []] as [any[], any[]];
  for (let i = 1; i <= duoB.wins; i++) {
    sP3.push({ matchId: `mb${i}`, playerId: "p3", team: "A", rating: rB, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 13, scoreTeamB: 5, map: { name: "Mirage" } } });
    sP4.push({ matchId: `mb${i}`, playerId: "p4", team: "A", rating: rB, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 13, scoreTeamB: 5, map: { name: "Mirage" } } });
  }
  for (let i = duoB.wins + 1; i <= duoB.matchCount; i++) {
    sP3.push({ matchId: `mb${i}`, playerId: "p3", team: "A", rating: rB, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 5, scoreTeamB: 13, map: { name: "Mirage" } } });
    sP4.push({ matchId: `mb${i}`, playerId: "p4", team: "A", rating: rB, adr: 80, kills: 18, deaths: 14, headshots: 9, assists: 3, kast: 72, impact: 1.0, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 5, scoreTeamB: 13, map: { name: "Mirage" } } });
  }

  dataset.statsByPlayer.set("p1", sP1);
  dataset.statsByPlayer.set("p2", sP2);
  dataset.statsByPlayer.set("p3", sP3);
  dataset.statsByPlayer.set("p4", sP4);
  dataset.allStats = [...sP1, ...sP2, ...sP3, ...sP4];
  return dataset;
}

describe("generateHighlights", () => {
  it("retorna um array não-vazio com dados suficientes", () => {
    const dataset = makeDatasetForDuo(
      { matchCount: 16, wins: 12, rating: 1.2 },
      { matchCount: 8, wins: 6, rating: 1.1 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it("todos os highlights possuem storyCategory definido", () => {
    const dataset = makeDatasetForDuo(
      { matchCount: 16, wins: 12, rating: 1.2 },
      { matchCount: 8, wins: 6, rating: 1.1 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    for (const h of result) {
      expect(h.storyCategory).toBeDefined();
      expect(typeof h.storyCategory).toBe("string");
    }
  });

  it("todos os highlights possuem rarity definido", () => {
    const dataset = makeDatasetForDuo(
      { matchCount: 16, wins: 12, rating: 1.2 },
      { matchCount: 8, wins: 6, rating: 1.1 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    const valid = ["legendary", "epic", "rare", "common"];
    for (const h of result) {
      expect(valid).toContain(h.rarity);
    }
  });

  it("não há IDs duplicados no pool de highlights", () => {
    const dataset = makeDatasetForDuo(
      { matchCount: 16, wins: 12, rating: 1.2 },
      { matchCount: 8, wins: 6, rating: 1.1 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    const ids = result.map((h) => h.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("o quota por categoria é respeitado", () => {
    const dataset = makeDatasetForDuo(
      { matchCount: 20, wins: 16, rating: 1.3 },
      { matchCount: 20, wins: 16, rating: 1.3 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    const counts = new Map<string, number>();
    for (const h of result) {
      counts.set(h.storyCategory, (counts.get(h.storyCategory) ?? 0) + 1);
    }
    for (const [cat, count] of counts) {
      expect(count).toBeLessThanOrEqual(3); // max quota é 3 (performance)
    }
  });

  it("a dupla com maior confiança vence a de 100% WR e baixo volume (best-duo)", () => {
    // Dupla A (p1+p2): 6 jogos, 6 vitórias (100% WR) → conf ≈ 0.45
    // Dupla B (p3+p4): 16 jogos, 12 vitórias (75% WR) → conf ≈ 0.60
    const dataset = makeDatasetForDuo(
      { matchCount: 6, wins: 6, rating: 1.2 },
      { matchCount: 16, wins: 12, rating: 1.2 },
    );
    // @ts-ignore
    const result = generateHighlights(dataset);
    const duoHighlight = result.find((h) => h.id === "best-duo");
    // Se best-duo aparecer, deve ser a dupla B (maior confiança)
    if (duoHighlight) {
      const playerIds = duoHighlight.players.map((p) => p.id);
      expect(playerIds).toContain("p3");
      expect(playerIds).toContain("p4");
    }
  });

  it("detecta sequência quente de vitórias (hot-streak)", () => {
    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map<string, any[]>(),
      allStats: [] as any[],
    };
    const stats: any[] = [];
    for (let i = 1; i <= 5; i++) {
      stats.push({ matchId: `m${i}`, playerId: "p1", team: "A", rating: 1.2, adr: 90, kills: 20, deaths: 12, headshots: 10, assists: 3, kast: 75, impact: 1.1, clutchesWon: 0, match: { playedAt: new Date(), scoreTeamA: 13, scoreTeamB: 4, map: { name: "Inferno" } } });
    }
    dataset.statsByPlayer.set("p1", stats);
    dataset.allStats = stats;

    // @ts-ignore
    const result = generateHighlights(dataset);
    const streaks = result.filter((h) => h.type === "HOT_STREAK");
    expect(streaks.length).toBeGreaterThanOrEqual(1);
    const s = streaks[0];
    expect(s.players[0].nickname).toBe("Player 1");
    expect(s.metrics.some((m) => m.value === 5 || m.value === "5")).toBeTruthy();
  });

  it("retorna vazio quando não há dados suficientes", () => {
    const dataset = {
      activePlayers: [],
      statsByPlayer: new Map(),
      allStats: [],
    };
    // @ts-ignore
    const result = generateHighlights(dataset);
    expect(result).toEqual([]);
  });
});
