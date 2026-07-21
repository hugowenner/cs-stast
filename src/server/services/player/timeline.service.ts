import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

export function calculateTimeline(outcomes: any[]): PlayerProfileDTO["timeline"] {
  return outcomes.map((row) => ({
    matchId: row.match.id,
    playedAt: row.match.playedAt,
    rating: Math.round(row.rating * 100) / 100,
    elo: row.eloAfter,
  }));
}
