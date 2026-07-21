export interface ComparisonPlayerDTO {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  gamersClubId: string | null;
  metrics: {
    rating: number;
    adr: number;
    kast: number;
    hsPercentage: number;
    kd: number;
    impact: number;
    winrate: number;
  };
  bestMap: { name: string; winrate: number } | null;
  worstMap: { name: string; winrate: number } | null;
}

export interface PlayerComparisonDTO {
  players: ComparisonPlayerDTO[];
  compatibility: {
    score: number;
    label: string;
  };
  h2h: {
    together: {
      total: number;
      wins: number;
      losses: number;
      winrate: number;
    };
    against: {
      total: number;
      wins: { [playerId: string]: number }; // ID do vencedor -> total de vitórias no confronto
      ties: number;
    };
  };
  timeline: {
    playedAt: Date;
    matchId: string;
    metrics: {
      [playerId: string]: {
        rating: number | null;
        elo: number | null;
      };
    };
  }[];
  maps: {
    mapName: string;
    winrates: { [playerId: string]: number };
    appearances: { [playerId: string]: number };
  }[];
  achievements: {
    code: string;
    name: string;
    earnedBy: { [playerId: string]: boolean };
  }[];
  insights: {
    type: "positive" | "negative" | "neutral";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
  }[];
}
