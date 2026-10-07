import { Trophy, Star, Flame, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecordIndicatorProps {
  label: string;
  value: string | number;
  type?: "best" | "worst" | "historic";
  isNew?: boolean;
  context?: string;
  className?: string;
}

export function RecordIndicator({
  label,
  value,
  type = "best",
  isNew = false,
  context,
  className,
}: RecordIndicatorProps) {
  const isWorst = type === "worst";
  const Icon = isWorst ? Skull : type === "historic" ? Trophy : Star;

  return (
    <div
      className={cn(
        "relative rounded-sm border p-3 flex flex-col gap-1.5 transition-all overflow-hidden",
        isWorst
          ? "border-status-critical/30 bg-status-critical/[0.04]"
          : "border-border-gold bg-gold/[0.04]",
        isNew && "ring-1 ring-gold animate-pulse",
        className,
      )}
    >
      {/* Top Tag */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("size-3 shrink-0", isWorst ? "text-status-critical" : "text-gold-light")} />
          <span
            className={cn(
              "text-[8px] font-black uppercase tracking-[0.16em]",
              isWorst ? "text-status-critical/80" : "text-gold-light/90",
            )}
          >
            {isWorst ? "ANTIRECORDE" : "RECORDE"}
          </span>
        </div>
        {isNew && (
          <span className="text-[7px] font-black px-1 py-0.5 rounded-[1px] bg-gold text-black uppercase tracking-wider">
            NOVO
          </span>
        )}
      </div>

      {/* Label and Value */}
      <div className="flex items-baseline justify-between gap-3 mt-1">
        <span className="text-xs font-bold text-white/90 truncate">{label}</span>
        <span
          className={cn(
            "text-lg font-black font-data tabular-nums shrink-0",
            isWorst ? "text-status-critical" : "text-gradient-gold",
          )}
        >
          {value}
        </span>
      </div>

      {context && (
        <p className="text-[9px] text-muted-foreground/50 font-medium leading-snug">
          {context}
        </p>
      )}
    </div>
  );
}
