import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankMovementProps {
  currentRank: number;
  previousRank?: number | null;
  size?: "sm" | "md" | "lg";
  showPositionsText?: boolean;
  className?: string;
}

export function RankMovement({
  currentRank,
  previousRank,
  size = "md",
  showPositionsText = false,
  className,
}: RankMovementProps) {
  if (previousRank === undefined || previousRank === null || previousRank === currentRank) {
    return (
      <span className={cn("inline-flex items-center gap-1 font-data text-muted-foreground/40 text-[10px]", className)}>
        <Minus className="size-2.5 opacity-50" />
        <span>#{currentRank}</span>
      </span>
    );
  }

  // In competitive rankings: Lower number = higher standing (e.g. 5 is better than 8).
  const climbed = previousRank > currentRank;
  const dropped = previousRank < currentRank;
  const delta = Math.abs(previousRank - currentRank);

  const colorClass = climbed
    ? "text-status-good"
    : dropped
      ? "text-status-warning"
      : "text-muted-foreground/40";

  return (
    <div className={cn("inline-flex items-center gap-1.5 font-data tabular-nums select-none", className)}>
      <span className="text-white font-black text-xs">#{currentRank}</span>

      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-extrabold",
          colorClass,
        )}
        title={`Era #${previousRank}, agora é #${currentRank}`}
      >
        {climbed && <ArrowUp className="size-3 shrink-0 stroke-[3]" />}
        {dropped && <ArrowDown className="size-3 shrink-0 stroke-[3]" />}
        <span>
          {climbed ? "+" : dropped ? "-" : ""}
          {delta}
        </span>
        {showPositionsText && (
          <span className="text-[8px] font-medium text-muted-foreground/50 ml-0.5">
            posições
          </span>
        )}
      </span>
    </div>
  );
}
