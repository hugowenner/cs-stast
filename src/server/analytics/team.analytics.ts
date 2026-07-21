export interface TeamPerformanceInput {
  rating: number;
  adr: number;
  kills: number;
}

export function calculateTeamAverages(players: TeamPerformanceInput[]) {
  const totalPlayers = players.length;
  if (totalPlayers === 0) {
    return {
      avgRating: 0,
      avgAdr: 0,
      totalKills: 0,
    };
  }

  const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / totalPlayers;
  const avgAdr = players.reduce((sum, p) => sum + p.adr, 0) / totalPlayers;
  const totalKills = players.reduce((sum, p) => sum + p.kills, 0);

  return {
    avgRating: Math.round(avgRating * 100) / 100,
    avgAdr: Math.round(avgAdr * 10) / 10,
    totalKills,
  };
}
