import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDashboardSummary } from "./dashboard.service";
import * as statsService from "@/server/services/stats.service";
import * as playerRepo from "@/server/repositories/player.repository";
import { prisma } from "@/server/db";

vi.mock("@/server/db", () => ({
  prisma: {
    match: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    session: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    map: {
      findUnique: vi.fn(),
    },
    playerMatchStats: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/player.repository", () => ({
  countPlayers: vi.fn(),
}));

vi.mock("@/server/services/season.service", () => ({
  resolveSeasonId: vi.fn().mockImplementation((id) => Promise.resolve(id ?? "test-season-id")),
  getActiveSeason: vi.fn().mockResolvedValue({ id: "test-season-id", name: "Outubro/2026" }),
}));

vi.mock("@/server/services/stats.service", () => ({
  getSeasonScoreRanking: vi.fn(),
  getRanking: vi.fn(),
}));

describe("getDashboardSummary - Season Score 3.5 MVP Alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.match.count).mockResolvedValue(10);
    vi.mocked(playerRepo.countPlayers).mockResolvedValue(12);
    vi.mocked(prisma.session.count).mockResolvedValue(4);
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.match.aggregate).mockResolvedValue({
      _sum: { scoreTeamA: 130, scoreTeamB: 100 },
    } as any);
    vi.mocked(prisma.match.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.playerMatchStats.findMany).mockResolvedValue([]);
  });

  it("deve selecionar o líder oficial de Season Score 3.5 como MVP quando houver jogador elegível (N >= 10)", async () => {
    const mockSeasonLeader = {
      player: {
        id: "p-travis",
        nickname: "TRAVIS SCOUTTT",
        avatarUrl: "https://avatar.url/travis",
      },
      matchesPlayed: 45,
      value: 1.285, // Season score oficial
      rHat: 1.250,
      pHat: 0.650,
      confidenceStatus: "high",
      isEligible: true,
      rawRating: 1.270,
      rawScore: 1.285,
    };

    vi.mocked(statsService.getSeasonScoreRanking).mockResolvedValue([mockSeasonLeader] as any);

    const summary = await getDashboardSummary("test-season-id");

    expect(statsService.getSeasonScoreRanking).toHaveBeenCalledWith("test-season-id", 1);
    expect(summary.bestPlayer).toEqual({
      nickname: "TRAVIS SCOUTTT",
      rating: 1.285,
      rawRating: 1.270,
      matchesPlayed: 45,
      avatarUrl: "https://avatar.url/travis",
    });
  });

  it("deve usar o líder provisório do Season Score como fallback se nenhum jogador atingiu N >= 10", async () => {
    // 1ª chamada (oficial N >= 10) retorna vazio
    // 2ª chamada (provisional includeProvisional=true) retorna o líder provisório
    vi.mocked(statsService.getSeasonScoreRanking)
      .mockResolvedValueOnce([]) // oficial vazio
      .mockResolvedValueOnce([
        {
          player: {
            id: "p-provisional",
            nickname: "Provisional Hero",
            avatarUrl: null,
          },
          matchesPlayed: 4,
          value: 1.150,
          rawRating: 1.300,
          rawScore: 1.150,
        },
      ] as any);

    const summary = await getDashboardSummary("test-season-id");

    expect(statsService.getSeasonScoreRanking).toHaveBeenCalledTimes(2);
    expect(statsService.getSeasonScoreRanking).toHaveBeenNthCalledWith(2, "test-season-id", 1, {
      includeProvisional: true,
    });
    expect(summary.bestPlayer).toEqual({
      nickname: "Provisional Hero",
      rating: 1.150,
      rawRating: 1.300,
      matchesPlayed: 4,
      avatarUrl: null,
    });
  });

  it("deve retornar null para bestPlayer se não houver nenhum jogador na temporada", async () => {
    vi.mocked(statsService.getSeasonScoreRanking)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const summary = await getDashboardSummary("test-season-id");
    expect(summary.bestPlayer).toBeNull();
  });
});
