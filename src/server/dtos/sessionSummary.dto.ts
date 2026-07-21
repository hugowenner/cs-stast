export interface SessionMetadataDTO {
  id: string;
  name: string;
  date: string; // ISO format
  mood: "excellent" | "good" | "stable" | "difficult" | "disaster"; // Humor da noite
}

export interface SessionOverviewDTO {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winrate: number;
  eloChangeGroup: number;
  ratingAvg: number;
  adrAvg: number;
  hsPercentage: number;
  teamSynergy: number; // Índice de sinergia geral da sessão (0-99%)
}

export interface SessionTimelineEventDTO {
  timestamp: string; // ISO format
  type: "match" | "milestone";
  title: string;
  description: string;
  outcome?: "win" | "loss" | "tie";
  matchId?: string;
}

export interface SessionPlayerDTO {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  ratingAvg: number;
  adrAvg: number;
  hsPercentage: number;
  kd: number;
  matchesPlayed: number;
  eloChange: number;
}

export interface SessionMapDTO {
  mapName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winrate: number;
}

export interface SessionHighlightDTO {
  category: "mvp" | "adr" | "hs" | "clutch" | "evolution";
  label: string; // Ex: "Melhor Rating", "Poder de Fogo"
  playerName: string;
  playerAvatar: string | null;
  value: string | number;
}

export interface SessionTrendItemDTO {
  metric: "rating" | "adr" | "hs" | "winrate";
  label: string;
  direction: "up" | "down" | "stable";
  value: string;
}

export interface SessionInsightDTO {
  type: "positive" | "negative" | "neutral";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
}

export interface SessionSummaryDTO {
  metadata: SessionMetadataDTO;
  overview: SessionOverviewDTO;
  timeline: SessionTimelineEventDTO[];
  players: SessionPlayerDTO[];
  maps: SessionMapDTO[];
  highlights: SessionHighlightDTO[];
  trends: SessionTrendItemDTO[];
  bestDuo: {
    playerAName: string;
    playerBName: string;
    wins: number;
    losses: number;
  } | null;
  insights: SessionInsightDTO[];
}
