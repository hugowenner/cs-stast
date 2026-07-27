import { Lightbulb, Flame, Snowflake, Map, TrendingUp, Crosshair, Zap, Swords } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { WeeklyCuriosity, WeeklyCuriosityCategory } from "@/server/services/competitive.service";

interface WeeklyCuriosityCardProps {
  curiosity: WeeklyCuriosity | null;
}

const CATEGORY_META: Record<WeeklyCuriosityCategory, { icon: any; label: string; color: string }> = {
  "streak-hot": { icon: Flame, label: "Sequência de vitórias", color: "text-status-good" },
  "streak-cold": { icon: Snowflake, label: "Sequência de derrotas", color: "text-status-critical" },
  map: { icon: Map, label: "Domínio de mapa", color: "text-accent-cyan" },
  adr: { icon: TrendingUp, label: "Evolução de dano", color: "text-status-good" },
  "weekly-kills": { icon: Crosshair, label: "Atuação da semana", color: "text-status-warning" },
  "headshot-king": { icon: Crosshair, label: "Rei do HS", color: "text-accent-cyan" },
  "impact-beast": { icon: Zap, label: "Atuação de Impacto", color: "text-primary" },
  "duo-perfect": { icon: Swords, label: "Parceria Perfeita", color: "text-accent-violet" },
};

export function WeeklyCuriosityCard({ curiosity }: WeeklyCuriosityCardProps) {
  if (!curiosity) {
    return (
      <div className="glass-panel rounded-2xl border border-accent-violet/20 bg-accent-violet/[0.03] p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="size-3.5 text-accent-violet shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-violet/80">Curiosidade da Semana</p>
        </div>
        <div className="flex-1 flex items-center">
          <p className="text-xs text-muted-foreground/55">Nenhuma curiosidade relevante encontrada no momento.</p>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[curiosity.category] ?? { icon: Lightbulb, label: "Curiosidade", color: "text-accent-violet" };
  const CategoryIcon = meta.icon;

  return (
    <div className="glass-panel rounded-2xl border border-accent-violet/20 bg-accent-violet/[0.03] overflow-hidden h-full flex flex-col">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <Lightbulb className="size-3.5 text-accent-violet shrink-0" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-accent-violet/80">Curiosidade da Semana</p>
      </div>

      <div className="px-4 py-4 flex-1 flex flex-col justify-center gap-3">
        <div className="flex items-center gap-3">
          {curiosity.player ? (
            <PlayerAvatar nickname={curiosity.player.nickname} avatarUrl={curiosity.player.avatarUrl} size="md" />
          ) : (
            <div className="size-9 rounded-full bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center shrink-0">
              <CategoryIcon className={`size-4 ${meta.color}`} />
            </div>
          )}
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${meta.color}`}>
              <CategoryIcon className="size-2.5" />
              {meta.label}
            </span>
            <p className="text-xl font-black text-white mt-0.5 tabular-nums leading-none">{curiosity.metric}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-white/90 leading-relaxed">{curiosity.text}</p>
      </div>
    </div>
  );
}
