import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

export function calculateMapStats(outcomes: any[]): PlayerProfileDTO["maps"] {
  const mapData = new Map<string, { appearances: number; wins: number }>();

  for (const row of outcomes) {
    const mapName = row.match.map.name;
    const scoreSelf = row.team === "A" ? row.match.scoreTeamA : row.match.scoreTeamB;
    const scoreOpp = row.team === "A" ? row.match.scoreTeamB : row.match.scoreTeamA;

    const current = mapData.get(mapName) ?? { appearances: 0, wins: 0 };
    current.appearances++;
    if (scoreSelf > scoreOpp) {
      current.wins++;
    }
    mapData.set(mapName, current);
  }

  return Array.from(mapData.entries())
    .map(([mapName, stats]) => ({
      mapName,
      appearances: stats.appearances,
      wins: stats.wins,
      winrate: Math.round((stats.wins / stats.appearances) * 1000) / 10,
    }))
    .sort((a, b) => b.appearances - a.appearances); // Ordena pelos mais jogados
}
