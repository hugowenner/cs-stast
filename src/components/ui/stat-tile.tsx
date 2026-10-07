import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeltaIndicator } from "./delta-indicator";
import { Sparkline } from "./sparkline";
import { SampleIndicator } from "./sample-indicator";
import type { DataReactionState } from "./data-reaction";

const ACCENT_STYLES = {
  violet: {
    icon: "bg-primary/10 text-primary border border-primary/20",
    label: "text-primary/90",
    value: "text-foreground",
    accentGlow: "group-hover:border-primary/40",
  },
  cyan: {
    icon: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    label: "text-cyan-400/90",
    value: "text-foreground",
    accentGlow: "group-hover:border-cyan-500/40",
  },
  gold: {
    icon: "bg-gold/10 text-gold border border-gold/20",
    label: "text-gold/90",
    value: "text-gold font-black",
    accentGlow: "group-hover:border-gold/40",
  },
  green: {
    icon: "bg-status-good/10 text-status-good border border-status-good/20",
    label: "text-status-good/90",
    value: "text-status-good",
    accentGlow: "group-hover:border-status-good/40",
  },
  orange: {
    icon: "bg-primary/10 text-primary border border-primary/20",
    label: "text-primary/90",
    value: "text-primary font-bold",
    accentGlow: "group-hover:border-primary/40",
  },
  muted: {
    icon: "bg-muted/40 text-muted-foreground border border-border/40",
    label: "text-muted-foreground/80",
    value: "text-foreground",
    accentGlow: "group-hover:border-border/80",
  },
} as const;

export interface StatTileProps {
  label: string;
  value: string | number | React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  accent?: keyof typeof ACCENT_STYLES;
  context?: string | React.ReactNode;
  tagline?: string;
  delta?: number | string;
  deltaContext?: string;
  deltaDirection?: "up" | "down" | "neutral" | "auto";
  reaction?: DataReactionState;
  sparklineData?: number[];
  sampleSize?: number;
  minSample?: number;
  className?: string;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "violet",
  context,
  tagline,
  delta,
  deltaContext,
  deltaDirection = "auto",
  reaction,
  sparklineData,
  sampleSize,
  minSample,
  className,
}: StatTileProps) {
  const styles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.violet;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between gap-3 p-4 bg-surface-panel border border-border/50 rounded-sm transition-micro hover:border-border/80 group overflow-hidden",
        styles.accentGlow,
        className
      )}
    >
      {/* Top micro-indicator line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />

      {/* Header Row: Icon + Label + Delta */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-xs transition-micro",
                styles.icon
              )}
            >
              <Icon className="size-3.5" />
            </div>
          )}
          <span
            className={cn(
              "text-[10px] font-mono font-bold uppercase tracking-[0.14em] truncate",
              styles.label
            )}
          >
            {label}
          </span>
        </div>

        {delta !== undefined && (
          <DeltaIndicator
            value={delta}
            context={deltaContext}
            direction={deltaDirection}
            size="sm"
          />
        )}
      </div>

      {/* Metric Value + Sparkline Row */}
      <div className="flex items-baseline justify-between gap-2">
        <div
          className={cn(
            "font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums select-all",
            reaction === "record"
              ? "text-gold font-black drop-shadow-[0_0_10px_rgba(230,175,46,0.3)]"
              : reaction === "positive" || reaction === "rising"
                ? "text-status-good font-bold"
                : reaction === "negative"
                  ? "text-status-critical font-bold"
                  : reaction === "falling"
                    ? "text-status-warning font-bold"
                    : reaction === "sample_small"
                      ? "text-muted-foreground/70 font-medium"
                      : styles.value
          )}
        >
          {value}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="shrink-0 self-center">
            <Sparkline
              data={sparklineData}
              type="line"
              width={56}
              height={18}
            />
          </div>
        )}
      </div>

      {/* Footer Details: Context, Sample, Tagline */}
      {(context || tagline || typeof sampleSize === "number") && (
        <div className="flex flex-col gap-1 border-t border-border/20 pt-2 text-[11px]">
          {context && (
            <div className="text-muted-foreground/75 font-sans leading-snug">
              {context}
            </div>
          )}

          {typeof sampleSize === "number" && (
            <SampleIndicator
              count={sampleSize}
              minEligible={minSample}
              variant="subtle"
            />
          )}

          {tagline && (
            <p className="narrator-tagline text-[11px] font-mono text-muted-foreground/90 italic">
              &ldquo;{tagline}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
