import type { AdvancedPerformanceStats } from "@/server/services/competitive.service";
import { StatTile } from "@/components/ui/stat-tile";
import { Zap, Activity, Flame, Trophy, Star, Award, Swords } from "lucide-react";

type AdvancedPerformanceProps = {
  stats: AdvancedPerformanceStats;
};

export function AdvancedPerformanceSection({ stats }: AdvancedPerformanceProps) {
  if (!stats || stats.sampleSize === 0) {
    return (
      <div className="glass-panel p-8 border border-white/[0.06] bg-white/[0.005] rounded-2xl text-center flex flex-col items-center justify-center select-none">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.06] text-muted-foreground/30 mb-5">
          <Swords className="size-6 text-primary" />
        </div>
        <p className="text-sm font-black text-white/90">
          Dados avançados da Gamers Club ainda não disponíveis
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-sm mt-2 leading-relaxed">
          As partidas analisadas nesta temporada ainda não possuem estatísticas de dano bruto ou ratings originais da GC.
        </p>
      </div>
    );
  }

  const {
    sampleSize,
    averageDamage,
    averageGcRating,
    totalDoubleKills,
    totalTripleKills,
    totalQuadKills,
    totalAces,
  } = stats;

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de Médias de Dano e Rating GC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatTile
          label="Damage Médio por Partida"
          value={averageDamage !== null ? averageDamage : "Dados indisponíveis"}
          icon={Zap}
          accent="cyan"
          context="⚡ Impacto médio em HP causado"
        />
        <StatTile
          label="GC Rating Médio"
          value={averageGcRating !== null ? averageGcRating.toFixed(2) : "Dados indisponíveis"}
          icon={Activity}
          accent="violet"
          context="📈 Rating nativo da plataforma"
        />
      </div>

      {/* Grid de Multikills Consolidados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Double Kills */}
        <div className="glass-panel p-4 flex flex-col gap-1 border border-white/[0.05] bg-white/[0.005] rounded-xl hover:border-white/[0.09] transition-colors relative overflow-hidden group select-none">
          <div className="absolute right-3 top-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Flame className="size-12 text-primary" />
          </div>
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            Double Kills
          </span>
          <span className="text-2xl font-black text-white mt-2 tabular-nums">
            {totalDoubleKills !== null ? totalDoubleKills : "—"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/45 mt-0.5 uppercase tracking-wider">
            2 Kills no Round
          </span>
        </div>

        {/* Triple Kills */}
        <div className="glass-panel p-4 flex flex-col gap-1 border border-white/[0.05] bg-white/[0.005] rounded-xl hover:border-white/[0.09] transition-colors relative overflow-hidden group select-none">
          <div className="absolute right-3 top-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Trophy className="size-12 text-primary" />
          </div>
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            Triple Kills
          </span>
          <span className="text-2xl font-black text-white mt-2 tabular-nums">
            {totalTripleKills !== null ? totalTripleKills : "—"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/45 mt-0.5 uppercase tracking-wider">
            3 Kills no Round
          </span>
        </div>

        {/* Quad Kills */}
        <div className="glass-panel p-4 flex flex-col gap-1 border border-white/[0.05] bg-white/[0.005] rounded-xl hover:border-white/[0.09] transition-colors relative overflow-hidden group select-none">
          <div className="absolute right-3 top-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Star className="size-12 text-primary" />
          </div>
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            Quad Kills
          </span>
          <span className="text-2xl font-black text-white mt-2 tabular-nums">
            {totalQuadKills !== null ? totalQuadKills : "—"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/45 mt-0.5 uppercase tracking-wider">
            4 Kills no Round
          </span>
        </div>

        {/* Aces */}
        <div className="glass-panel p-4 flex flex-col gap-1 border border-white/[0.05] bg-white/[0.005] rounded-xl hover:border-white/[0.09] transition-colors relative overflow-hidden group select-none">
          <div className="absolute right-3 top-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Award className="size-12 text-primary" />
          </div>
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            Aces
          </span>
          <span className="text-2xl font-black text-white mt-2 tabular-nums">
            {totalAces !== null ? totalAces : "—"}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/45 mt-0.5 uppercase tracking-wider">
            5 Kills no Round
          </span>
        </div>
      </div>

      {/* Contexto Amostral */}
      <div className="flex items-center justify-end text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">
        <span>Baseado em {sampleSize} {sampleSize === 1 ? "partida" : "partidas"} com dados disponíveis</span>
      </div>
    </div>
  );
}
