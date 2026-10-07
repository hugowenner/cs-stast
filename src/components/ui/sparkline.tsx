import { cn } from "@/lib/utils";

export interface SparklineProps {
  data: number[];
  variant?: "auto" | "rising" | "falling" | "stable" | "neutral";
  width?: number;
  height?: number;
  showPoints?: boolean;
  type?: "line" | "bars";
  className?: string;
}

export function Sparkline({
  data,
  variant = "auto",
  width = 64,
  height = 18,
  showPoints = false,
  type = "bars",
  className,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <span className="inline-block text-[9px] text-muted-foreground/30 font-mono select-none">
        —
      </span>
    );
  }

  // Calculate min, max, and direction
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  const first = data[0];
  const last = data[data.length - 1];
  const delta = last - first;

  let resolvedVariant = variant;
  if (variant === "auto") {
    if (delta > 0.05) resolvedVariant = "rising";
    else if (delta < -0.05) resolvedVariant = "falling";
    else resolvedVariant = "stable";
  }

  const strokeColor =
    resolvedVariant === "rising"
      ? "var(--status-good)"
      : resolvedVariant === "falling"
        ? "var(--status-critical)"
        : resolvedVariant === "stable"
          ? "var(--status-info)"
          : "var(--status-neutral)";

  const barColor =
    resolvedVariant === "rising"
      ? "bg-status-good"
      : resolvedVariant === "falling"
        ? "bg-status-critical"
        : resolvedVariant === "stable"
          ? "bg-status-info"
          : "bg-white/40";

  // If rendering micro-bars:
  if (type === "bars") {
    const barWidth = Math.max(2, Math.floor((width - (data.length - 1) * 2) / data.length));
    return (
      <div
        className={cn("inline-flex items-end gap-[2px] h-[16px]", className)}
        style={{ width }}
        aria-hidden="true"
      >
        {data.map((val, idx) => {
          const heightPct = Math.max(15, Math.round(((val - min) / range) * 85 + 15));
          const isLatest = idx === data.length - 1;
          return (
            <div
              key={idx}
              className={cn(
                "rounded-[0.5px] transition-all duration-200",
                barColor,
                isLatest ? "opacity-100 ring-1 ring-white/20" : "opacity-45 hover:opacity-75",
              )}
              style={{
                width: barWidth,
                height: `${heightPct}%`,
              }}
              title={`Partida ${idx + 1}: ${val}`}
            />
          );
        })}
      </div>
    );
  }

  // SVG Line Rendering
  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * usableWidth;
    const y = height - padding - ((d - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      className={cn("inline-block overflow-visible select-none shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />
      {showPoints &&
        data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * usableWidth;
          const y = height - padding - ((d - min) / range) * usableHeight;
          const isLast = i === data.length - 1;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isLast ? 2.5 : 1.5}
              fill={isLast ? strokeColor : "var(--surface-panel)"}
              stroke={strokeColor}
              strokeWidth="1"
            />
          );
        })}
    </svg>
  );
}
