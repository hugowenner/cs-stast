import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addPlayerForAdmin,
  updatePlayerForAdmin,
  deletePlayerForAdmin,
  syncPlayerForAdmin,
} from "./player.service";
import { prisma } from "@/server/db";
import { getPlayerSummaries, syncPlayerSteamProfile } from "./steam-profile.service";

vi.mock("@/server/db", () => {
  const mockPlayer = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockTrackedPlayer = {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockPlayerAchievement = {
    deleteMany: vi.fn(),
  };
  const mockEvent = {
    deleteMany: vi.fn(),
  };
  const mockRivalry = {
    deleteMany: vi.fn(),
  };

  return {
    prisma: {
      player: mockPlayer,
      trackedPlayer: mockTrackedPlayer,
      playerAchievement: mockPlayerAchievement,
      event: mockEvent,
      rivalry: mockRivalry,
      $transaction: vi.fn(async (actions) => actions),
    },
  };
});

vi.mock("./steam-profile.service", () => ({
  getPlayerSummaries: vi.fn(async (ids: string[]) => {
    if (ids.includes("invalid-steam")) return [];
    return [
      {
        steamid: ids[0],
        personaname: "Steam Player Nick",
        avatarfull: "https://avatar.url/avatar.jpg",
        profileurl: "https://steamcommunity.com/profiles/" + ids[0],
        avatar: "https://avatar.url/small.jpg",
        avatarmedium: "https://avatar.url/medium.jpg",
      },
    ];
  }),
  syncPlayerSteamProfile: vi.fn(async (steamId: string) => {
    if (steamId === "fail-steam") return "failed";
    return "synced";
  }),
  resolveVanityUrl: vi.fn(async (vanity: string) => {
    if (vanity === "myvanityname") return "76561198034567890";
    return null;
  }),
}));

describe("Player Administration Service Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addPlayerForAdmin", () => {
    it("should successfully add a new player with Steam ID and GC ID", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.player.upsert).mockResolvedValue({
        id: "p1",
        steamId: "76561198012345678",
        nickname: "Steam Player Nick",
        avatarUrl: "https://avatar.url/avatar.jpg",
        gamersClubId: "123456",
      } as any);

      const res = await addPlayerForAdmin("76561198012345678", "123456");

      expect(res.nickname).toBe("Steam Player Nick");
      expect(prisma.player.upsert).toHaveBeenCalled();
      expect(prisma.trackedPlayer.upsert).toHaveBeenCalled();
    });

    it("should throw error if player is already monitored", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        nickname: "Already Active",
        trackedPlayer: { active: true },
      } as any);

      await expect(addPlayerForAdmin("76561198012345678", "123456")).rejects.toThrow(
        "já está sendo monitorado"
      );
    });

    it("should throw error if Gamers Club ID is missing and cannot be resolved", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue(null);
      
      await expect(addPlayerForAdmin("76561198012345678")).rejects.toThrow(
        "A gamersClubId é obrigatória"
      );
    });
  });

  describe("updatePlayerForAdmin", () => {
    it("should successfully update player details and monitoring status", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        steamId: "76561198012345678",
        nickname: "Old Nick",
        gamersClubId: "123456",
      } as any);
      vi.mocked(prisma.player.update).mockResolvedValue({
        id: "p1",
        nickname: "New Nick",
      } as any);

      const res = await updatePlayerForAdmin("p1", {
        nickname: "New Nick",
        gamersClubId: "999999",
        active: false,
      });

      expect(res.nickname).toBe("New Nick");
      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: { nickname: "New Nick", gamersClubId: "999999" },
        })
      );
    });

    it("should throw error if player does not exist", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue(null);

      await expect(
        updatePlayerForAdmin("p-nonexistent", {
          nickname: "New Nick",
          gamersClubId: "123",
          active: true,
        })
      ).rejects.toThrow("Jogador não encontrado");
    });
  });

  describe("deletePlayerForAdmin", () => {
    it("should successfully untrack a player without removing database records", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        _count: { matchStats: 10 },
      } as any);

      const res = await deletePlayerForAdmin("p1", "untrack");

      expect(res.success).toBe(true);
      expect(prisma.trackedPlayer.deleteMany).toHaveBeenCalledWith({
        where: { playerId: "p1" },
      });
      expect(prisma.player.delete).not.toHaveBeenCalled();
    });

    it("should successfully perform full delete if player has 0 match statistics", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        _count: { matchStats: 0 },
      } as any);

      const res = await deletePlayerForAdmin("p1", "full");

      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should throw error on full delete if player has active match statistics", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        _count: { matchStats: 5 },
      } as any);

      await expect(deletePlayerForAdmin("p1", "full")).rejects.toThrow(
        "Este jogador possui histórico de partidas registradas"
      );
    });
  });

  describe("syncPlayerForAdmin", () => {
    it("should successfully trigger the Steam profile sync pipeline", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        steamId: "76561198012345678",
      } as any);

      const res = await syncPlayerForAdmin("p1");

      expect(res.success).toBe(true);
      expect(syncPlayerSteamProfile).toHaveBeenCalledWith("76561198012345678");
    });

    it("should throw error if the Steam API synchronization fails", async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: "p1",
        steamId: "fail-steam",
      } as any);

      await expect(syncPlayerForAdmin("p1")).rejects.toThrow("Falha na API da Steam");
    });
  });
});
