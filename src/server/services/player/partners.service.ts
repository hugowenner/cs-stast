import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

export function calculatePartners(playerId: string, rivalries: any[]): PlayerProfileDTO["partners"] {
  const byId = new Map<string, { id: string; nickname: string; avatarUrl: string | null; matchesTogether: number }>();

  for (const r of rivalries) {
    if (r.matchesTogether <= 0) continue;
    const partner = r.playerAId === playerId ? r.playerB : r.playerA;
    const existing = byId.get(partner.id);
    if (!existing || r.matchesTogether > existing.matchesTogether) {
      byId.set(partner.id, {
        id: partner.id,
        nickname: partner.nickname,
        avatarUrl: partner.avatarUrl,
        matchesTogether: r.matchesTogether,
      });
    }
  }

  return [...byId.values()].sort((a, b) => b.matchesTogether - a.matchesTogether);
}
