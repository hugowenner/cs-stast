import { FadeIn } from "@/components/motion/fade-in";
import { Zap, TrendingDown, Map, AlertTriangle } from "lucide-react";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";

interface InsightTilesProps {
  hottestPlayer: PlayerMomentumEntry | null;
  coldestPlayer: PlayerMomentumEntry | null;
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
}

export function InsightTiles({ hottestPlayer, coldestPlayer, bestMap, worstMap }: InsightTilesProps) {
  if (!hottestPlayer && !coldestPlayer && !bestMap && !worstMap) return null;

  return (
    <FadeIn delay={0.05}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {hottestPlayer && (
          <div className="glass-panel rounded-xl border border-status-good/20 bg-status-good/[0.03] px-4 py-3.5 flex items-center gap-3">
            <Zap className="size-4 text-status-good shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">📈 Em alta no momento</p>
              <p className="text-sm font-black text-white truncate mt-0.5">{hottestPlayer.player.nickname}</p>
              <p className="text-[10px] text-status-good/90 font-semibold mt-0.5">{hottestPlayer.ratingChangeText}</p>
              {hottestPlayer.winrateChangeText && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hottestPlayer.winrateChangeText}</p>
              )}
            </div>
          </div>
        )}
        {coldestPlayer && (
          <div className="glass-panel rounded-xl border border-status-critical/20 bg-status-critical/[0.03] px-4 py-3.5 flex items-center gap-3">
            <TrendingDown className="size-4 text-status-critical shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest font-bold text-status-critical/80">😂 Fase ruim detectada</p>
              <p className="text-sm font-black text-white truncate mt-0.5">{coldestPlayer.player.nickname}</p>
              <p className="text-[10px] text-status-critical/90 font-semibold mt-0.5">{coldestPlayer.ratingChangeText}</p>
              {coldestPlayer.winrateChangeText && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{coldestPlayer.winrateChangeText}</p>
              )}
            </div>
          </div>
        )}
        {bestMap && (
          <div className="glass-panel rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.03] px-4 py-3.5 flex items-center gap-3">
            <Map className="size-4 text-accent-cyan shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">🔥 Território Dominado</p>
              <p className="text-sm font-black text-white mt-0.5">{bestMap.map}</p>
              <p className="text-[10px] text-accent-cyan/80 font-semibold mt-0.5">{bestMap.winrate.toFixed(0)}% WR · {bestMap.matchesPlayed} partidas</p>
            </div>
          </div>
        )}
        {worstMap && (
          <div className="glass-panel rounded-xl border border-status-warning/20 bg-status-warning/[0.03] px-4 py-3.5 flex items-center gap-3">
            <AlertTriangle className="size-4 text-status-warning shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest font-bold text-status-warning/80">😂 Onde a bala passa longe</p>
              <p className="text-sm font-black text-white mt-0.5">{worstMap.map}</p>
              <p className="text-[10px] text-status-warning/80 font-semibold mt-0.5">{worstMap.winrate.toFixed(0)}% WR · {worstMap.matchesPlayed} partidas · veto</p>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
