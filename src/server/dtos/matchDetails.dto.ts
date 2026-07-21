export interface PlayerMatchDTO {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  steamId: string;
  isTracked: boolean;
  team: string; // "A" ou "B"
  rating: number;
  adr: number;
  kast: number;
  impact: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  hsPercentage: number;
  mvps: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
}

export interface TeamDTO {
  side: string; // "A" ou "B"
  score: number;
  players: PlayerMatchDTO[];
}

export interface HighlightDTO {
  type: string; // "mvp" | "rating" | "adr" | "hs" | "kills" | "assists" | "kast"
  label: string; // "MVP", "Maior ADR", etc.
  value: string | number;
  player: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    isTracked: boolean;
  };
}

export interface MatchMetadataDTO {
  id: string;
  playedAt: Date;
  durationSeconds: number;
  durationFormatted: string;
  mapName: string;
  scoreTeamA: number;
  scoreTeamB: number;
  session: {
    id: string;
    name: string;
  };
  source: string;
  sourceId: string | null;
  eloChangeGroup: number; // Somatório de ELO ganho/perdido pelos jogadores da watchlist nesta partida
}

export interface MatchTimelineEventDTO {
  id: string;
  type: string; // "KILL" | "ACE" | "MULTI_KILL_4" | "MULTI_KILL_3"
  roundNumber: number;
  playerNickname: string;
  victimNickname: string | null;
}

export interface MatchDetailsDTO {
  match: MatchMetadataDTO;
  teams: TeamDTO[];
  highlights: HighlightDTO[];
  timeline: MatchTimelineEventDTO[];
}
