import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SampleIndicatorProps {
  count: number;
  unit?: string;
  minEligible?: number;
  label?: string;
  variant?: "badge" | "inline" | "subtle";
  className?: string;
}

export function SampleIndicator({
  count,
  unit = "partidas",
  minEligible = 10,
  label,
  variant = "badge",
  className,
}: SampleIndicatorProps) {
  const isSmall = count < minEligible;
  const unitLabel = count === 1 ? unit.replace(/s$/, "") : unit;

  if (variant === "subtle") {
    return (
      <span className={cn("text-[9px] font-data text-muted-foreground/50 tabular-nums", className)}>
        {count} {unitLabel}
        {isSmall && <span className="text-status-warning/70 ml-1">· Amostra inicial</span>}
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-data text-[10px] tabular-nums",
          isSmall ? "text-status-warning" : "text-muted-foreground/60",
          className,
        )}
      >
        {isSmall ? (
          <AlertCircle className="size-2.5 shrink-0 text-status-warning" />
        ) : (
          <CheckCircle2 className="size-2.5 shrink-0 text-status-good/60" />
        )}
        <span>
          {count} {unitLabel}
        </span>
        {isSmall && (
          <span className="text-[9px] text-status-warning/70 font-sans ml-0.5">
            ({label || "amostra pequena"})
          </span>
        )}
      </span>
    );
  }

  // Default: badge
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-data text-[8px] font-black uppercase tracking-wider border",
        isSmall
          ? "bg-status-warning/10 text-status-warning border-status-warning/25"
          : "bg-white/[0.03] text-muted-foreground/60 border-subtle",
        className,
      )}
      title={
        isSmall
          ? `Amostra de apenas ${count} ${unitLabel}. Mínimo de ${minEligible} recomendado para conclusões definitivas.`
          : `Amostra elegível (${count} ${unitLabel})`
      }
    >
      <span>
        {count}
        {unitLabel.charAt(0).toLowerCase()}
      </span>
      {isSmall && <span className="opacity-80">· PROVISÓRIO</span>}
    </span>
  );
}
