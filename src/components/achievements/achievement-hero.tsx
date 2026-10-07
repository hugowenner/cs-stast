import { Trophy, Award, Crown, Sparkles, Target, Zap } from "lucide-react";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { AchievementsPageStats } from "@/server/services/achievement.service";

interface AchievementHeroProps {
  totalInCatalog: number;
  totalUnlocks: number;
  topCollector: AchievementsPageStats["topCollector"];
  rarestEntry: AchievementsPageStats["rarestEntry"];
}

export function AchievementHero({
  totalInCatalog,
  totalUnlocks,
  topCollector,
  rarestEntry,
}: AchievementHeroProps) {
  const unlockRate =
    totalInCatalog > 0
      ? Math.min(100, Math.round((totalUnlocks / (totalInCatalog * 5)) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-5 mb-2">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
              01 / ACHIEVEMENT RECORD
            </span>
            <TacticalBadge variant="tactical" size="sm">
              REGISTRO DE FEITOS
            </TacticalBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <Trophy className="size-6 text-primary shrink-0" />
            CONQUISTAS & DISTINÇÕES
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/80 max-w-2xl">
            Registro operacional de marcos individuais, proezas em clutches, recordes de combate e condecorações de carreira.
          </p>
        </div>

        {topCollector && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-sm bg-surface-panel border border-border/40 shrink-0">
            <PlayerAvatar
              nickname={topCollector.player.nickname}
              avatarUrl={topCollector.player.avatarUrl}
              size="sm"
            />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase text-muted-foreground/60 font-bold">
                Líder de Conquistas
              </span>
              <span className="text-xs font-mono font-black text-foreground">
                {topCollector.player.nickname}{" "}
                <span className="text-accent-gold tabular-nums">({topCollector.count} desbloqueios)</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Catálogo de Conquistas
            </span>
            <Award className="size-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {totalInCatalog}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              distinções
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Total de Desbloqueios
            </span>
            <Zap className="size-3.5 text-accent-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {totalUnlocks}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              conquistadas
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Distinção Mais Rara
            </span>
            <Sparkles className="size-3.5 text-accent-violet" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-sm sm:text-base font-black text-accent-gold truncate">
              {rarestEntry?.name ?? "—"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
              {rarestEntry ? `${rarestEntry.unlockCount}x conquistada` : "Nenhum desbloqueio"}
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Maior Colecionador
            </span>
            <Crown className="size-3.5 text-accent-gold" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-sm sm:text-base font-black text-foreground truncate">
              {topCollector?.player.nickname ?? "—"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
              {topCollector ? `${topCollector.count} condecorações` : "Nenhum registro"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
