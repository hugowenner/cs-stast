import { describe, expect, it } from "vitest";
// Importamos a função de interesse
import {
  getMapSpecialistsFromDataset,
  getPlayerArchetypesFromDataset,
  getAdvancedPerformanceStatsFromDataset,
  getMultikillsLeaderboards,
  getPerformanceExtremesFromDataset,
  getWorstRecordsFromDataset,
  getSeasonComparisonFromDataset,
  getStreaksFromDataset,
  getMapPerformanceFromDataset,
  calculateMapMinMatches,
} from "./competitive.service";

describe("calculateMapMinMatches", () => {
  it("calcula o mínimo com máximo par, ímpar, inferior a 5 e zero", () => {
    // Máximo par
    expect(calculateMapMinMatches(20)).toBe(10);
    expect(calculateMapMinMatches(12)).toBe(6);
    expect(calculateMapMinMatches(8)).toBe(5); // Math.ceil(8 * 0.5) = 4 < 5 -> 5
    // Máximo ímpar
    expect(calculateMapMinMatches(11)).toBe(6);
    expect(calculateMapMinMatches(15)).toBe(8);
    expect(calculateMapMinMatches(7)).toBe(5);
    // Inferior a 5
    expect(calculateMapMinMatches(4)).toBe(5);
    expect(calculateMapMinMatches(3)).toBe(5);
    expect(calculateMapMinMatches(1)).toBe(5);
    expect(calculateMapMinMatches(0)).toBe(5);
  });
});

describe("getMapSpecialistsFromDataset", () => {
  function createMatches(
    playerId: string,
    mapName: string,
    wins: number,
    losses: number,
    ties = 0,
    rating = 1.10
  ) {
    const list: any[] = [];
    for (let i = 0; i < wins; i++) {
      list.push({
        playerId,
        rating,
        team: "A",
        match: {
          id: `w_${playerId}_${mapName}_${i}`,
          map: { id: `m_${mapName}`, name: mapName },
          scoreTeamA: 13,
          scoreTeamB: 5,
        },
      });
    }
    for (let i = 0; i < losses; i++) {
      list.push({
        playerId,
        rating,
        team: "A",
        match: {
          id: `l_${playerId}_${mapName}_${i}`,
          map: { id: `m_${mapName}`, name: mapName },
          scoreTeamA: 5,
          scoreTeamB: 13,
        },
      });
    }
    for (let i = 0; i < ties; i++) {
      list.push({
        playerId,
        rating,
        team: "A",
        match: {
          id: `t_${playerId}_${mapName}_${i}`,
          map: { id: `m_${mapName}`, name: mapName },
          scoreTeamA: 12,
          scoreTeamB: 12,
        },
      });
    }
    return list;
  }

  it("prioriza maior percentual de vitórias individual: jogador com menos vitórias fica à frente por ter maior WR", () => {
    // Jogador A: 4 vitórias em 5 partidas (80% WR, rating 1.10)
    // Jogador B: 6 vitórias em 10 partidas (60% WR, rating 1.30)
    // maxMatches = 10 -> minMatches = 5. Ambos elegíveis.
    const statsA = createMatches("playerA", "Inferno", 4, 1, 0, 1.10);
    const statsB = createMatches("playerB", "Inferno", 6, 4, 0, 1.30);

    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 },
        { id: "playerB", nickname: "Jogador B", avatarUrl: null, levelGc: 12 },
      ],
      statsByPlayer: new Map([
        ["playerA", statsA],
        ["playerB", statsB],
      ]),
      allStats: [...statsA, ...statsB],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    const inf = specialists[0];
    expect(inf.mapName).toBe("Inferno");
    expect(inf.minMatches).toBe(5);

    // Jogador A lidera por aproveitamento (80% vs 60%), mesmo tendo menos vitórias absolutas (4 vs 6)
    expect(inf.player?.id).toBe("playerA");
    expect(inf.wins).toBe(4);
    expect(inf.matches).toBe(5);
    expect(inf.winrate).toBe(80);

    // Pódio
    expect(inf.podium).toHaveLength(2);
    expect(inf.podium[0].player.id).toBe("playerA");
    expect(inf.podium[0].winrate).toBe(80);
    expect(inf.podium[1].player.id).toBe("playerB");
    expect(inf.podium[1].winrate).toBe(60);
  });

  it("jogador com 3 vitórias em 3 partidas (100% WR) fica FORA pelo mínimo de partidas", () => {
    // p1: 3 vitórias em 3 partidas (100% WR) - mas mínimo é 5!
    // p2: 5 vitórias em 8 partidas (62.5% WR) - elegível!
    const statsP1 = createMatches("p1", "Mirage", 3, 0, 0, 1.40);
    const statsP2 = createMatches("p2", "Mirage", 5, 3, 0, 1.10);

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", statsP1],
        ["p2", statsP2],
      ]),
      allStats: [...statsP1, ...statsP2],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    const mirage = specialists[0];
    expect(mirage.minMatches).toBe(5);

    // p1 não é elegível porque tem 3 partidas (< 5)
    expect(mirage.player?.id).toBe("p2");
    expect(mirage.podium).toHaveLength(1);
    expect(mirage.podium[0].player.id).toBe("p2");
  });

  it("verifica elegibilidade exatamente no limite", () => {
    // maxMatches = 12 -> minMatches = 6
    // p1: 6 partidas (5V, 1D) = 83.3% WR -> ELEGÍVEL exatamente no limite
    // p2: 5 partidas (5V, 0D) = 100% WR -> INELEGÍVEL (5 < 6)
    // p_max: 12 partidas (6V, 6D) = 50% WR -> ELEGÍVEL
    const statsP1 = createMatches("p1", "Dust2", 5, 1, 0, 1.15);
    const statsP2 = createMatches("p2", "Dust2", 5, 0, 0, 1.30);
    const statsMax = createMatches("p_max", "Dust2", 6, 6, 0, 1.00);

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
        { id: "p_max", nickname: "Max", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", statsP1],
        ["p2", statsP2],
        ["p_max", statsMax],
      ]),
      allStats: [...statsP1, ...statsP2, ...statsMax],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    const d2 = specialists[0];
    expect(d2.minMatches).toBe(6);
    expect(d2.player?.id).toBe("p1");
    expect(d2.podium).toHaveLength(2);
    expect(d2.podium[0].player.id).toBe("p1");
    expect(d2.podium[1].player.id).toBe("p_max");
    // p2 com 5 partidas ficou de fora
    expect(d2.podium.map(p => p.player.id)).not.toContain("p2");
  });

  it("exclui jogadores sem nenhuma vitória (0 vitórias)", () => {
    // p1: 8 partidas e 0 vitórias -> inelegível
    const statsP1 = createMatches("p1", "Nuke", 0, 8, 0, 1.10);

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", statsP1]]),
      allStats: statsP1,
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    expect(specialists[0].player).toBeNull();
    expect(specialists[0].podium).toHaveLength(0);
    expect(specialists[0].minMatches).toBe(5);
  });

  it("computa empates no total de partidas mas sem pontuar como vitória", () => {
    // p1: 5 vitórias, 1 empate, 4 derrotas em 10 partidas -> WR = 5/10 = 50%
    const statsP1 = createMatches("p1", "Overpass", 5, 4, 1, 1.10);

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", statsP1]]),
      allStats: statsP1,
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    const op = specialists[0];
    expect(op.player?.id).toBe("p1");
    expect(op.matches).toBe(10);
    expect(op.wins).toBe(5);
    expect(op.winrate).toBe(50);
  });

  it("ordena por percentual de vitórias sem arredondamento", () => {
    // Três jogadores com WRs próximos que diferem nas casas decimais:
    // pA: 7 vitórias em 11 partidas = 63.636% (formata 63.6%)
    // pB: 5 vitórias em 8 partidas = 62.500% (formata 62.5%)
    // pC: 9 vitórias em 14 partidas = 64.285% (formata 64.3%)
    // maxMatches = 14 -> minMatches = 7. Todos jogaram >= 7.
    const statsA = createMatches("pA", "Ancient", 7, 4, 0, 1.10);
    const statsB = createMatches("pB", "Ancient", 5, 3, 0, 1.10);
    const statsC = createMatches("pC", "Ancient", 9, 5, 0, 1.10);

    const dataset = {
      activePlayers: [
        { id: "pA", nickname: "PA", avatarUrl: null, levelGc: 10 },
        { id: "pB", nickname: "PB", avatarUrl: null, levelGc: 10 },
        { id: "pC", nickname: "PC", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["pA", statsA],
        ["pB", statsB],
        ["pC", statsC],
      ]),
      allStats: [...statsA, ...statsB, ...statsC],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    const anc = specialists[0];
    expect(anc.podium[0].player.id).toBe("pC"); // 64.28%
    expect(anc.podium[1].player.id).toBe("pA"); // 63.64%
    expect(anc.podium[2].player.id).toBe("pB"); // 62.50%
  });

  it("aplica todos os critérios de desempate determinísticos", () => {
    // p1: 8V em 10P (80% WR, 8 vitórias, rating 1.10) -> WR = 80%, 8 vitórias
    // p2: 4V em 5P (80% WR, 4 vitórias, rating 1.10) -> WR = 80%, mas 4 vitórias (p1 vence por vitórias)
    // p3: 4V em 5P (80% WR, 4 vitórias, rating 1.30) -> WR = 80%, 4 vitórias, mas rating 1.30 > p2 (p3 vence p2 por rating)
    // p4_a: 4V em 5P (80% WR, 4 vitórias, rating 1.00, ID p4_a)
    // p4_b: 4V em 5P (80% WR, 4 vitórias, rating 1.00, ID p4_b) -> desempate por ID alfabético
    const stats1 = createMatches("p1", "Anubis", 8, 2, 0, 1.10);
    const stats2 = createMatches("p2", "Anubis", 4, 1, 0, 1.10);
    const stats3 = createMatches("p3", "Anubis", 4, 1, 0, 1.30);
    const stats4a = createMatches("p4_a", "Anubis", 4, 1, 0, 1.00);
    const stats4b = createMatches("p4_b", "Anubis", 4, 1, 0, 1.00);

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "P3", avatarUrl: null, levelGc: 10 },
        { id: "p4_b", nickname: "P4_B", avatarUrl: null, levelGc: 10 },
        { id: "p4_a", nickname: "P4_A", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", stats1],
        ["p2", stats2],
        ["p3", stats3],
        ["p4_b", stats4b],
        ["p4_a", stats4a],
      ]),
      allStats: [...stats1, ...stats2, ...stats3, ...stats4a, ...stats4b],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    const anubis = specialists[0];
    expect(anubis.podium).toHaveLength(3); // Máximo 3
    // #1 p1: 8 vitórias (maior quantidade de vitórias entre empatados em 80% WR)
    expect(anubis.podium[0].player.id).toBe("p1");
    // #2 p3: 4 vitórias, rating 1.30 (maior rating que p2)
    expect(anubis.podium[1].player.id).toBe("p3");
    // #3 p2: 4 vitórias, rating 1.10
    expect(anubis.podium[2].player.id).toBe("p2");
  });

  it("cobre mapas com 0, 1, 2 e mais de 3 elegíveis", () => {
    // Mapa com 0 elegíveis (todos < 5 partidas)
    const statsMapZero = createMatches("p1", "de_zero", 2, 0, 0);

    // Mapa com 1 elegível
    const statsMapOne = createMatches("p1", "de_one", 5, 1, 0);

    // Mapa com 2 elegíveis
    const statsMapTwo_A = createMatches("p1", "de_two", 5, 1, 0);
    const statsMapTwo_B = createMatches("p2", "de_two", 4, 2, 0);

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", [...statsMapZero, ...statsMapOne, ...statsMapTwo_A]],
        ["p2", statsMapTwo_B],
      ]),
      allStats: [...statsMapZero, ...statsMapOne, ...statsMapTwo_A, ...statsMapTwo_B],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    const zero = specialists.find(s => s.mapName === "de_zero");
    expect(zero?.player).toBeNull();
    expect(zero?.podium).toHaveLength(0);

    const one = specialists.find(s => s.mapName === "de_one");
    expect(one?.player?.id).toBe("p1");
    expect(one?.podium).toHaveLength(1);

    const two = specialists.find(s => s.mapName === "de_two");
    expect(two?.player?.id).toBe("p1");
    expect(two?.podium).toHaveLength(2);
  });
});

describe("getPlayerArchetypesFromDataset (Percentile-based)", () => {
  it("deve distribuir os arquétipos corretamente com base no percentil relativo", () => {
    const dataset = {
      activePlayers: [
        { id: "p_entry", nickname: "EntryGod", avatarUrl: null, levelGc: 20 },
        { id: "p_hs", nickname: "OneTap", avatarUrl: null, levelGc: 20 },
        { id: "p_clutch", nickname: "ClutchKing", avatarUrl: null, levelGc: 20 },
        { id: "p_support", nickname: "UtilityKing", avatarUrl: null, levelGc: 20 },
        { id: "p_impact", nickname: "ImpactGod", avatarUrl: null, levelGc: 20 },
        { id: "p_consistent", nickname: "ConsistentMr", avatarUrl: null, levelGc: 20 },
      ],
      statsByPlayer: new Map(),
      allStats: [] as any[],
    };

    const statsEntry = [
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.05, adr: 80.0, kast: 70 },
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.05, adr: 80.0, kast: 70 },
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 80.0, kast: 70 },
    ];

    const statsHs = [
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsClutch = [
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsSupport = [
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsImpact = [
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.50, adr: 120.0, kast: 70 },
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.50, adr: 120.0, kast: 70 },
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 120.0, kast: 70 },
    ];

    const statsConsistent = [
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
    ];

    const allStats = [
      ...statsEntry,
      ...statsHs,
      ...statsClutch,
      ...statsSupport,
      ...statsImpact,
      ...statsConsistent,
    ];

    dataset.allStats = allStats;
    dataset.statsByPlayer.set("p_entry", statsEntry);
    dataset.statsByPlayer.set("p_hs", statsHs);
    dataset.statsByPlayer.set("p_clutch", statsClutch);
    dataset.statsByPlayer.set("p_support", statsSupport);
    dataset.statsByPlayer.set("p_impact", statsImpact);
    dataset.statsByPlayer.set("p_consistent", statsConsistent);

    // @ts-ignore
    const result = getPlayerArchetypesFromDataset(dataset);

    const entryPlayer = result.find((r: any) => r.player.id === "p_entry");
    const hsPlayer = result.find((r: any) => r.player.id === "p_hs");
    const clutchPlayer = result.find((r: any) => r.player.id === "p_clutch");
    const supportPlayer = result.find((r: any) => r.player.id === "p_support");
    const impactPlayer = result.find((r: any) => r.player.id === "p_impact");
    const consistentPlayer = result.find((r: any) => r.player.id === "p_consistent");

    expect(entryPlayer?.archetype).toBe("entry");
    expect(hsPlayer?.archetype).toBe("headshot");
    expect(clutchPlayer?.archetype).toBe("clutch");
    expect(supportPlayer?.archetype).toBe("support");
    expect(impactPlayer?.archetype).toBe("impact");
    expect(consistentPlayer?.archetype).toBe("consistent");
  });
});

describe("getAdvancedPerformanceStatsFromDataset", () => {
  it("ignora valores nulos nas médias de damage e gcRating e calcula as médias corretamente (Caso 1 e 2)", () => {
    const dataset = {
      activePlayers: [{ id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 }],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "playerA", matchId: "m1", damage: 1000, gcRating: 1.10, doubleKills: 2 },
        { playerId: "playerA", matchId: "m2", damage: null, gcRating: null, doubleKills: null },
        { playerId: "playerA", matchId: "m3", damage: 2000, gcRating: 1.30, doubleKills: 3 },
      ],
    };
    
    // @ts-ignore
    const stats = getAdvancedPerformanceStatsFromDataset(dataset);

    expect(stats.sampleSize).toBe(2); // Apenas m1 e m3 possuem dados GC avançados
    expect(stats.averageDamage).toBe(1500); // (1000 + 2000) / 2
    expect(stats.averageGcRating).toBe(1.20); // (1.10 + 1.30) / 2
    expect(stats.totalDoubleKills).toBe(5); // 2 + 3
  });

  it("retorna nulos se todas as estatísticas forem nulas (Caso 3 - banco histórico)", () => {
    const dataset = {
      activePlayers: [{ id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 }],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "playerA", matchId: "m1", damage: null, gcRating: null, doubleKills: null },
        { playerId: "playerA", matchId: "m2", damage: null, gcRating: null, doubleKills: null },
      ],
    };

    // @ts-ignore
    const stats = getAdvancedPerformanceStatsFromDataset(dataset);

    expect(stats.sampleSize).toBe(0);
    expect(stats.averageDamage).toBeNull();
    expect(stats.averageGcRating).toBeNull();
    expect(stats.totalDoubleKills).toBeNull();
    expect(stats.totalTripleKills).toBeNull();
    expect(stats.totalQuadKills).toBeNull();
    expect(stats.totalAces).toBeNull();
  });
});

describe("getMultikillsLeaderboards", () => {
  it("calcula somatórios e rankeia top 6 de forma decrescente, ignorando zeros", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 10 },
        { id: "p4", nickname: "Player 4", avatarUrl: null, levelGc: 10 },
        { id: "p5", nickname: "Player 5", avatarUrl: null, levelGc: 10 },
        { id: "p6", nickname: "Player 6", avatarUrl: null, levelGc: 10 },
        { id: "p7", nickname: "Player 7", avatarUrl: null, levelGc: 10 },
        { id: "p8", nickname: "Player 8", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "p1", doubleKills: 10 },
        { playerId: "p2", doubleKills: 20 },
        { playerId: "p3", doubleKills: 30 },
        { playerId: "p4", doubleKills: 40 },
        { playerId: "p5", doubleKills: 50 },
        { playerId: "p6", doubleKills: 60 },
        { playerId: "p7", doubleKills: 70 }, // Mais alto
        { playerId: "p8", doubleKills: 0 },  // Inelegível (zero)
      ],
    };

    // @ts-ignore
    const result = getMultikillsLeaderboards(dataset);

    // Double Kills deve ter tamanho 6 (dos 7 elegíveis), ordenado desc. p8 (zero) deve ser ignorado.
    expect(result.doubleKills).toHaveLength(6);
    expect(result.doubleKills[0]).toMatchObject({ playerId: "p7", count: 70 });
    expect(result.doubleKills[1]).toMatchObject({ playerId: "p6", count: 60 });
    expect(result.doubleKills[2]).toMatchObject({ playerId: "p5", count: 50 });
    expect(result.doubleKills[3]).toMatchObject({ playerId: "p4", count: 40 });
    expect(result.doubleKills[4]).toMatchObject({ playerId: "p3", count: 30 });
    expect(result.doubleKills[5]).toMatchObject({ playerId: "p2", count: 20 });
    // p1 (10) ficou fora do Top 6 (slice)

    // Outros campos de multikill estão vazios, portanto vazios (resiliência)
    expect(result.tripleKills).toHaveLength(0);
    expect(result.quadKills).toHaveLength(0);
    expect(result.aces).toHaveLength(0);
  });
});

describe("getPerformanceExtremesFromDataset e getWorstRecordsFromDataset", () => {
  it("deve incluir partida com < 5 kills como pior atuação se o jogador teve participação substancial (deaths >= 10)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // 5 partidas para atingir MIN_PLAYER_MATCHES = 5
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m1", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 14, deaths: 13, rating: 1.05, adr: 75, match: { id: "m2", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 16, deaths: 11, rating: 1.15, adr: 85, match: { id: "m3", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m4", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        // Partida horrível legítima: 3 kills, 16 mortes (rating 0.10)
        { playerId: "p1", kills: 3, deaths: 16, rating: 0.10, adr: 30, match: { id: "m5", map: { name: "Inferno" }, scoreTeamA: 7, scoreTeamB: 13 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats);

    // @ts-ignore
    const extremes = getPerformanceExtremesFromDataset(dataset);
    expect(extremes.worst).not.toBeNull();
    expect(extremes.worst?.kills).toBe(3);
    expect(extremes.worst?.deaths).toBe(16);
    expect(extremes.worst?.rating).toBe(0.10);

    // @ts-ignore
    const worstRecords = getWorstRecordsFromDataset(dataset);
    const worstRatingRecord = worstRecords.find(r => r.category === "Pior Rating em Jogo");
    expect(worstRatingRecord).toBeDefined();
    expect(worstRatingRecord?.value).toBe("0.10");
  });

  it("deve ignorar desconexão ou substituição precoce (ex: 0 kills, 1 morte) como pior atuação", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m1", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 14, deaths: 13, rating: 1.05, adr: 75, match: { id: "m2", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 16, deaths: 11, rating: 1.15, adr: 85, match: { id: "m3", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m4", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        // Jogador caiu na 2ª rodada: 0 kills, 1 morte (rating 0.00)
        { playerId: "p1", kills: 0, deaths: 1, rating: 0.00, adr: 5, match: { id: "m5", map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 10 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats);

    // @ts-ignore
    const extremes = getPerformanceExtremesFromDataset(dataset);
    // A pior atuação não deve ser a desconexão (0 kills, 1 morte), mas sim a partida válida com menor rating (m2 com rating 1.05)
    expect(extremes.worst?.rating).toBe(1.05);
  });
});

describe("getSeasonComparisonFromDataset", () => {
  function makeMatch(id: string, dateStr: string, rating: number, map = "de_mirage") {
    return {
      playerId: "p1",
      kills: 18,
      deaths: 12,
      assists: 4,
      adr: 85,
      kast: 75,
      hsPercent: 50,
      rating,
      team: "A",
      match: {
        id,
        playedAt: new Date(dateStr),
        scoreTeamA: 13,
        scoreTeamB: 7,
        map: { id: `m_${map}`, name: map },
      },
    };
  }

  it("ignora jogador com menos de 20 partidas válidas com rating", () => {
    // 19 partidas válidas
    const stats = Array.from({ length: 19 }, (_, i) =>
      makeMatch(`m${i}`, `2026-10-01T10:${i.toString().padStart(2, "0")}:00Z`, 1.1)
    );

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", stats]]),
      allStats: stats,
    };

    // @ts-ignore
    const comparison = getSeasonComparisonFromDataset(dataset);
    expect(comparison).toHaveLength(0);
  });

  it("compara corretamente as últimas 10 partidas com as 10 imediatamente anteriores sem sobreposição", () => {
    // 20 partidas:
    // Índices 0..9 (recentes): rating 1.30 cada
    // Índices 10..19 (anteriores): rating 1.00 cada
    const recent = Array.from({ length: 10 }, (_, i) =>
      makeMatch(`rec_${i}`, `2026-10-20T10:${i.toString().padStart(2, "0")}:00Z`, 1.3, "de_mirage")
    );
    const prev = Array.from({ length: 10 }, (_, i) =>
      makeMatch(`prev_${i}`, `2026-10-10T10:${i.toString().padStart(2, "0")}:00Z`, 1.0, "de_inferno")
    );
    const stats = [...recent, ...prev]; // Ordenado desc: recentes primeiro

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", stats]]),
      allStats: stats,
    };

    // @ts-ignore
    const comparison = getSeasonComparisonFromDataset(dataset);
    expect(comparison).toHaveLength(1);
    const entry = comparison[0];

    expect(entry.recent.rating).toBe(1.3);
    expect(entry.season.rating).toBe(1.0);
    expect(entry.diff.rating).toBe(0.3);
    expect(entry.rawDiff).toBeCloseTo(0.3, 5);
    expect(entry.recentMatches).toHaveLength(10);
    // Deve estar em ordem cronológica (mais antiga para mais recente)
    expect(entry.recentMatches[0].matchId).toBe("rec_9");
    expect(entry.recentMatches[9].matchId).toBe("rec_0");
  });

  it("ordena pela maior evolução com desempate por player.id", () => {
    const statsP1 = [
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`p1_rec_${i}`, `2026-10-20T10:00:00Z`, 1.2)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`p1_prev_${i}`, `2026-10-10T10:00:00Z`, 1.0)),
    ]; // diff = +0.20
    const statsP2 = [
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`p2_rec_${i}`, `2026-10-20T10:00:00Z`, 1.4)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`p2_prev_${i}`, `2026-10-10T10:00:00Z`, 1.0)),
    ]; // diff = +0.40

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Jogador 2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", statsP1],
        ["p2", statsP2],
      ]),
      allStats: [...statsP1, ...statsP2],
    };

    // @ts-ignore
    const comparison = getSeasonComparisonFromDataset(dataset);
    expect(comparison).toHaveLength(2);
    expect(comparison[0].player.id).toBe("p2");
    expect(comparison[1].player.id).toBe("p1");
  });
});

describe("getStreaksFromDataset", () => {
  function makeStreakMatch(id: string, dateStr: string, won: boolean, teamA = 13, teamB = 5) {
    return {
      playerId: "p1",
      kills: 15,
      deaths: 10,
      assists: 3,
      adr: 80,
      kast: 70,
      rating: 1.15,
      team: "A",
      match: {
        id,
        playedAt: new Date(dateStr),
        scoreTeamA: won ? teamA : teamB,
        scoreTeamB: won ? teamB : teamA,
        map: { id: "m_dust2", name: "de_dust2" },
      },
    };
  }

  it("computa sequência de vitórias consecutivas até derrota ou empate", () => {
    // Partidas ordenadas desc: V, V, V, D, V
    const stats = [
      makeStreakMatch("m1", "2026-10-25T10:00:00Z", true),
      makeStreakMatch("m2", "2026-10-24T10:00:00Z", true),
      makeStreakMatch("m3", "2026-10-23T10:00:00Z", true),
      makeStreakMatch("m4", "2026-10-22T10:00:00Z", false),
      makeStreakMatch("m5", "2026-10-21T10:00:00Z", true),
    ];

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", stats]]),
      allStats: stats,
    };

    // @ts-ignore
    const { hot, cold } = getStreaksFromDataset(dataset);
    expect(hot).toHaveLength(1);
    expect(hot[0].streak).toBe(3);
    expect(hot[0].recentResults).toHaveLength(5);
    // Em ordem cronológica, o último item é a partida mais recente
    expect(hot[0].recentResults[4].isMostRecent).toBe(true);
    expect(hot[0].recentResults[4].result).toBe("V");
    expect(cold).toHaveLength(0);
  });

  it("computa sequência sem vencer (derrotas e empates) consecutivas", () => {
    // Partidas desc: D, E (empate 12x12), D, V
    const stats = [
      makeStreakMatch("m1", "2026-10-25T10:00:00Z", false),
      {
        ...makeStreakMatch("m2", "2026-10-24T10:00:00Z", false),
        match: {
          id: "m2",
          playedAt: new Date("2026-10-24T10:00:00Z"),
          scoreTeamA: 12,
          scoreTeamB: 12,
          map: { id: "m_dust2", name: "de_dust2" },
        },
      },
      makeStreakMatch("m3", "2026-10-23T10:00:00Z", false),
      makeStreakMatch("m4", "2026-10-22T10:00:00Z", true),
    ];

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 }],
      statsByPlayer: new Map([["p1", stats]]),
      allStats: stats,
    };

    // @ts-ignore
    const { hot, cold } = getStreaksFromDataset(dataset);
    expect(cold).toHaveLength(1);
    expect(cold[0].streak).toBe(3); // D, E, D = 3 jogos sem vencer
    expect(hot).toHaveLength(0);
  });

  it("desempata por tamanho da sequência, depois timestamp mais recente e id", () => {
    const statsP1 = [
      makeStreakMatch("p1_1", "2026-10-20T10:00:00Z", true),
      makeStreakMatch("p1_2", "2026-10-19T10:00:00Z", true),
    ];
    const statsP2 = [
      makeStreakMatch("p2_1", "2026-10-25T10:00:00Z", true), // Mais recente
      makeStreakMatch("p2_2", "2026-10-24T10:00:00Z", true),
    ];

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Jogador 2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", statsP1],
        ["p2", statsP2],
      ]),
      allStats: [...statsP1, ...statsP2],
    };

    // @ts-ignore
    const { hot } = getStreaksFromDataset(dataset);
    expect(hot).toHaveLength(2);
    // Mesmo tamanho (2), p2 é mais recente, portanto vem primeiro
    expect(hot[0].player.id).toBe("p2");
    expect(hot[1].player.id).toBe("p1");
  });
});

describe("getMapPerformanceFromDataset", () => {
  it("exclui confrontos internos entre monitorados do cálculo coletivo", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Jogador 2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Partida 1: p1 e p2 no mesmo time A -> vitória coletiva
        { playerId: "p1", team: "A", match: { id: "m1", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p2", team: "A", match: { id: "m1", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },

        // Partida 2: p1 no time A, p2 no time B -> confronto interno (deve ser excluído)
        { playerId: "p1", team: "A", match: { id: "m2", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p2", team: "B", match: { id: "m2", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },

        // Partida 3: p1 no time A -> vitória coletiva
        { playerId: "p1", team: "A", match: { id: "m3", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },

        // Partida 4: p1 no time A -> derrota coletiva
        { playerId: "p1", team: "A", match: { id: "m4", mapId: "m_d2", map: { name: "de_dust2" }, scoreTeamA: 5, scoreTeamB: 13 } },
      ],
    };

    // @ts-ignore
    const { mapWinrates } = getMapPerformanceFromDataset(dataset);
    const d2 = mapWinrates.find((m) => m.cleanMapName === "Dust 2" || m.cleanMapName === "Dust2");
    expect(d2).toBeDefined();
    expect(d2?.directMatchesExcluded).toBe(1);
    expect(d2?.matchesPlayed).toBe(3); // m1, m3, m4
    expect(d2?.wins).toBe(2);
    expect(d2?.losses).toBe(1);
    expect(d2?.winrate).toBeCloseTo(66.7, 1);
  });
});


