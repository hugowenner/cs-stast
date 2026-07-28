import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all duration-200 shadow-md group",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="rounded-lg border border-white/5 bg-white/5 p-2 text-muted-foreground group-hover:text-primary transition-colors">
          <Icon className="size-4 shrink-0" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-black tracking-tight text-foreground select-all">
          {value}
        </span>
        
        {trend && (
          <span
            className={cn(
              "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              trend.isPositive
                ? "bg-status-good/10 text-status-good border border-status-good/20"
                : "bg-status-critical/10 text-status-critical border border-status-critical/20"
            )}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="size-3 mr-0.5 shrink-0" />
            ) : (
              <ArrowDownRight className="size-3 mr-0.5 shrink-0" />
            )}
            {trend.value}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
