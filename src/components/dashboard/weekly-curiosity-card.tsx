import { Lightbulb } from "lucide-react";
import type { WeeklyCuriosity } from "@/server/services/competitive.service";

interface WeeklyCuriosityCardProps {
  curiosity: WeeklyCuriosity | null;
}

export function WeeklyCuriosityCard({ curiosity }: WeeklyCuriosityCardProps) {
  return (
    <div className="glass-panel rounded-2xl border border-accent-violet/20 bg-accent-violet/[0.03] p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-3.5 text-accent-violet shrink-0" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-accent-violet/80">Curiosidade da Semana</p>
      </div>
      <div className="flex-1 flex items-center">
        {curiosity ? (
          <p className="text-sm font-semibold text-white leading-relaxed">{curiosity.text}</p>
        ) : (
          <p className="text-xs text-muted-foreground/55">Nenhuma curiosidade relevante encontrada no momento.</p>
        )}
      </div>
    </div>
  );
}
