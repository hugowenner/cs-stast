import { describe, it, expect } from "vitest";
import {
  getMatchType,
  isCommunityMatch,
  communityMatchWhere,
  individualMatchWhere,
  communityMatchStatsWhere,
  individualMatchStatsWhere,
  MIN_TRACKED_PLAYERS_FOR_COMMUNITY,
} from "./matchClassification";

describe("matchClassification domain rules", () => {
  it("classifica corretamente partidas com 0 jogadores monitorados", () => {
    expect(getMatchType(0)).toBe("SOLO");
    expect(isCommunityMatch(0)).toBe(false);
  });

  it("classifica corretamente partidas com 1 jogador monitorado (SOLO individual)", () => {
    expect(getMatchType(1)).toBe("SOLO");
    expect(isCommunityMatch(1)).toBe(false);
  });

  it("classifica corretamente partidas com 2 jogadores monitorados (limiar COMUNIDADE)", () => {
    expect(MIN_TRACKED_PLAYERS_FOR_COMMUNITY).toBe(2);
    expect(getMatchType(2)).toBe("COMMUNITY");
    expect(isCommunityMatch(2)).toBe(true);
  });

  it("classifica corretamente partidas com mais de 2 jogadores monitorados", () => {
    expect(getMatchType(3)).toBe("COMMUNITY");
    expect(isCommunityMatch(3)).toBe(true);
    expect(getMatchType(5)).toBe("COMMUNITY");
    expect(isCommunityMatch(5)).toBe(true);
    expect(getMatchType(10)).toBe("COMMUNITY");
    expect(isCommunityMatch(10)).toBe(true);
  });

  it("produz fragmentos de query Prisma estritamente consistentes com as regras", () => {
    // Queries diretas na tabela Match
    expect(individualMatchWhere()).toEqual({ trackedPlayersCount: { gte: 1 } });
    expect(communityMatchWhere()).toEqual({ trackedPlayersCount: { gte: 2 } });

    // Queries relacionais via PlayerMatchStats
    expect(individualMatchStatsWhere()).toEqual({
      match: { trackedPlayersCount: { gte: 1 } },
    });
    expect(communityMatchStatsWhere()).toEqual({
      match: { trackedPlayersCount: { gte: 2 } },
    });
  });
});
