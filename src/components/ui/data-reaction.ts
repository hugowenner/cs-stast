/**
 * Data Reaction System — Tactical Competitive Data Foundation
 * 
 * Provides semantic state types and visual mappings for data reactions.
 * Rule: The UI represents states computed by the application/backend,
 * without calculating arbitrary judgements on isolated numbers.
 */

export type DataReactionState =
  | "positive"
  | "negative"
  | "neutral"
  | "rising"
  | "falling"
  | "record"
  | "sample_small"
  | "stable";

export type PerformanceState =
  | "excellent"
  | "good"
  | "stable"
  | "falling"
  | "critical";

export interface DataReactionStyle {
  textColor: string;
  borderColor: string;
  bgColor: string;
  badgeVariant: "good" | "warning" | "critical" | "gold" | "info" | "neutral" | "primary";
  defaultLabel: string;
}

export const REACTION_STYLES: Record<DataReactionState, DataReactionStyle> = {
  positive: {
    textColor: "text-status-good",
    borderColor: "border-status-good/25",
    bgColor: "bg-status-good/10",
    badgeVariant: "good",
    defaultLabel: "Acima da média",
  },
  negative: {
    textColor: "text-status-critical",
    borderColor: "border-status-critical/25",
    bgColor: "bg-status-critical/10",
    badgeVariant: "critical",
    defaultLabel: "Abaixo da média",
  },
  neutral: {
    textColor: "text-status-neutral",
    borderColor: "border-subtle",
    bgColor: "bg-white/[0.02]",
    badgeVariant: "neutral",
    defaultLabel: "Na média",
  },
  rising: {
    textColor: "text-status-good",
    borderColor: "border-status-good/25",
    bgColor: "bg-status-good/10",
    badgeVariant: "good",
    defaultLabel: "Em alta",
  },
  falling: {
    textColor: "text-status-warning",
    borderColor: "border-status-warning/25",
    bgColor: "bg-status-warning/10",
    badgeVariant: "warning",
    defaultLabel: "Em queda",
  },
  record: {
    textColor: "text-gold-light",
    borderColor: "border-border-gold",
    bgColor: "bg-gold/10",
    badgeVariant: "gold",
    defaultLabel: "Recorde",
  },
  sample_small: {
    textColor: "text-muted-foreground",
    borderColor: "border-dashed border-white/15",
    bgColor: "bg-white/[0.02]",
    badgeVariant: "neutral",
    defaultLabel: "Amostra pequena",
  },
  stable: {
    textColor: "text-white/80",
    borderColor: "border-subtle",
    bgColor: "bg-white/[0.02]",
    badgeVariant: "neutral",
    defaultLabel: "Estável",
  },
};

export const PERFORMANCE_STATE_MAP: Record<PerformanceState, { label: string; badgeVariant: "good" | "warning" | "critical" | "neutral" }> = {
  excellent: { label: "Excelente", badgeVariant: "good" },
  good:      { label: "Em alta",   badgeVariant: "good" },
  stable:    { label: "Estável",   badgeVariant: "neutral" },
  falling:   { label: "Em queda",  badgeVariant: "warning" },
  critical:  { label: "Atenção",   badgeVariant: "critical" },
};
