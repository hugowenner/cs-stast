export type NarrativeType =
  | "DOMINANCE"
  | "COMEBACK"
  | "RIVALRY"
  | "HOT_STREAK"
  | "MAP_MASTER"
  | "DUO_SYNERGY"
  | "RECORD"
  | "IMPACT"
  | "EVOLUTION"
  | "BREAKOUT";

export type HighlightCategory = "competitive" | "social" | "achievement";

export interface HighlightPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface HighlightMetric {
  label: string;
  value: string | number;
}

export interface HighlightEvidenceMatch {
  mapName: string;
  scoreSelf: number;
  scoreOpp: number;
  won: boolean;
}

export interface DashboardHighlight {
  id: string;
  type: NarrativeType;
  category: HighlightCategory;
  priority: number;   // Prioridade calculada (0 a 100)
  confidence: number; // Porcentagem de confiança (0 a 100)
  title: string;
  subtitle?: string;
  text: string;
  players: HighlightPlayer[];
  metrics: HighlightMetric[];
  period: "week" | "season";
  evidenceMatches?: HighlightEvidenceMatch[]; // Últimos placares para provar a história (broadcast visual)
}
