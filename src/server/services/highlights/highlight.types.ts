import type { CompetitiveDataset } from "../competitive.service";

export type NarrativeType =
  | "DOMINANCE"
  | "COMEBACK"
  | "RIVALRY"
  | "HOT_STREAK"
  | "COLD_STREAK"
  | "MAP_MASTER"
  | "DUO_SYNERGY"
  | "RECORD"
  | "IMPACT"
  | "EVOLUTION"
  | "BREAKOUT"
  | "CLUTCH_KING"
  | "HEADSHOT_MACHINE"
  | "ADR_MONSTER"
  | "CONSISTENCY"
  | "ENTRY_FRAGGER"
  | "SUPPORT_HERO"
  | "MULTIKILL_SPECIALIST"
  | "CURIOSITY"
  | "WEEKLY_STAR";

export type StoryCategory =
  | "performance"
  | "record"
  | "map"
  | "duo"
  | "week"
  | "multikill"
  | "clutch"
  | "evolution"
  | "curiosity"
  | "streak";

export type HighlightCategory =
  | "competitive"
  | "social"
  | "achievement"
  | "curiosity";

export type HighlightRarity = "legendary" | "epic" | "rare" | "common";

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
  storyCategory: StoryCategory;
  rarity: HighlightRarity;
  priority: number;
  confidence: number;
  title: string;
  subtitle?: string;
  text: string;
  players: HighlightPlayer[];
  metrics: HighlightMetric[];
  period: "week" | "season";
  evidenceMatches?: HighlightEvidenceMatch[];
}

// ─── StoryProvider interface ──────────────────────────────────────────────────

export interface StoryProvider {
  /** Unique ID — prevents duplicate story types in the pool. */
  id: string;
  /** Editorial category used for quota enforcement. */
  storyCategory: StoryCategory;
  /** Weight for shuffle bias (higher = more likely to survive quota cuts). */
  weight: number;
  /** Returns a highlight or null when the data doesn't support this story. */
  generate(dataset: CompetitiveDataset): DashboardHighlight | null;
}
