"use client";

import Link from "next/link";
import { Crown, Flame, ShieldAlert } from "lucide-react";
import { mapNarratives } from "@/lib/narrator/templates";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { IconMVP } from "@/components/ui/cs-icons";
import type { MapSpecialist, MapPerformanceEntry } from "@/server/services/competitive.service";

interface ReisDosMapa {
  specialists: MapSpecialist[];
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
}

const MAP_IMAGES: Record<string, string> = {
  mirage: "/maps/mirage.png",
  dust2: "/maps/dust2.png",
  inferno: "/maps/inferno.png",
  ancient: "/maps/ancient.png",
  cache: "/maps/cache.png",
  overpass: "/maps/overpass.png",
};

function getMapImage(mapName: string): string | null {
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGES[norm] ?? null;
}

export function ReisDosMapa({ specialists, mapWinrates, bestMap, worstMap }: ReisDosMapa) {
  if (specialists.length === 0 && mapWinrates.length === 0) return null;

  return (
    <div className="card-important rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">

        {/* Grid de especialistas */}
        <div className="lg:col-span-2 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Crown className="size-3.5 text-accent-gold shrink-0" />
            <p className="text-[9px] font-black text-white/70 uppercase tracking-[0.14em]">Donos de Cada Mapa</p>
          </div>
          {specialists.length === 0 ? (
            <p className="text-xs text-muted-foreground/55 text-center py-6">Nenhum especialista identificado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {specialists.slice(0, 9).map((spec) => {
                const mapImg = getMapImage(spec.mapName);
                return (
                  <div
                    key={spec.mapName}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-2 hover:bg-white/[0.04] card-hover-tactical transition-colors relative overflow-hidden z-0 group"
                  >
                    {mapImg && (
                      <>
                        <img
                          src={mapImg}
                          alt={spec.mapName}
                          className="absolute inset-0 w-full h-full object-cover opacity-[0.35] blur-[1px] z-0 pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/85 z-0 pointer-events-none select-none" />
                      </>
                    )}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-10" />
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[10px] font-black text-white truncate [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{spec.mapName}</span>
                      <IconMVP size={11} className="text-accent-gold shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 relative z-10">
                      <div className="shrink-0">
                        <PlayerAvatar nickname={spec.player.nickname} avatarUrl={spec.player.avatarUrl} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <Link href={`/players/${spec.player.id}`} className="text-[11px] font-bold text-white hover:text-primary transition-colors block truncate leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                          {spec.player.nickname}
                        </Link>
                        <p className="text-[10px] font-black text-white tabular-nums leading-none mt-0.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                          <AnimatedNumber value={spec.rating} decimals={2} />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart + indicadores */}
        <div className="lg:col-span-3 p-5 flex flex-col gap-4">
          <p className="text-[9px] font-black text-white/70 uppercase tracking-[0.14em]">Winrate por Mapa</p>
          {mapWinrates.length > 0 && (
            <div className="min-h-[220px]">
              <MapWinrateChart data={mapWinrates} />
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
            {bestMap && (() => {
              const bestMapImg = getMapImage(bestMap.map);
              return (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-status-good/[0.05] border border-status-good/12 relative overflow-hidden z-0 group">
                  {bestMapImg && (
                    <>
                      <img
                        src={bestMapImg}
                        alt={bestMap.map}
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.35] blur-[1px] z-0 pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90 z-0 pointer-events-none select-none" />
                    </>
                  )}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="flex items-center gap-1.5 text-status-good font-black text-[10px] uppercase tracking-wide [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                      <Flame className="size-3.5" /> Território
                    </span>
                    <span className="text-white font-black text-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                  </div>
                  <p className="text-[9px] text-white/90 italic leading-snug [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] relative z-10">{mapNarratives.dominant[0].tagline}</p>
                </div>
              );
            })()}
            {worstMap && (() => {
              const worstMapImg = getMapImage(worstMap.map);
              return (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-status-critical/[0.05] border border-status-critical/12 relative overflow-hidden z-0 group">
                  {worstMapImg && (
                    <>
                      <img
                        src={worstMapImg}
                        alt={worstMap.map}
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.35] blur-[1px] z-0 pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90 z-0 pointer-events-none select-none" />
                    </>
                  )}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="flex items-center gap-1.5 text-status-critical font-black text-[10px] uppercase tracking-wide [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                      <ShieldAlert className="size-3.5" /> Território difícil
                    </span>
                    <span className="text-white font-black text-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                  </div>
                  <p className="text-[9px] text-white/90 italic leading-snug [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] relative z-10">{mapNarratives.struggle[0].tagline}</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
