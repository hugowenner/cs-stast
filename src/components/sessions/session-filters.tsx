import Link from "next/link";
import { cn } from "@/lib/utils";
import { Swords, BarChart3, Filter } from "lucide-react";

export const SESSION_PERIODS = [
  { value: "7d", label: "7 DIAS" },
  { value: "30d", label: "30 DIAS" },
  { value: "season", label: "TEMPORADA" },
  { value: "all", label: "HISTÓRICO TOTAL" },
] as const;

export type SessionPeriod = (typeof SESSION_PERIODS)[number]["value"];

interface SessionFiltersProps {
  activePeriod: SessionPeriod;
  isPerformanceView?: boolean;
}

export function SessionFilters({ activePeriod, isPerformanceView = false }: SessionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4">
      {/* View Switcher */}
      <div className="flex items-center gap-1 bg-surface-deck p-1 rounded-sm border border-border/40">
        <Link
          href={`/sessions?period=${activePeriod}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150",
            !isPerformanceView
              ? "bg-primary text-black shadow-sm font-black"
              : "text-muted-foreground/70 hover:text-foreground hover:bg-surface-panel"
          )}
        >
          <Swords className="size-3.5" />
          <span>Partidas</span>
        </Link>
        <Link
          href={`/sessions?period=${activePeriod}&view=performance`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150",
            isPerformanceView
              ? "bg-primary text-black shadow-sm font-black"
              : "text-muted-foreground/70 hover:text-foreground hover:bg-surface-panel"
          )}
        >
          <BarChart3 className="size-3.5" />
          <span>Performance</span>
        </Link>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/50 hidden md:inline mr-1 flex items-center gap-1">
          <Filter className="size-3" /> Período:
        </span>
        {SESSION_PERIODS.map((period) => {
          const isActive = activePeriod === period.value;
          const href = isPerformanceView
            ? `/sessions?period=${period.value}&view=performance`
            : `/sessions?period=${period.value}`;

          return (
            <Link
              key={period.value}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 border whitespace-nowrap",
                isActive
                  ? "bg-surface-panel text-primary border-primary/50 shadow-sm"
                  : "bg-surface-deck text-muted-foreground/70 border-border/40 hover:text-foreground hover:border-border/80"
              )}
            >
              {period.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
