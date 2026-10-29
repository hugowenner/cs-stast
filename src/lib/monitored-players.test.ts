import { describe, it, expect } from "vitest";
import {
  transformMonitoredPlayersForCarousel,
  comparePlayersDeterministic,
  formatCompactRatingVariation,
  MIN_MATCHES_TO_SHOW,
  MIN_MATCHES_FOR_FULL_SAMPLE,
} from "./monitored-players";
import type { MonitoredPlayerEntry, SeasonComparisonEntry } from "@/server/services/competitive.service";

function createMockPlayer(overrides: Partial<MonitoredPlayerEntry>): MonitoredPlayerEntry {
  return {
    rank: 1,
    player: {
      id: overrides.player?.id ?? "p-1",
      nickname: overrides.player?.nickname ?? "Player",
      avatarUrl: null,
      levelGc: null,
    },
    rating: 1.0,
    adr: 80,
    kd: 1.0,
    kast: 70,
    winrate: 50,
    hsPercent: 40,
    matchCount: 10,
    seasonMatchCount: 10,
    totalKills: 150,
    totalDeaths: 150,
    totalAssists: 30,
    forma: "Estável",
    bestMap: null,
    worstMap: null,
    lastMatchDate: new Date("2026-10-20"),
    ...overrides,
  };
}

describe("transformMonitoredPlayersForCarousel", () => {
  it("descarta jogadores com menos de 5 partidas (limite de 4)", () => {
    const input: MonitoredPlayerEntry[] = [
      createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 4, seasonMatchCount: 4, rating: 1.5 }),
      createMockPlayer({ player: { id: "p2", nickname: "P2", avatarUrl: null, levelGc: null }, matchCount: 5, seasonMatchCount: 5, rating: 1.2 }),
    ];

    const result = transformMonitoredPlayersForCarousel(input);
    expect(result).toHaveLength(1);
    expect(result[0].player.nickname).toBe("P2");
  });

  it("classifica jogadores com 5 a 9 partidas como Amostra Inicial (sem rank numérico ou destaque de líder)", () => {
    const input: MonitoredPlayerEntry[] = [
      createMockPlayer({ player: { id: "p1", nickname: "Cinco", avatarUrl: null, levelGc: null }, matchCount: 5, seasonMatchCount: 5, rating: 1.3 }),
      createMockPlayer({ player: { id: "p2", nickname: "Nove", avatarUrl: null, levelGc: null }, matchCount: 9, seasonMatchCount: 9, rating: 1.4 }),
    ];

    const result = transformMonitoredPlayersForCarousel(input);
    expect(result).toHaveLength(2);

    expect(result[0].player.nickname).toBe("Nove");
    expect(result[0].isInitialSample).toBe(true);
    expect(result[0].displayRank).toBeNull();

    expect(result[1].player.nickname).toBe("Cinco");
    expect(result[1].isInitialSample).toBe(true);
    expect(result[1].displayRank).toBeNull();
  });

  it("posiciona jogador com 5 partidas e Rating alto DEPOIS de um jogador com 10 partidas e Rating menor", () => {
    const highRatingInitial = createMockPlayer({
      player: { id: "p-init", nickname: "SuperStar5Games", avatarUrl: null, levelGc: null },
      rating: 2.10,
      matchCount: 5,
      seasonMatchCount: 5,
    });

    const modestRatingFull = createMockPlayer({
      player: { id: "p-full", nickname: "Consistent10Games", avatarUrl: null, levelGc: null },
      rating: 1.05,
      matchCount: 10,
      seasonMatchCount: 10,
    });

    const result = transformMonitoredPlayersForCarousel([highRatingInitial, modestRatingFull]);

    expect(result).toHaveLength(2);
    // Jogador com 10 partidas deve ser o primeiro da lista, com rank #1
    expect(result[0].player.nickname).toBe("Consistent10Games");
    expect(result[0].displayRank).toBe(1);
    expect(result[0].isInitialSample).toBe(false);

    // Jogador com 5 partidas deve vir DEPOIS, sem rank numérico
    expect(result[1].player.nickname).toBe("SuperStar5Games");
    expect(result[1].displayRank).toBeNull();
    expect(result[1].isInitialSample).toBe(true);
  });

  it("mantém a amostra limitada a 10 para as métricas, mas preserva o total real de partidas da temporada", () => {
    const veteran = createMockPlayer({
      player: { id: "vet", nickname: "Veteran84", avatarUrl: null, levelGc: null },
      matchCount: 10, // analisadas
      seasonMatchCount: 84, // total da temporada
      rating: 1.30,
    });

    const result = transformMonitoredPlayersForCarousel([veteran]);

    expect(result).toHaveLength(1);
    expect(result[0].sampleMatches).toBe(10);
    expect(result[0].totalSeasonMatches).toBe(84);
    expect(result[0].displayRank).toBe(1);
    expect(result[0].isInitialSample).toBe(false);
  });

  it("exibe somente jogadores com >= 5 quando ninguém atingir 10 partidas, todos sem rank e sem destaque", () => {
    const input: MonitoredPlayerEntry[] = [
      createMockPlayer({ player: { id: "p1", nickname: "PlayerA", avatarUrl: null, levelGc: null }, matchCount: 6, seasonMatchCount: 6, rating: 1.15 }),
      createMockPlayer({ player: { id: "p2", nickname: "PlayerB", avatarUrl: null, levelGc: null }, matchCount: 8, seasonMatchCount: 8, rating: 1.45 }),
      createMockPlayer({ player: { id: "p3", nickname: "PlayerC", avatarUrl: null, levelGc: null }, matchCount: 3, seasonMatchCount: 3, rating: 1.90 }),
    ];

    const result = transformMonitoredPlayersForCarousel(input);

    expect(result).toHaveLength(2); // Descarta PlayerC (< 5)
    // Ordenados por rating desc
    expect(result[0].player.nickname).toBe("PlayerB");
    expect(result[0].displayRank).toBeNull();
    expect(result[0].isInitialSample).toBe(true);

    expect(result[1].player.nickname).toBe("PlayerA");
    expect(result[1].displayRank).toBeNull();
    expect(result[1].isInitialSample).toBe(true);
  });

  it("retorna array vazio quando nenhum jogador é elegível (< 5 partidas)", () => {
    const input: MonitoredPlayerEntry[] = [
      createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 1, seasonMatchCount: 1 }),
      createMockPlayer({ player: { id: "p2", nickname: "P2", avatarUrl: null, levelGc: null }, matchCount: 4, seasonMatchCount: 4 }),
    ];

    const result = transformMonitoredPlayersForCarousel(input);
    expect(result).toEqual([]);
  });

  it("aplica desempate determinístico em caso de Ratings idênticos", () => {
    const p1 = createMockPlayer({
      player: { id: "1", nickname: "Beta", avatarUrl: null, levelGc: null },
      rating: 1.20,
      winrate: 50,
      kd: 1.10,
      adr: 85,
      seasonMatchCount: 10,
    });

    const p2 = createMockPlayer({
      player: { id: "2", nickname: "Alpha", avatarUrl: null, levelGc: null },
      rating: 1.20,
      winrate: 60, // Maior winrate vence
      kd: 1.10,
      adr: 85,
      seasonMatchCount: 10,
    });

    const p3 = createMockPlayer({
      player: { id: "3", nickname: "Charlie", avatarUrl: null, levelGc: null },
      rating: 1.20,
      winrate: 50,
      kd: 1.15, // Maior KD vence o p1
      adr: 85,
      seasonMatchCount: 10,
    });

    const p4 = createMockPlayer({
      player: { id: "4", nickname: "Alpha2", avatarUrl: null, levelGc: null },
      rating: 1.20,
      winrate: 50,
      kd: 1.10,
      adr: 85, // Empate total com p1, desempate por nickname ("Alpha2" < "Beta")
      seasonMatchCount: 10,
    });

    const result = transformMonitoredPlayersForCarousel([p1, p2, p3, p4]);

    expect(result.map((p) => p.player.nickname)).toEqual([
      "Alpha",   // Maior WR (60%)
      "Charlie", // Maior KD (1.15)
      "Alpha2",  // Nickname "Alpha2" antes de "Beta"
      "Beta",
    ]);

    expect(result.map((p) => p.displayRank)).toEqual([1, 2, 3, 4]);
  });

  it("não muta o array original recebido", () => {
    const input: MonitoredPlayerEntry[] = [
      createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 10, seasonMatchCount: 10, rank: 99 }),
    ];

    const originalRank = input[0].rank;
    transformMonitoredPlayersForCarousel(input);

    expect(input[0].rank).toBe(originalRank);
    expect(input[0]).toEqual(createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 10, seasonMatchCount: 10, rank: 99 }));
  });

  it("atribui variação compacta de rating apenas a jogadores com dois blocos de 10 completos (seasonComparison)", () => {
    const p1 = createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 10, seasonMatchCount: 20 });
    const p2 = createMockPlayer({ player: { id: "p2", nickname: "P2", avatarUrl: null, levelGc: null }, matchCount: 10, seasonMatchCount: 14 });

    const mockComparison: SeasonComparisonEntry[] = [
      {
        player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null },
        rawDiff: 0.281,
        season: { rating: 1.0, adr: 80, kd: 1.0, winrate: 50, matchCount: 10 },
        recent: { rating: 1.28, adr: 95, kd: 1.3, winrate: 70, matchCount: 10 },
        diff: { rating: 0.28, adr: 15, kd: 0.3, winrate: 20 },
        recentMatches: [],
      },
    ];

    const result = transformMonitoredPlayersForCarousel([p1, p2], undefined, mockComparison);

    expect(result).toHaveLength(2);
    const resultP1 = result.find((r) => r.player.id === "p1");
    const resultP2 = result.find((r) => r.player.id === "p2");

    expect(resultP1?.ratingVariation).toEqual({
      rawDiff: 0.281,
      formatted: "↑ +0,28",
      type: "up",
      arrow: "↑",
    });

    expect(resultP2?.ratingVariation).toBeNull();
  });

  it("omite indicador de variação em temporadas históricas ou quando seasonComparison não for fornecida", () => {
    const p1 = createMockPlayer({ player: { id: "p1", nickname: "P1", avatarUrl: null, levelGc: null }, matchCount: 10, seasonMatchCount: 25 });
    const result = transformMonitoredPlayersForCarousel([p1], undefined, undefined);

    expect(result[0].ratingVariation).toBeNull();
  });
});

describe("formatCompactRatingVariation", () => {
  it("formata evolução positiva corretamente com seta para cima e sinal de mais", () => {
    const res = formatCompactRatingVariation(0.284);
    expect(res).toEqual({
      rawDiff: 0.284,
      formatted: "↑ +0,28",
      type: "up",
      arrow: "↑",
    });
  });

  it("formata queda negativa corretamente com seta para baixo e sinal de menos U+2212", () => {
    const res = formatCompactRatingVariation(-0.174);
    expect(res).toEqual({
      rawDiff: -0.174,
      formatted: "↓ −0,17",
      type: "down",
      arrow: "↓",
    });
  });

  it("formata variação que arredonda para zero em 2 casas como neutra, sem sinal negativo ou indicação de alta/queda", () => {
    const resZero = formatCompactRatingVariation(0);
    expect(resZero).toEqual({
      rawDiff: 0,
      formatted: "→ 0,00",
      type: "neutral",
      arrow: "→",
    });

    const resSmallPos = formatCompactRatingVariation(0.003);
    expect(resSmallPos).toEqual({
      rawDiff: 0.003,
      formatted: "→ 0,00",
      type: "neutral",
      arrow: "→",
    });

    const resSmallNeg = formatCompactRatingVariation(-0.004);
    expect(resSmallNeg).toEqual({
      rawDiff: -0.004,
      formatted: "→ 0,00",
      type: "neutral",
      arrow: "→",
    });
  });

  it("diferencia limiar de 0,005 para 0,01", () => {
    const resPos = formatCompactRatingVariation(0.005);
    expect(resPos?.formatted).toBe("↑ +0,01");
    expect(resPos?.type).toBe("up");

    const resNeg = formatCompactRatingVariation(-0.005);
    expect(resNeg?.formatted).toBe("↓ −0,01");
    expect(resNeg?.type).toBe("down");
  });

  it("retorna null para valores não numéricos ou inválidos", () => {
    expect(formatCompactRatingVariation(NaN)).toBeNull();
    expect(formatCompactRatingVariation(Infinity)).toBeNull();
  });
});
