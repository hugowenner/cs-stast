import { TrendingUp, TrendingDown, Minus, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERFORMANCE_STATE_MAP, type PerformanceState } from "./data-reaction";

export interface PerformanceBadgeProps {
  state: PerformanceState;
  customLabel?: string;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const STATE_ICONS = {
  excellent: Sparkles,
  good:      TrendingUp,
  stable:    Minus,
  falling:   TrendingDown,
  critical:  ShieldAlert,
};

const STATE_CLASSES: Record<PerformanceState, string> = {
  excellent: "bg-status-good/12 text-status-good border-status-good/30",
  good:      "bg-status-good/10 text-status-good border-status-good/25",
  stable:    "bg-white/[0.04] text-status-neutral border-border-subtle",
  falling:   "bg-status-warning/10 text-status-warning border-status-warning/25",
  critical:  "bg-status-critical/10 text-status-critical border-status-critical/25",
};

export function PerformanceBadge({
  state,
  customLabel,
  size = "sm",
  showIcon = true,
  className,
}: PerformanceBadgeProps) {
  const meta = PERFORMANCE_STATE_MAP[state] || PERFORMANCE_STATE_MAP.stable;
  const Icon = STATE_ICONS[state] || Minus;
  const label = customLabel || meta.label;

  const sizeClass =
    size === "xs"
      ? "text-[7.5px] px-1.5 py-0.5 gap-1 tracking-wider"
      : size === "md"
        ? "text-[9.5px] px-2.5 py-1 gap-1.5 tracking-widest font-extrabold"
        : "text-[8.5px] px-2 py-0.5 gap-1.5 tracking-wider font-extrabold";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] uppercase border font-sans select-none leading-none",
        STATE_CLASSES[state],
        sizeClass,
        className,
      )}
    >
      {showIcon && <Icon className="size-2.5 shrink-0" />}
      <span>{label}</span>
    </span>
  );
}
