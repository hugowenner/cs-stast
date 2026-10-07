import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeltaIndicator } from "./delta-indicator";
import { Sparkline } from "./sparkline";
import { SampleIndicator } from "./sample-indicator";
import type { DataReactionState } from "./data-reaction";

export type MetricSize = "sm" | "md" | "lg" | "hero";

export interface MetricDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  context?: React.ReactNode;
  delta?: number | string;
  deltaContext?: string;
  deltaDirection?: "up" | "down" | "neutral" | "auto";
  reaction?: DataReactionState;
  size?: MetricSize;
  sparklineData?: number[];
  sparklineType?: "line" | "bars";
  sampleCount?: number;
  minSample?: number;
  narrative?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  accent?: "orange" | "gold" | "cyan" | "green" | "red" | "muted";
  chamfer?: boolean;
}

const SIZE_STYLES: Record<
  MetricSize,
  {
    label: string;
    value: string;
    context: string;
    gap: string;
    icon: string;
  }
> = {
  sm: {
    label: "text-[10px] tracking-[0.14em]",
    value: "text-lg font-bold tracking-tight leading-none",
    context: "text-[11px]",
    gap: "gap-1",
    icon: "size-3.5",
  },
  md: {
    label: "text-[11px] tracking-[0.16em]",
    value: "text-2xl font-bold tracking-tight leading-none",
    context: "text-xs",
    gap: "gap-1.5",
    icon: "size-4",
  },
  lg: {
    label: "text-xs tracking-[0.18em]",
    value: "text-3xl sm:text-4xl font-black tracking-tight leading-none",
    context: "text-xs",
    gap: "gap-2",
    icon: "size-5",
  },
  hero: {
    label: "text-xs tracking-[0.2em]",
    value: "text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none",
    context: "text-sm",
    gap: "gap-2.5",
    icon: "size-6",
  },
};

const REACTION_VALUE_STYLES: Record<DataReactionState, string> = {
  positive: "text-status-good font-bold",
  negative: "text-status-critical font-bold",
  neutral: "text-foreground font-bold",
  rising: "text-status-good font-bold",
  falling: "text-status-warning font-bold",
  record: "text-gold font-black drop-shadow-[0_0_12px_rgba(230,175,46,0.25)]",
  sample_small: "text-muted-foreground/70 font-medium",
  stable: "text-foreground font-semibold",
};

const ACCENT_LABEL_STYLES: Record<string, string> = {
  orange: "text-primary/90",
  gold: "text-gold/90",
  cyan: "text-cyan-400/90",
  green: "text-status-good/90",
  red: "text-status-critical/90",
  muted: "text-muted-foreground/70",
};

export function MetricDisplay({
  label,
  value,
  context,
  delta,
  deltaContext,
  deltaDirection = "auto",
  reaction,
  size = "md",
  sparklineData,
  sparklineType = "line",
  sampleCount,
  minSample,
  narrative,
  icon: Icon,
  accent = "muted",
  chamfer = false,
  className,
  ...props
}: MetricDisplayProps) {
  const sizeConfig = SIZE_STYLES[size];

  // Resolve value color based on reaction state or default accent
  const valueColorClass = reaction
    ? REACTION_VALUE_STYLES[reaction]
    : accent === "gold"
      ? "text-gold font-black"
      : accent === "orange"
        ? "text-primary font-bold"
        : accent === "green"
          ? "text-status-good font-bold"
          : accent === "red"
            ? "text-status-critical font-bold"
            : "text-foreground font-bold";

  return (
    <div
      className={cn(
        "flex flex-col",
        sizeConfig.gap,
        chamfer && "chamfer-card bg-surface-panel p-4 border border-border/40",
        className
      )}
      {...props}
    >
      {/* Label Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <Icon
              className={cn(
                sizeConfig.icon,
                "shrink-0",
                ACCENT_LABEL_STYLES[accent] ?? "text-muted-foreground"
              )}
            />
          )}
          <span
            className={cn(
              "font-mono font-bold uppercase truncate",
              sizeConfig.label,
              ACCENT_LABEL_STYLES[accent] ?? "text-muted-foreground"
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
            size={size === "hero" || size === "lg" ? "md" : "sm"}
          />
        )}
      </div>

      {/* Main Metric Value & Trend Row */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={cn(
              "font-mono tabular-nums select-all",
              sizeConfig.value,
              valueColorClass
            )}
          >
            {value}
          </span>
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="shrink-0 self-center">
            <Sparkline
              data={sparklineData}
              type={sparklineType}
              width={size === "hero" || size === "lg" ? 80 : 54}
              height={size === "hero" || size === "lg" ? 22 : 16}
            />
          </div>
        )}
      </div>

      {/* Context, Sample or Narrative Row */}
      {(context || narrative || typeof sampleCount === "number") && (
        <div className="flex flex-col gap-1 mt-0.5">
          {context && (
            <div className={cn("text-muted-foreground/80 font-sans", sizeConfig.context)}>
              {context}
            </div>
          )}

          {typeof sampleCount === "number" && (
            <div className="mt-0.5">
              <SampleIndicator
                count={sampleCount}
                minEligible={minSample}
                variant="subtle"
              />
            </div>
          )}

          {narrative && (
            <p className="narrator-tagline text-[11px] font-mono text-muted-foreground/90 italic mt-0.5">
              &ldquo;{narrative}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
