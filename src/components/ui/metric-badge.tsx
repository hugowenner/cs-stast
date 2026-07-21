import { cn } from "@/lib/utils";

export type BadgeTone = "good" | "neutral" | "critical" | "info" | "primary";

export function MetricBadge({
  value,
  tone = "neutral",
  className = "",
}: {
  value: string | number;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums border",
        tone === "good" && "bg-status-good/10 text-status-good border-status-good/20",
        tone === "neutral" && "bg-white/5 text-muted-foreground border-white/5",
        tone === "critical" && "bg-status-critical/10 text-status-critical border-status-critical/20",
        tone === "info" && "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
        tone === "primary" && "bg-primary/10 text-primary border-primary/20",
        className
      )}
    >
      {value}
    </span>
  );
}
