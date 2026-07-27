import Link from "next/link";
import { cn } from "@/lib/utils";

export const SESSION_PERIODS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "season", label: "Temporada atual" },
  { value: "all", label: "Todas as sessões" },
] as const;

export type SessionPeriod = (typeof SESSION_PERIODS)[number]["value"];

interface SessionFiltersProps {
  activePeriod: SessionPeriod;
}

export function SessionFilters({ activePeriod }: SessionFiltersProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap flex-nowrap shrink-0 border-b border-white/[0.04] mb-4">
      {SESSION_PERIODS.map((period) => (
        <Link
          key={period.value}
          href={`/sessions?period=${period.value}`}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
            activePeriod === period.value
              ? "bg-primary text-black border-primary font-black shadow-[0_0_12px_0_rgba(var(--primary-rgb),0.15)]"
              : "text-muted-foreground/75 border-white/[0.06] bg-white/[0.02] hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04]",
          )}
        >
          {period.label}
        </Link>
      ))}
    </div>
  );
}
