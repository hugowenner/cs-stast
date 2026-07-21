import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendIndicator({
  value,
  isPositive,
  className = "",
}: {
  value: string | number;
  isPositive?: boolean;
  className?: string;
}) {
  const positive = isPositive !== undefined ? isPositive : !String(value).startsWith("-");
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const colorClass = positive ? "text-status-good" : "text-status-critical";

  return (
    <span className={cn("inline-flex items-center gap-1 font-bold text-xs tabular-nums", colorClass, className)}>
      <TrendIcon className="size-3.5 shrink-0" />
      {positive && !String(value).startsWith("+") && typeof value === "number" ? "+" : ""}
      {value}
    </span>
  );
}
