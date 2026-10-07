import React from "react";
import { cn } from "@/lib/utils";

export type TacticalBadgeVariant =
  | "gold"
  | "good"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "primary"
  | "tactical"
  | "green"
  | "red"
  | "cyan"
  | "orange"
  | "violet";

export type TacticalBadgeSize = "xs" | "sm" | "md";

const VARIANT_MAP: Record<TacticalBadgeVariant, string> = {
  gold:     "badge-tactical-gold",
  good:     "badge-tactical-good",
  green:    "badge-tactical-good",
  warning:  "badge-tactical-warning",
  critical: "badge-tactical-critical",
  red:      "badge-tactical-critical",
  info:     "badge-tactical-info",
  cyan:     "badge-tactical-info",
  neutral:  "badge-tactical-neutral",
  primary:  "badge-tactical-primary",
  tactical: "badge-tactical-primary",
  orange:   "badge-tactical-primary",
  violet:   "badge-tactical-info",
};

const SIZE_MAP: Record<TacticalBadgeSize, string> = {
  xs: "text-[7px] px-1.5 py-0.5",
  sm: "text-[8px] px-2 py-0.5",
  md: "text-[9px] px-2.5 py-1",
};

export interface TacticalBadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: TacticalBadgeVariant;
  size?: TacticalBadgeSize;
  isDogTag?: boolean;
  className?: string;
}

export function TacticalBadge({
  label,
  children,
  variant = "neutral",
  size = "sm",
  isDogTag = false,
  className,
}: TacticalBadgeProps) {
  return (
    <span
      className={cn(
        VARIANT_MAP[variant] || VARIANT_MAP.neutral,
        SIZE_MAP[size],
        isDogTag && "chamfer-pill font-black tracking-[0.16em] uppercase",
        className,
      )}
    >
      {children ?? label}
    </span>
  );
}

// Aliases and Semantic Presets
export const TacticalBadges = {
  MVP:       () => <TacticalBadge label="MVP"       variant="gold"     isDogTag />,
  Top3:      () => <TacticalBadge label="TOP 3"     variant="gold"     isDogTag />,
  Record:    () => <TacticalBadge label="RECORDE"   variant="gold"     isDogTag />,
  Elite:     () => <TacticalBadge label="ELITE"     variant="primary"  isDogTag />,
  Confirmed: () => <TacticalBadge label="AUDITADO"  variant="good"     />,
  Provisional: () => <TacticalBadge label="PROVISÓRIO" variant="warning" />,
  Warning:   () => <TacticalBadge label="ATENÇÃO"   variant="warning"  />,
  Critical:  () => <TacticalBadge label="EM QUEDA"  variant="critical" />,
  Live:      () => <TacticalBadge label="AO VIVO"   variant="good"     />,
  Season:    () => <TacticalBadge label="TEMPORADA" variant="neutral"  />,
};

// Re-export for HudBadge compatibility
export { TacticalBadge as HudBadge };
