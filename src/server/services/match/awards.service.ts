import type { HighlightDTO, PlayerMatchDTO } from "@/server/dtos/matchDetails.dto";
import { extractMatchHighlights } from "@/server/analytics/match.analytics";

export function calculateMatchHighlights(players: PlayerMatchDTO[]): HighlightDTO[] {
  // O formato de entrada de PlayerMatchDTO atende aos campos de PlayerPerformanceInput
  // do analytics, logo podemos passar diretamente.
  return extractMatchHighlights(players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    isTracked: p.isTracked,
    rating: p.rating,
    adr: p.adr,
    kast: p.kast,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    headshots: p.headshots,
  })));
}
