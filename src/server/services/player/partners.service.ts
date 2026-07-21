import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

export function calculatePartners(playerId: string, rivalries: any[]): PlayerProfileDTO["partners"] {
  return rivalries
    .filter((r) => r.matchesTogether > 0)
    .map((r) => {
      const partner = r.playerAId === playerId ? r.playerB : r.playerA;
      return {
        id: partner.id,
        nickname: partner.nickname,
        avatarUrl: partner.avatarUrl,
        matchesTogether: r.matchesTogether,
      };
    })
    .sort((a, b) => b.matchesTogether - a.matchesTogether);
}
