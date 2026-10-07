import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeltaIndicatorProps {
  value: number | string;
  direction?: "up" | "down" | "neutral" | "auto";
  context?: string;
  suffix?: string;
  prefix?: string;
  isRank?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function DeltaIndicator({
  value,
  direction = "auto",
  context,
  suffix = "",
  prefix = "",
  isRank = false,
  size = "sm",
  className,
}: DeltaIndicatorProps) {
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numVal);

  let dir: "up" | "down" | "neutral" = "neutral";

  if (direction === "auto") {
    if (isNumeric) {
      if (numVal > 0) dir = "up";
      else if (numVal < 0) dir = "down";
      else dir = "neutral";
    } else {
      const str = String(value).trim();
      if (str.startsWith("+") || str.startsWith("↑")) dir = "up";
      else if (str.startsWith("-") || str.startsWith("↓")) dir = "down";
      else dir = "neutral";
    }
  } else {
    dir = direction;
  }

  // In rank movements: up means lower number (#8 -> #5 = positive rank movement)
  const isPositive = isRank ? dir === "up" : dir === "up";
  const isNegative = isRank ? dir === "down" : dir === "down";

  const colorClass = isPositive
    ? "text-status-good"
    : isNegative
      ? "text-status-critical"
      : "text-status-neutral";

  const sizeClass =
    size === "xs"
      ? "text-[10px] gap-0.5"
      : size === "md"
        ? "text-xs gap-1 font-extrabold"
        : "text-[11px] gap-1 font-bold";

  const iconSize = size === "xs" ? "size-2.5" : size === "md" ? "size-3.5" : "size-3";

  // Clean representation
  let displayValue = String(value);
  if (isNumeric && dir === "up" && !displayValue.startsWith("+") && !isRank) {
    displayValue = `+${displayValue}`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center tabular-nums leading-none font-data",
        colorClass,
        sizeClass,
        className,
      )}
    >
      {dir === "up" && <ArrowUpRight className={cn(iconSize, "shrink-0")} />}
      {dir === "down" && <ArrowDownRight className={cn(iconSize, "shrink-0")} />}
      {dir === "neutral" && <Minus className={cn(iconSize, "shrink-0 opacity-60")} />}

      <span>
        {prefix}
        {displayValue}
        {suffix}
      </span>

      {context && (
        <span className="text-[9px] font-normal text-muted-foreground/60 ml-0.5 whitespace-nowrap">
          {context}
        </span>
      )}
    </span>
  );
}
