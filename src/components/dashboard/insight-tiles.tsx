import { FadeIn } from "@/components/motion/fade-in";
import { Zap, TrendingDown, Map, AlertTriangle } from "lucide-react";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { HudBadge } from "@/components/ui/hud-badge";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hottestPlayer && (
          <div className="card-important card-hover-tactical rounded-2xl border-status-good/15 overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-status-good/30 to-transparent" />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-status-good" />
                  <p className="text-[8px] uppercase tracking-widest font-black text-status-good/80">Em alta</p>
                </div>
                <HudBadge label="HOT" variant="green" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-tight">{hottestPlayer.player.nickname}</p>
                <p className="text-[11px] text-status-good font-bold mt-1">{hottestPlayer.ratingChangeText}</p>
                {hottestPlayer.winrateChangeText && (
                  <p className="text-[10px] text-muted-foreground/55 mt-0.5">{hottestPlayer.winrateChangeText}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {coldestPlayer && (
          <div className="card-important card-hover-tactical rounded-2xl border-status-critical/15 overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-status-critical/30 to-transparent" />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="size-3.5 text-status-critical" />
                  <p className="text-[8px] uppercase tracking-widest font-black text-status-critical/80">Em queda</p>
                </div>
                <HudBadge label="COLD" variant="red" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-tight">{coldestPlayer.player.nickname}</p>
                <p className="text-[11px] text-status-critical font-bold mt-1">{coldestPlayer.ratingChangeText}</p>
                {coldestPlayer.winrateChangeText && (
                  <p className="text-[10px] text-muted-foreground/55 mt-0.5">{coldestPlayer.winrateChangeText}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {bestMap && (
          <div className="card-important card-hover-tactical rounded-2xl border-accent-cyan/15 overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Map className="size-3.5 text-accent-cyan" />
                  <p className="text-[8px] uppercase tracking-widest font-black text-accent-cyan/80">Território</p>
                </div>
                <HudBadge label="MAPA" variant="cyan" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-tight">{bestMap.map}</p>
                <p className="text-[11px] text-accent-cyan font-bold mt-1">{bestMap.winrate.toFixed(0)}% WR</p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">{bestMap.matchesPlayed} partidas</p>
              </div>
            </div>
          </div>
        )}
        {worstMap && (
          <div className="card-important card-hover-tactical rounded-2xl border-status-warning/15 overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-status-warning/30 to-transparent" />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-status-warning" />
                  <p className="text-[8px] uppercase tracking-widest font-black text-status-warning/80">Pior mapa</p>
                </div>
                <HudBadge label="VETO" variant="gold" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-tight">{worstMap.map}</p>
                <p className="text-[11px] text-status-warning font-bold mt-1">{worstMap.winrate.toFixed(0)}% WR</p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">{worstMap.matchesPlayed} partidas</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
