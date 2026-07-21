import type { TeamDTO, PlayerMatchDTO } from "@/server/dtos/matchDetails.dto";

export function formatMatchTeams(match: any): TeamDTO[] {
  const players: PlayerMatchDTO[] = match.playerStats.map((stat: any) => {
    const isTracked = !!stat.player.trackedPlayer?.active;
    const hsPercentage = stat.kills > 0 ? (stat.headshots / stat.kills) * 100 : 0;
    
    // Na modelagem atual, o contador exato de MVPs (rodadas que o jogador foi coroado MVP)
    // não é persistido diretamente no PlayerMatchStats. Logo, definimos como 0 por segurança,
    // mas mantemos o campo no DTO estruturado conforme as especificações.
    const mvps = 0; 

    return {
      id: stat.player.id,
      nickname: stat.player.nickname,
      avatarUrl: stat.player.avatarUrl,
      steamId: stat.player.steamId,
      isTracked,
      team: stat.team,
      rating: Math.round(stat.rating * 100) / 100,
      adr: Math.round(stat.adr * 10) / 10,
      kast: Math.round(stat.kast * 10) / 10,
      impact: Math.round(stat.impact * 100) / 100,
      kills: stat.kills,
      deaths: stat.deaths,
      assists: stat.assists,
      headshots: stat.headshots,
      hsPercentage: Math.round(hsPercentage * 10) / 10,
      mvps,
      eloBefore: stat.eloBefore,
      eloAfter: stat.eloAfter,
      eloChange: stat.eloAfter - stat.eloBefore,
    };
  });

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");

  return [
    {
      side: "A",
      score: match.scoreTeamA,
      players: teamAPlayers.sort((a, b) => b.rating - a.rating),
    },
    {
      side: "B",
      score: match.scoreTeamB,
      players: teamBPlayers.sort((a, b) => b.rating - a.rating),
    },
  ];
}
