import Link from "next/link";
import { Crown, Flame, ShieldAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import type { MapSpecialist, MapPerformanceEntry } from "@/server/services/competitive.service";

interface ReisDosMapa {
  specialists: MapSpecialist[];
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
}

export function ReisDosMapa({ specialists, mapWinrates, bestMap, worstMap }: ReisDosMapa) {
  if (specialists.length === 0 && mapWinrates.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">

        {/* Grid de especialistas */}
        <div className="lg:col-span-2 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-accent-gold shrink-0" />
            <p className="text-xs font-bold text-white uppercase tracking-wider">Especialistas por Mapa</p>
          </div>
          {specialists.length === 0 ? (
            <p className="text-xs text-muted-foreground/55 text-center py-6">Nenhum especialista identificado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {specialists.slice(0, 9).map((spec) => (
                <div key={spec.mapName} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 hover:bg-white/[0.035] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/80 truncate">{spec.mapName}</span>
                    <span className="text-[9px] text-accent-gold" aria-hidden>👑</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="shrink-0">
                      <PlayerAvatar nickname={spec.player.nickname} avatarUrl={spec.player.avatarUrl} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/players/${spec.player.id}`} className="text-[11px] font-bold text-white hover:text-primary transition-colors block truncate leading-none">
                        {spec.player.nickname}
                      </Link>
                      <p className="text-[10px] font-black text-muted-foreground/55 tabular-nums leading-none mt-0.5">
                        <AnimatedNumber value={spec.rating} decimals={2} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart + indicadores */}
        <div className="lg:col-span-3 p-5 flex flex-col gap-4">
          <p className="text-xs font-bold text-white uppercase tracking-wider">Winrate por Mapa</p>
          {mapWinrates.length > 0 && (
            <div className="min-h-[220px]">
              <MapWinrateChart data={mapWinrates} />
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
            {bestMap && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-status-good/5 border border-status-good/10">
                <span className="flex items-center gap-1.5 text-status-good font-semibold text-xs">
                  <Flame className="size-3.5" /> Melhor mapa
                </span>
                <span className="text-white font-bold text-xs">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
              </div>
            )}
            {worstMap && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                <span className="flex items-center gap-1.5 text-status-critical font-semibold text-xs">
                  <ShieldAlert className="size-3.5" /> Mapa problema
                </span>
                <span className="text-white font-bold text-xs">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
