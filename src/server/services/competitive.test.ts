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
  calculateWilsonScore,
  MAP_MIN_MATCHES,
  getFeaturedPlayerFromDataset,
  getPeriodFactFromDataset,
  getAttentionPointFromDataset,
  getGroupRadarFromDataset,
} from "./competitive.service";

describe("calculateWilsonScore", () => {
  it("trata entradas inválidas ou zero partidas de forma segura sem divisão por zero", () => {
    expect(calculateWilsonScore(0, 0)).toBe(0);
    expect(calculateWilsonScore(-1, 5)).toBe(0);
    expect(calculateWilsonScore(5, -1)).toBe(0);
    expect(calculateWilsonScore(NaN, 5)).toBe(0);
    expect(calculateWilsonScore(5, NaN)).toBe(0);
    expect(calculateWilsonScore(Infinity, 5)).toBe(0);
    expect(calculateWilsonScore(5, Infinity)).toBe(0);
  });

  it("retorna zero para zero vitórias em qualquer quantidade de partidas", () => {
    expect(calculateWilsonScore(0, 5)).toBe(0);
    expect(calculateWilsonScore(0, 20)).toBe(0);
    expect(calculateWilsonScore(0, 100)).toBe(0);
  });

  it("calcula valores de referência para 5/5, 9/10, 14/20 e 40/50", () => {
    const s5_5 = calculateWilsonScore(5, 5);
    const s9_10 = calculateWilsonScore(9, 10);
    const s14_20 = calculateWilsonScore(14, 20);
    const s40_50 = calculateWilsonScore(40, 50);

    expect(s5_5).toBeCloseTo(0.5655, 4);
    expect(s9_10).toBeCloseTo(0.5958, 4);
    expect(s14_20).toBeCloseTo(0.4810, 4);
    expect(s40_50).toBeCloseTo(0.6696, 4);

    // 9/10 (90%) supera 5/5 (100%) porque a amostra maior reduz a incerteza
    expect(s9_10).toBeGreaterThan(s5_5);
  });

  it("com o mesmo aproveitamento, a amostra maior possui score de Wilson superior", () => {
    // 50% de winrate em 10 partidas vs 100 partidas
    const smallSample = calculateWilsonScore(5, 10);
    const largeSample = calculateWilsonScore(50, 100);

    expect(smallSample).toBeCloseTo(0.2366, 4);
    expect(largeSample).toBeCloseTo(0.4038, 4);
    expect(largeSample).toBeGreaterThan(smallSample);
  });

  it("com o mesmo total de partidas, mais vitórias aumentam o score", () => {
    const s5_10 = calculateWilsonScore(5, 10);
    const s7_10 = calculateWilsonScore(7, 10);
    const s9_10 = calculateWilsonScore(9, 10);

    expect(s7_10).toBeGreaterThan(s5_10);
    expect(s9_10).toBeGreaterThan(s7_10);
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

  it("aplica elegibilidade fixa: 4 partidas é inelegível, 5 partidas com vitória é elegível", () => {
    // p1: 4 vitórias em 4 partidas (100% WR) -> inelegível (< 5 partidas)
    // p2: 3 vitórias em 5 partidas (60% WR) -> elegível (>= 5 partidas)
    const statsP1 = createMatches("p1", "Mirage", 4, 0, 0, 1.40);
    const statsP2 = createMatches("p2", "Mirage", 3, 2, 0, 1.10);

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

    // p1 não é elegível porque tem 4 partidas (< 5)
    expect(mirage.player?.id).toBe("p2");
    expect(mirage.podium).toHaveLength(1);
    expect(mirage.podium[0].player.id).toBe("p2");
  });

  it("exclui jogadores sem nenhuma vitória (0 vitórias)", () => {
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

  it("computa empates no total de partidas (denominador) sem pontuar como vitória", () => {
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
    expect(op.wilsonScore).toBeCloseTo(0.2366, 3);
  });

  it("classifica pelo score de Wilson: 14/20 supera 6/8 apesar do WR nominal inferior (70% vs 75%)", () => {
    // Caso real da Inferno:
    // Jogador A: 14 vitórias em 20 partidas (70% WR, Wilson 48.1)
    // Jogador B: 6 vitórias em 8 partidas (75% WR, Wilson 40.9)
    const statsA = createMatches("playerA", "Inferno", 14, 6, 0, 1.12);
    const statsB = createMatches("playerB", "Inferno", 6, 2, 0, 0.82);

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
    const inf = specialists[0];

    // Jogador A lidera por Wilson score (0.481 > 0.409), mesmo com WR nominal menor (70% vs 75%)
    expect(inf.player?.id).toBe("playerA");
    expect(inf.podium[0].player.id).toBe("playerA");
    expect(inf.podium[1].player.id).toBe("playerB");
    expect(inf.podium[0].wilsonScore).toBeGreaterThan(inf.podium[1].wilsonScore!);
  });

  it("independência: adicionar partidas de outro jogador NÃO altera o score nem a elegibilidade de quem não jogou", () => {
    // Jogador A tem 5 partidas (3V, 2D) no mapa
    const statsA = createMatches("playerA", "Dust2", 3, 2, 0, 1.19);

    const dataset1 = {
      activePlayers: [{ id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 }],
      statsByPlayer: new Map([["playerA", statsA]]),
      allStats: statsA,
    };

    // @ts-ignore
    const res1 = getMapSpecialistsFromDataset(dataset1)[0];
    expect(res1.player?.id).toBe("playerA");
    expect(res1.minMatches).toBe(5);
    const wilsonA1 = res1.wilsonScore;

    // Agora adicionamos um jogador B ultra ativo com 20 partidas no mesmo mapa
    const statsB = createMatches("playerB", "Dust2", 10, 10, 0, 1.00);
    const dataset2 = {
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
    const res2 = getMapSpecialistsFromDataset(dataset2)[0];
    // Jogador A continua elegível com mínimo de 5, e seu score é estritamente idêntico
    const itemA = res2.podium.find((p) => p.player.id === "playerA");
    expect(itemA).toBeDefined();
    expect(itemA?.wilsonScore).toBe(wilsonA1);
    expect(res2.minMatches).toBe(5);
  });

  it("aplica todos os critérios de desempate determinísticos sem arredondamento", () => {
    // Empatados no score de Wilson (mesmas vitórias e partidas: 5V em 10P)
    // p1: 5V em 10P (Wilson 0.2366, WR 50%, rating 1.10)
    // p2: 5V em 10P (Wilson 0.2366, WR 50%, rating 1.30) -> vence p1 por rating
    // p3_a: 5V em 10P (Wilson 0.2366, WR 50%, rating 1.00, ID p3_a)
    // p3_b: 5V em 10P (Wilson 0.2366, WR 50%, rating 1.00, ID p3_b) -> desempate por ID alfabético
    const stats1 = createMatches("p1", "Anubis", 5, 5, 0, 1.10);
    const stats2 = createMatches("p2", "Anubis", 5, 5, 0, 1.30);
    const stats3a = createMatches("p3_a", "Anubis", 5, 5, 0, 1.00);
    const stats3b = createMatches("p3_b", "Anubis", 5, 5, 0, 1.00);

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
        { id: "p3_b", nickname: "P3_B", avatarUrl: null, levelGc: 10 },
        { id: "p3_a", nickname: "P3_A", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map([
        ["p1", stats1],
        ["p2", stats2],
        ["p3_b", stats3b],
        ["p3_a", stats3a],
      ]),
      allStats: [...stats1, ...stats2, ...stats3b, ...stats3a],
    };

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    const anubis = specialists[0];
    expect(anubis.podium).toHaveLength(3); // Máximo 3
    // #1 p2: maior rating (1.30 vs 1.10)
    expect(anubis.podium[0].player.id).toBe("p2");
    // #2 p1: segundo maior rating (1.10)
    expect(anubis.podium[1].player.id).toBe("p1");
    // #3 p3_a: desempate alfabético frente a p3_b (rating 1.00 ambos)
    expect(anubis.podium[2].player.id).toBe("p3_a");

    // Coerência entre líder e 1º colocado do pódio
    expect(anubis.player?.id).toBe(anubis.podium[0].player.id);
  });

  it("cobre mapas com 0, 1, 2 e mais de 3 elegíveis preservando coerência de pódio e líder", () => {
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

    const zero = specialists.find((s) => s.mapName === "de_zero");
    expect(zero?.player).toBeNull();
    expect(zero?.podium).toHaveLength(0);

    const one = specialists.find((s) => s.mapName === "de_one");
    expect(one?.player?.id).toBe("p1");
    expect(one?.podium).toHaveLength(1);
    expect(one?.player?.id).toBe(one?.podium[0].player.id);

    const two = specialists.find((s) => s.mapName === "de_two");
    expect(two?.player?.id).toBe("p1");
    expect(two?.podium).toHaveLength(2);
    expect(two?.player?.id).toBe(two?.podium[0].player.id);
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

describe("Radar do Grupo - getFeaturedPlayerFromDataset", () => {
  it("retorna estado vazio quando nenhum jogador tem pelo menos 5 partidas válidas com rating", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p1",
          [
            { playerId: "p1", rating: 1.25, team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.30, team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.15, team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5 } },
            // Apenas 4 partidas válidas
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const result = getFeaturedPlayerFromDataset(dataset, []);
    expect(result.player).toBeNull();
    expect(result.emptyReason).toBe("São necessárias pelo menos 5 partidas com rating no período.");
  });

  it("seleciona o jogador com maior rating médio entre elegíveis (>= 5 partidas)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p1",
          [
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p1", rating: 1.20, team: "A", match: { id: "m5", scoreTeamA: 13, scoreTeamB: 5 } },
          ],
        ],
        [
          "p2",
          [
            { playerId: "p2", rating: 1.35, team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p2", rating: 1.30, team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p2", rating: 1.25, team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p2", rating: 1.30, team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p2", rating: 1.30, team: "A", match: { id: "m5", scoreTeamA: 13, scoreTeamB: 5 } },
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const result = getFeaturedPlayerFromDataset(dataset, []);
    expect(result.player).not.toBeNull();
    expect(result.player?.player.id).toBe("p2");
    expect(result.player?.rating).toBe(1.30);
    expect(result.player?.matchCount).toBe(5);
    expect(result.player?.winrate).toBe(100);
    expect(result.player?.justification).toContain("pelo menos 5 partidas com rating");
  });

  it("desempata por rating sem arredondamento, depois contagem de partidas, depois id estável", () => {
    const dataset = {
      activePlayers: [
        { id: "p_beta", nickname: "Beta", avatarUrl: null, levelGc: null },
        { id: "p_alpha", nickname: "Alpha", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p_beta",
          [
            { playerId: "p_beta", rating: 1.20, team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_beta", rating: 1.20, team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_beta", rating: 1.20, team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_beta", rating: 1.20, team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_beta", rating: 1.20, team: "A", match: { id: "m5", scoreTeamA: 13, scoreTeamB: 5 } },
          ],
        ],
        [
          "p_alpha",
          [
            { playerId: "p_alpha", rating: 1.20, team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_alpha", rating: 1.20, team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_alpha", rating: 1.20, team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_alpha", rating: 1.20, team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5 } },
            { playerId: "p_alpha", rating: 1.20, team: "A", match: { id: "m5", scoreTeamA: 13, scoreTeamB: 5 } },
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const result = getFeaturedPlayerFromDataset(dataset, []);
    expect(result.player?.player.id).toBe("p_alpha"); // desempate por id crescente
  });
});

describe("Radar do Grupo - getPeriodFactFromDataset", () => {
  it("prioriza maior sequência de vitórias (>= 3) e informa se está ativa", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p1",
          [
            // Índice 0 é mais recente -> vitórias ativas
            { playerId: "p1", team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-10") } },
            { playerId: "p1", team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-09") } },
            { playerId: "p1", team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-08") } },
            { playerId: "p1", team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-07") } },
            { playerId: "p1", team: "A", match: { id: "m5", scoreTeamA: 5, scoreTeamB: 13, playedAt: new Date("2026-10-06") } },
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const { periodFact } = getPeriodFactFromDataset(dataset, null);
    expect(periodFact).not.toBeNull();
    expect(periodFact?.kind).toBe("streak-active");
    expect(periodFact?.badgeLabel).toBe("EM ANDAMENTO");
    expect(periodFact?.streakCount).toBe(4);
  });

  it("identifica sequência concluída quando interrompida por derrota", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p1",
          [
            // Índice 0 é derrota, seguido de 3 vitórias anteriores
            { playerId: "p1", team: "A", match: { id: "m1", scoreTeamA: 5, scoreTeamB: 13, playedAt: new Date("2026-10-10") } },
            { playerId: "p1", team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-09") } },
            { playerId: "p1", team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-08") } },
            { playerId: "p1", team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-07") } },
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const { periodFact } = getPeriodFactFromDataset(dataset, null);
    expect(periodFact).not.toBeNull();
    expect(periodFact?.kind).toBe("streak-concluded");
    expect(periodFact?.badgeLabel).toBe("CONCLUÍDA");
    expect(periodFact?.streakCount).toBe(3);
    expect(periodFact?.detail).toContain("09/10/2026");
  });

  it("aplica regra de não repetição: prefere jogador diferente do destaque em caso de empate na sequência", () => {
    const dataset = {
      activePlayers: [
        { id: "p_featured", nickname: "Destaque", avatarUrl: null, levelGc: null },
        { id: "p_other", nickname: "Outro", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        [
          "p_featured",
          [
            { playerId: "p_featured", team: "A", match: { id: "m1", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-10") } },
            { playerId: "p_featured", team: "A", match: { id: "m2", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-09") } },
            { playerId: "p_featured", team: "A", match: { id: "m3", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-08") } },
          ],
        ],
        [
          "p_other",
          [
            { playerId: "p_other", team: "A", match: { id: "m4", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-09") } },
            { playerId: "p_other", team: "A", match: { id: "m5", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-08") } },
            { playerId: "p_other", team: "A", match: { id: "m6", scoreTeamA: 13, scoreTeamB: 5, playedAt: new Date("2026-10-07") } },
          ],
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const { periodFact } = getPeriodFactFromDataset(dataset, "p_featured");
    expect(periodFact?.player?.id).toBe("p_other");
  });

  it("recorre ao melhor mapa coletivo (>= 5 partidas, WR > 50%) se não houver sequência >= 3", () => {
    const matches = [1, 2, 3, 4, 5].map((i) => ({
      playerId: "p1",
      team: "A",
      match: {
        id: `m${i}`,
        mapId: "m_inf",
        map: { name: "de_inferno" },
        scoreTeamA: 13,
        scoreTeamB: 5,
        playedAt: new Date("2026-10-01"),
      },
    }));

    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null }],
      statsByPlayer: new Map([["p1", []]]), // sem stats individuais consecutivas
      allStats: matches,
    };

    // @ts-ignore
    const { periodFact } = getPeriodFactFromDataset(dataset, null);
    expect(periodFact).not.toBeNull();
    expect(periodFact?.kind).toBe("collective-map");
    expect(periodFact?.badgeLabel).toBe("MAPA DO GRUPO");
    expect(periodFact?.mapName).toBe("Inferno");
  });
});

describe("Radar do Grupo - getAttentionPointFromDataset", () => {
  it("retorna estado vazio com mensagem de dados insuficientes quando ninguém tem 20 partidas", () => {
    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null }],
      statsByPlayer: new Map([
        [
          "p1",
          Array.from({ length: 15 }, (_, i) => ({
            rating: 1.20,
            match: { id: `m${i}` },
          })),
        ],
      ]),
      allStats: [],
    };

    // @ts-ignore
    const result = getAttentionPointFromDataset([], dataset);
    expect(result.attentionPoint).toBeNull();
    expect(result.emptyReason).toBe("Dados insuficientes para comparar dois blocos de 10 partidas.");
  });

  it("retorna mensagem de nenhuma queda de 0,10 ou mais quando jogadores com 20 partidas não caíram", () => {
    const dataset = {
      activePlayers: [{ id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null }],
      statsByPlayer: new Map([
        [
          "p1",
          Array.from({ length: 20 }, (_, i) => ({
            rating: 1.20,
            match: { id: `m${i}` },
          })),
        ],
      ]),
      allStats: [],
    };

    const seasonComparison = [
      {
        player: { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
        season: { rating: 1.20, adr: 80, kd: 1.1, winrate: 50, matchCount: 10 },
        recent: { rating: 1.15, adr: 78, kd: 1.05, winrate: 50, matchCount: 10 },
        diff: { rating: -0.05, adr: -2, kd: -0.05, winrate: 0 },
        rawDiff: -0.05,
        recentMatches: [],
      },
    ];

    // @ts-ignore
    const result = getAttentionPointFromDataset(seasonComparison, dataset);
    expect(result.attentionPoint).toBeNull();
    expect(result.emptyReason).toBe("Nenhuma queda de rating de 0,10 ou mais identificada.");
  });

  it("seleciona a queda mais acentuada (rawDiff <= -0.10) e exibe os blocos", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: null },
      ],
      statsByPlayer: new Map([
        ["p1", Array.from({ length: 20 }, (_, i) => ({ rating: 1.2, match: { id: `m1_${i}` } }))],
        ["p2", Array.from({ length: 20 }, (_, i) => ({ rating: 1.2, match: { id: `m2_${i}` } }))],
      ]),
      allStats: [],
    };

    const seasonComparison = [
      {
        player: { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: null },
        season: { rating: 1.30, adr: 85, kd: 1.2, winrate: 60, matchCount: 10 },
        recent: { rating: 1.15, adr: 75, kd: 1.0, winrate: 40, matchCount: 10 },
        diff: { rating: -0.15, adr: -10, kd: -0.2, winrate: -20 },
        rawDiff: -0.15,
        recentMatches: [],
      },
      {
        player: { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: null },
        season: { rating: 1.35, adr: 90, kd: 1.3, winrate: 70, matchCount: 10 },
        recent: { rating: 1.04, adr: 70, kd: 0.9, winrate: 30, matchCount: 10 },
        diff: { rating: -0.31, adr: -20, kd: -0.4, winrate: -40 },
        rawDiff: -0.312,
        recentMatches: [],
      },
    ];

    // @ts-ignore
    const result = getAttentionPointFromDataset(seasonComparison, dataset);
    expect(result.attentionPoint).not.toBeNull();
    expect(result.attentionPoint?.player.id).toBe("p2");
    expect(result.attentionPoint?.dropRating).toBe(0.31);
    expect(result.attentionPoint?.previousRating).toBe(1.35);
    expect(result.attentionPoint?.recentRating).toBe(1.04);
  });
});



