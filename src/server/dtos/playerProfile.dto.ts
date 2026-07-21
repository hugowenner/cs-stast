export interface PlayerProfileDTO {
  player: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    gamersClubId: string | null;
  };
  overview: {
    totalMatches: number;
    wins: number;
    losses: number;
    ties: number;
    winrate: number;
    ratingAvg: number;
    kd: number;
    adrAvg: number;
    kastAvg: number;
    hsPercentage: number;
    summaryCoach: {
      bestMap: { name: string; winrate: number } | null;
      worstMap: { name: string; winrate: number } | null;
      last10Winrate: { wins: number; losses: number; winrate: number } | null;
      ratingTrend: string; // e.g. "+0.14" ou "-0.05"
      favoritePartner: { nickname: string; matches: number } | null;
    };
  };
  maps: {
    mapName: string;
    appearances: number;
    wins: number;
    winrate: number;
  }[];
  timeline: {
    matchId: string;
    playedAt: Date;
    rating: number;
    elo: number;
  }[];
  achievements: {
    id: string;
    achievement: {
      code: string;
      name: string;
      description: string;
      iconUrl: string | null;
      tier: string;
    };
    earnedAt: Date;
  }[];
  partners: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    matchesTogether: number;
  }[];
  recentMatches: {
    id: string;
    playedAt: Date;
    mapName: string;
    kills: number;
    deaths: number;
    assists: number;
    rating: number;
  }[];
}
