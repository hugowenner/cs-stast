import { describe, expect, it } from "vitest";
import { parserMatchSchema } from "./parser.dto";

describe("parserMatchSchema Contract Tests", () => {
  const validPlayer = {
    steamId: "76561198000000000",
    nickname: "Player 1",
    team: "A",
    kills: 20,
    deaths: 15,
    assists: 5,
    headshots: 10,
    adr: 85.5,
    kast: 75.0,
    damage: 1500,
    doubleKills: 3,
    tripleKills: 1,
    quadKills: 0,
    aces: 0,
  };

  const validMatch = {
    matchId: "123456",
    map: "Mirage",
    playedAt: "2026-08-06T10:00:00Z",
    scoreTeamA: 13,
    scoreTeamB: 11,
    durationSeconds: 2400,
    demoUrl: "http://example.com/demo.dem",
    players: [validPlayer],
  };

  it("should accept valid parser input", () => {
    const result = parserMatchSchema.safeParse(validMatch);
    expect(result.success).toBe(true);
  });

  it("should reject parser input if player has levelGc (strict check)", () => {
    const invalidPlayer = {
      ...validPlayer,
      levelGc: 12,
    };
    const invalidMatch = {
      ...validMatch,
      players: [invalidPlayer],
    };
    const result = parserMatchSchema.safeParse(invalidMatch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasUnrecognized = result.error.issues.some((err) =>
        err.code === "unrecognized_keys" && (err as any).keys?.includes("levelGc")
      );
      expect(hasUnrecognized).toBe(true);
    }
  });

  it("should reject parser input if player has gcRating (strict check)", () => {
    const invalidPlayer = {
      ...validPlayer,
      gcRating: 1.25,
    };
    const invalidMatch = {
      ...validMatch,
      players: [invalidPlayer],
    };
    const result = parserMatchSchema.safeParse(invalidMatch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasUnrecognized = result.error.issues.some((err) =>
        err.code === "unrecognized_keys" && (err as any).keys?.includes("gcRating")
      );
      expect(hasUnrecognized).toBe(true);
    }
  });

  it("should reject player data containing levelGc or gcRating explicitly (user request)", () => {
    const invalidPlayer = {
      ...validPlayer,
      playedAt: "2026-08-06",
      levelGc: 20,
      gcRating: 1500,
    };
    const invalidMatch = {
      ...validMatch,
      players: [invalidPlayer],
    };
    const result = parserMatchSchema.safeParse(invalidMatch);
    expect(result.success).toBe(false);
  });
});

