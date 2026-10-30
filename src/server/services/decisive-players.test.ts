import { describe, expect, it, vi, afterEach } from "vitest";
import {
  computeDecisiveCategories,
  type DecisivePlayerEntry,
} from "./competitive.service";

function createMockEntry(overrides: Partial<DecisivePlayerEntry> = {}): DecisivePlayerEntry {
  return {
    player: { id: "p1", nickname: "Player 1", avatarUrl: null },
    impactPercent: 25,
    entryKills: 10,
    entryDeaths: 10,
    openingWinrate: 50,
    tradeKills: 10,
    tradedDeaths: 5,
    tradeEfficiency: 25,
    clutchWins: 5,
    hideTradesAndClutches: false,
    matchCount: 15,
    totalRounds: 300,
    totalDeaths: 100,
    totalOpeningDuels: 20,
    clutchAttempts: 15,
    clutchWinrate: 33,
    clutchHighDisadvantageWins: 2,
    clutchTiers: {
      "1v1": { wins: 3, attempts: 5, winrate: 60 },
      "1v2": { wins: 2, attempts: 5, winrate: 40 },
      "1v3": { wins: 0, attempts: 3, winrate: 0 },
      "1v4": { wins: 0, attempts: 1, winrate: 0 },
      "1v5": { wins: 0, attempts: 1, winrate: 0 },
    },
    teamWinrateAfterFk: 70,
    roundsWonAfterFk: 7,
    firstKillsWithRoundData: 10,
    avgTradeReactionTime: 1.5,
    deathsInTradeMatches: 20,
    tradeTelemetryMatchesCount: 5,
    ...overrides,
  };
}

describe("FASE 1: Jogadores Decisivos (computeDecisiveCategories)", () => {
  describe("Rei do Clutch", () => {
    it("seleciona jogador com maior número absoluto de clutches vencidos", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        clutchWins: 15,
        clutchAttempts: 40,
        clutchWinrate: 38,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        clutchWins: 20,
        clutchAttempts: 40,
        clutchWinrate: 50,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.reiDoClutch.leader?.player.id).toBe("p2");
      expect(result.reiDoClutch.isPreliminary).toBe(false);
    });

    it("aplica desempate 1: maior taxa de conversão (vencidos / tentados)", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        clutchWins: 15,
        clutchAttempts: 50, // 30% WR
        clutchWinrate: 30,
        rawClutchWinrate: 30.0,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        clutchWins: 15,
        clutchAttempts: 30, // 50% WR
        clutchWinrate: 50,
        rawClutchWinrate: 50.0,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.reiDoClutch.leader?.player.id).toBe("p2");
    });

    it("aplica desempate 2: maior número de vitórias em alta desvantagem (1v2+)", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        clutchWins: 15,
        clutchAttempts: 35,
        clutchWinrate: 43,
        rawClutchWinrate: 42.857,
        clutchHighDisadvantageWins: 8,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        clutchWins: 15,
        clutchAttempts: 35,
        clutchWinrate: 43,
        rawClutchWinrate: 42.857,
        clutchHighDisadvantageWins: 4,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.reiDoClutch.leader?.player.id).toBe("p1");
    });

    it("aplica desempate 3: id do jogador determinístico", () => {
      const pB = createMockEntry({
        player: { id: "b_player", nickname: "B Player", avatarUrl: null },
        clutchWins: 10,
        clutchAttempts: 35,
        rawClutchWinrate: 28.57,
        clutchHighDisadvantageWins: 3,
      });
      const pA = createMockEntry({
        player: { id: "a_player", nickname: "A Player", avatarUrl: null },
        clutchWins: 10,
        clutchAttempts: 35,
        rawClutchWinrate: 28.57,
        clutchHighDisadvantageWins: 3,
      });

      const result = computeDecisiveCategories([pB, pA]);
      expect(result.reiDoClutch.leader?.player.id).toBe("a_player");
    });

    it("ativa amostra preliminar quando nenhum jogador atinge 30 tentativas", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        clutchWins: 6,
        clutchAttempts: 15, // abaixo de 30
      });

      const result = computeDecisiveCategories([p1]);
      expect(result.reiDoClutch.leader?.player.id).toBe("p1");
      expect(result.reiDoClutch.isPreliminary).toBe(true);
    });
  });

  describe("Ponta de Lança", () => {
    it("seleciona jogador com maior número de first kills", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        entryKills: 60,
        entryDeaths: 40,
        totalOpeningDuels: 100,
        openingWinrate: 60,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        entryKills: 85,
        entryDeaths: 45,
        totalOpeningDuels: 130,
        openingWinrate: 65,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.pontaDeLanca.leader?.player.id).toBe("p2");
      expect(result.pontaDeLanca.isPreliminary).toBe(false);
    });

    it("aplica desempate 1: maior Opening Winrate %", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        entryKills: 50,
        entryDeaths: 50,
        totalOpeningDuels: 100,
        rawOpeningWinrate: 50.0,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        entryKills: 50,
        entryDeaths: 25,
        totalOpeningDuels: 75,
        rawOpeningWinrate: 66.67,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.pontaDeLanca.leader?.player.id).toBe("p2");
    });

    it("aplica desempate 2: maior taxa de vitória da equipe após FK", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        entryKills: 50,
        entryDeaths: 25,
        totalOpeningDuels: 75,
        rawOpeningWinrate: 66.67,
        rawTeamWinrateAfterFk: 78.5,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        entryKills: 50,
        entryDeaths: 25,
        totalOpeningDuels: 75,
        rawOpeningWinrate: 66.67,
        rawTeamWinrateAfterFk: 68.0,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.pontaDeLanca.leader?.player.id).toBe("p1");
    });

    it("ativa amostra preliminar quando nenhum jogador atinge 50 duelos", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        entryKills: 15,
        entryDeaths: 10,
        totalOpeningDuels: 25, // abaixo de 50
      });

      const result = computeDecisiveCategories([p1]);
      expect(result.pontaDeLanca.leader?.player.id).toBe("p1");
      expect(result.pontaDeLanca.isPreliminary).toBe(true);
    });
  });

  describe("Anjo da Guarda", () => {
    it("seleciona jogador com maior número absoluto de trades executados", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        tradeKills: 45,
        deathsInTradeMatches: 60,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.45,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        tradeKills: 60,
        deathsInTradeMatches: 60,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.50,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.anjoDaGuarda.leader?.player.id).toBe("p2");
      expect(result.anjoDaGuarda.isPreliminary).toBe(false);
    });

    it("aplica desempate 1: menor tempo médio de reação em trades", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        tradeKills: 50,
        deathsInTradeMatches: 60,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.62,
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        tradeKills: 50,
        deathsInTradeMatches: 60,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.34, // mais rápido
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.anjoDaGuarda.leader?.player.id).toBe("p2");
    });

    it("aplica desempate 2: maior taxa de retaliação de mortes (deaths_traded / deaths_in_trade_matches)", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        tradeKills: 50,
        deathsInTradeMatches: 100,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.45,
        rawTradeEfficiency: 25.0, // 25% das mortes foram vingadas
      });
      const p2 = createMockEntry({
        player: { id: "p2", nickname: "Player 2", avatarUrl: null },
        tradeKills: 50,
        deathsInTradeMatches: 100,
        tradeTelemetryMatchesCount: 15,
        avgTradeReactionTime: 1.45,
        rawTradeEfficiency: 18.0,
      });

      const result = computeDecisiveCategories([p1, p2]);
      expect(result.anjoDaGuarda.leader?.player.id).toBe("p1");
    });

    it("ativa amostra preliminar quando não atinge limite mínimo de telemetria", () => {
      const p1 = createMockEntry({
        player: { id: "p1", nickname: "Player 1", avatarUrl: null },
        tradeKills: 5,
        deathsInTradeMatches: 12, // abaixo de 30 mortes
        tradeTelemetryMatchesCount: 3, // abaixo de 10 partidas
      });

      const result = computeDecisiveCategories([p1]);
      expect(result.anjoDaGuarda.leader?.player.id).toBe("p1");
      expect(result.anjoDaGuarda.isPreliminary).toBe(true);
    });
  });

  describe("Cenário de Amostra Parcial (Gamers Club sem Demos)", () => {
    it("não inventa 100% de winrate nem 0% de conversão quando faltam First Deaths e telemetria de rounds", () => {
      // Simula jogadores com apenas First Kills registrados via súmula GC
      const flpPartial = createMockEntry({
        player: { id: "flp", nickname: "Flp", avatarUrl: null },
        entryKills: 241,
        entryDeaths: null,
        totalOpeningDuels: null,
        openingWinrate: null,
        rawOpeningWinrate: null,
        teamWinrateAfterFk: null,
        rawTeamWinrateAfterFk: null,
        roundsWonAfterFk: null,
        firstKillsWithRoundData: null,
        hasOpeningDeathsTelemetry: false,
        clutchWins: 0,
        clutchAttempts: null,
        clutchWinrate: null,
        clutchTiers: null,
        hasClutchTelemetry: false,
        tradeKills: 0,
        deathsInTradeMatches: 0,
        tradeEfficiency: null,
        hasTradeTelemetry: false,
      });

      const pernaPartial = createMockEntry({
        player: { id: "perna", nickname: "PERNA PELUDA", avatarUrl: null },
        entryKills: 159,
        entryDeaths: null,
        totalOpeningDuels: null,
        openingWinrate: null,
        rawOpeningWinrate: null,
        teamWinrateAfterFk: null,
        rawTeamWinrateAfterFk: null,
        roundsWonAfterFk: null,
        firstKillsWithRoundData: null,
        hasOpeningDeathsTelemetry: false,
        clutchWins: 0,
        clutchAttempts: null,
        clutchWinrate: null,
        clutchTiers: null,
        hasClutchTelemetry: false,
        tradeKills: 0,
        deathsInTradeMatches: 0,
        tradeEfficiency: null,
        hasTradeTelemetry: false,
      });

      const result = computeDecisiveCategories([flpPartial, pernaPartial]);

      // 1. Ponta de Lança deve preservar o líder em First Kills mas sinalizar dados parciais
      expect(result.pontaDeLanca.hasTelemetry).toBe(true);
      expect(result.pontaDeLanca.isPartial).toBe(true);
      expect(result.pontaDeLanca.leader?.player.nickname).toBe("Flp");
      expect(result.pontaDeLanca.leader?.entryKills).toBe(241);

      // Não pode exibir 100% ou 0% sem denominador válido
      expect(result.pontaDeLanca.leader?.entryDeaths).toBeNull();
      expect(result.pontaDeLanca.leader?.totalOpeningDuels).toBeNull();
      expect(result.pontaDeLanca.leader?.openingWinrate).toBeNull();
      expect(result.pontaDeLanca.leader?.teamWinrateAfterFk).toBeNull();
      expect(result.pontaDeLanca.leader?.roundsWonAfterFk).toBeNull();
      expect(result.pontaDeLanca.leader?.firstKillsWithRoundData).toBeNull();

      // 2. Rei do Clutch e Anjo da Guarda permanecem indisponíveis
      expect(result.reiDoClutch.hasTelemetry).toBe(false);
      expect(result.reiDoClutch.leader).toBeNull();
      expect(result.anjoDaGuarda.hasTelemetry).toBe(false);
      expect(result.anjoDaGuarda.leader).toBeNull();
    });
  });

  describe("Dataset determinístico — sem consultar snapshots DEV mutáveis", () => {
    afterEach(() => vi.restoreAllMocks());
    async function fixture(full: boolean) {
      const { prisma } = await import("@/server/db");
      const { getDecisivePlayersFromDataset } = await import("./competitive.service");
      const player = { id: "p1", nickname: "Fixture Player", avatarUrl: null };
      const stats = Array.from({ length: 10 }, (_, i) => ({
        matchId: `m${i}`, playerId: "p1", entryKills: 3, entryDeaths: 0, tradeKills: 0,
        clutchesWon: 0, deaths: 10,
        match: { scoreTeamA: 13, scoreTeamB: 7, roundsJson: full && i === 0
          ? [{ number: 2, winner_team: "T" }] : null },
      }));
      vi.spyOn(prisma.playerMatchStats, "aggregate").mockResolvedValue({ _sum: {
        tradeKills: full ? 2 : 0, clutch1v1Wins: full ? 3 : 0, clutch1v2Wins: 0, clutchesWon: 0,
      } } as never);
      vi.spyOn(prisma.playerClutch, "groupBy").mockResolvedValue(full ? [
        { playerId: "p1", opponents: 1, won: true, _count: { id: 3 } },
        { playerId: "p1", opponents: 1, won: false, _count: { id: 2 } },
      ] as never : [] as never);
      vi.spyOn(prisma.playerTradeEvent, "groupBy")
        .mockResolvedValueOnce(full ? [{ traderId: "p1", _count: { id: 2 }, _avg: { timeDiff: 1.25 } }] as never : [] as never)
        .mockResolvedValueOnce(full ? [{ victimId: "p1", _count: { id: 1 } }] as never : [] as never);
      vi.spyOn(prisma.playerTradeEvent, "findMany").mockResolvedValue(full ? [{ matchId: "m0" }] as never : [] as never);
      vi.spyOn(prisma.playerEntryDuel, "groupBy").mockResolvedValue(full ? [
        { playerId: "p1", isKiller: true, _count: { id: 2 } },
        { playerId: "p1", isKiller: false, _count: { id: 1 } },
      ] as never : [] as never);
      vi.spyOn(prisma.playerEntryDuel, "findMany").mockResolvedValue(full ? [
        { matchId: "m0", playerId: "p1", roundNumber: 2, side: "A" },
      ] as never : [] as never);
      const dataset = { activePlayers: [player], allStats: stats, statsByPlayer: new Map([["p1", stats]]), seasonId: "fixture" };
      return getDecisivePlayersFromDataset(dataset as unknown as import("./competitive.service").CompetitiveDataset);
    }
    it("GC sem demo mantém First Deaths e denominadores indisponíveis", async () => {
      const entries = await fixture(false);
      expect(entries[0].entryKills).toBe(30);
      expect(entries[0].entryDeaths).toBeNull();
      expect(entries[0].openingWinrate).toBeNull();
      expect(entries[0].teamWinrateAfterFk).toBeNull();
      expect(entries[0].tradeEfficiency).toBeNull();
      const summary = computeDecisiveCategories(entries);
      expect(summary.pontaDeLanca.isPartial).toBe(true);
      expect(summary.reiDoClutch.hasTelemetry).toBe(false);
      expect(summary.anjoDaGuarda.hasTelemetry).toBe(false);
    });
    it("telemetria da fixture fornece taxas com numeradores e denominadores explícitos", async () => {
      const [entry] = await fixture(true);
      expect(entry.entryKills).toBe(2);
      expect(entry.entryDeaths).toBe(1);
      expect(entry.openingWinrate).toBe(67);
      expect(entry.clutchAttempts).toBe(5);
      expect(entry.clutchWinrate).toBe(60);
      expect(entry.teamWinrateAfterFk).toBe(100);
      expect(entry.deathsInTradeMatches).toBe(10);
      expect(entry.tradeEfficiency).toBe(10);
      expect(entry.avgTradeReactionTime).toBe(1.25);
    });
  });
});
