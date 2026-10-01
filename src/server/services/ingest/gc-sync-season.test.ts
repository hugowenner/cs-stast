import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { gcSyncMatch } from "./gc-sync.service";
import { ensureCurrentSeason } from "@/server/services/season.service";
import * as matchRepo from "@/server/repositories/match.repository";
import * as importRepo from "@/server/repositories/import.repository";
import type { SyncMatchInput } from "@/server/dtos/sync.dto";

vi.mock("@/server/db", () => ({
  prisma: { match: { update: vi.fn() } },
}));
vi.mock("@/server/services/season.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/season.service")>(),
  ensureCurrentSeason: vi.fn(),
}));
vi.mock("@/server/repositories/match.repository", () => ({
  findMatchByGamersClubId: vi.fn(),
  createMatchWithStats: vi.fn(),
}));
vi.mock("@/server/repositories/session.repository", () => ({
  findOrCreateSessionForDate: vi.fn(async () => ({ id: "session-id" })),
}));
vi.mock("@/server/repositories/map.repository", () => ({
  upsertMapByName: vi.fn(async () => ({ id: "map-id" })),
}));
vi.mock("@/server/repositories/player.repository", () => ({
  countActiveTrackedPlayersAmong: vi.fn(async () => 0),
}));
vi.mock("@/server/repositories/import.repository", () => ({
  createImportLog: vi.fn(async () => ({ id: "import-id" })),
  completeImportLog: vi.fn(),
}));
vi.mock("@/server/repositories/playerMatchStats.repository", () => ({}));
vi.mock("@/server/domain/achievements", () => ({
  evaluateMatchAchievements: vi.fn(() => []),
}));
vi.mock("@/server/services/achievement.service", () => ({
  grantAchievements: vi.fn(),
}));
vi.mock("@/server/services/elo/elo.service", () => ({
  calculateEloForMatch: vi.fn(async () => []),
}));
vi.mock("@/server/services/rivalry/rivalry.service", () => ({
  rebuildRivalriesForPlayers: vi.fn(),
}));
vi.mock("@/server/services/sync-job.service", () => ({
  maybeEnqueueDemoAnalysis: vi.fn(),
}));

const input: SyncMatchInput = {
  matchId: "27984127",
  map: "Mirage",
  playedAt: new Date("2026-09-30T22:24:00Z"),
  scoreTeamA: 13,
  scoreTeamB: 8,
  durationSeconds: 0,
  // Os efeitos por jogador são excluídos deste teste da persistência de temporada.
  players: [],
};
const september = {
  id: "sep-id",
  name: "Setembro/2026",
  startDate: new Date("2026-09-01T00:00:00Z"),
  endDate: new Date("2026-09-30T23:59:59.999Z"),
  status: "CLOSED" as const,
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

describe("GC sync season persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves the historical season when an existing match is resent", async () => {
    vi.mocked(matchRepo.findMatchByGamersClubId).mockResolvedValue({
      id: "existing-match-id",
    } as NonNullable<Awaited<ReturnType<typeof matchRepo.findMatchByGamersClubId>>>);
    vi.mocked(ensureCurrentSeason).mockResolvedValue(september);

    await gcSyncMatch(input, { skipEnqueue: true });

    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: "existing-match-id" },
      data: {
        playedAt: input.playedAt,
        sessionId: "session-id",
        seasonId: september.id,
        scoreTeamA: 13,
        scoreTeamB: 8,
      },
    });
  });

  it.each([false, true])("rejects mismatched season before match persistence (existing=%s)", async (existing) => {
    vi.mocked(matchRepo.findMatchByGamersClubId).mockResolvedValue(
      existing
        ? { id: "existing-match-id" } as NonNullable<Awaited<ReturnType<typeof matchRepo.findMatchByGamersClubId>>>
        : null,
    );
    vi.mocked(ensureCurrentSeason).mockResolvedValue({
      ...september,
      id: "oct-id",
      startDate: new Date("2026-10-01T00:00:00Z"),
      endDate: new Date("2026-10-31T23:59:59.999Z"),
      status: "ACTIVE",
    });

    await expect(gcSyncMatch(input, { skipEnqueue: true })).rejects.toThrow("Season mismatch");
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(matchRepo.createMatchWithStats).not.toHaveBeenCalled();
    if (!existing) {
      expect(importRepo.completeImportLog).toHaveBeenCalledWith("import-id", {
        status: "FAILED",
        errorMessage: expect.stringContaining("Season mismatch"),
      });
    }
  });
});
