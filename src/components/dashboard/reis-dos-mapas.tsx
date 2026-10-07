"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, Flame, ShieldAlert, Crosshair, MapPin } from "lucide-react";
import { mapNarratives } from "@/lib/narrator/templates";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import type { MapSpecialist, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

export interface ReisDosMapaProps {
  specialists: MapSpecialist[];
  mapWinrates: MapPerformanceEntry[];
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
}

export function ReisDosMapa({
  specialists,
  mapWinrates,
  bestMap,
  worstMap,
}: ReisDosMapaProps) {
  if (specialists.length === 0 && mapWinrates.length === 0) return null;

  // Build a lookup of specialists by normalized map name
  const specialistMap = new Map<string, MapSpecialist>();
  specialists.forEach((s) => {
    const norm = s.mapName.toLowerCase().replace(/^de_/, "").trim();
    specialistMap.set(norm, s);
  });

  return (
    <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col">
      {/* Top Header Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500/80 via-primary/80 to-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
        
        {/* ─── 1. MAP SPECIALISTS & INTELLIGENCE GRID (7 cols) ─── */}
        <div className="lg:col-span-7 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="size-3.5 text-primary" />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.16em]">
                Controle de Território por Mapa
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Mínimo 3 partidas
            </span>
          </div>

          {specialists.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
              Nenhum especialista consolidado nesta temporada.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {specialists.slice(0, 9).map((spec) => {
                const mapImg = getCleanMapImage(spec.mapName);
                const norm = spec.mapName.toLowerCase().replace(/^de_/, "").trim();
                const wrEntry = mapWinrates.find(
                  (m) => m.map.toLowerCase().replace(/^de_/, "").trim() === norm
                );
                const isDominant = bestMap?.map.toLowerCase().replace(/^de_/, "").trim() === norm;

                return (
                  <div
                    key={spec.mapName}
                    className={cn(
                      "relative flex flex-col justify-between p-3.5 bg-surface-deck border rounded-xs transition-micro group overflow-hidden",
                      isDominant
                        ? "border-primary/40 hover:border-primary/80"
                        : "border-border/60 hover:border-border/90"
                    )}
                  >
                    {/* Background Map Imagery with contrast overlay */}
                    {mapImg && (
                      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                        <img
                          src={mapImg}
                          alt={spec.mapName}
                          className="w-full h-full object-cover object-center opacity-25 grayscale-[20%] group-hover:scale-105 group-hover:opacity-35 transition-all duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-deck via-surface-deck/85 to-transparent" />
                      </div>
                    )}

                    {/* Top Row: Map Name + Tag */}
                    <div className="relative z-10 flex items-start justify-between gap-1 mb-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 font-semibold block">
                          MAPA
                        </span>
                        <span className="text-xs font-mono font-black uppercase text-foreground truncate block">
                          {spec.mapName.replace(/^de_/i, "")}
                        </span>
                      </div>
                      {isDominant ? (
                        <TacticalBadge label="DOMÍNIO" variant="primary" size="xs" />
                      ) : (
                        <Crown className="size-3 text-gold/80 shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Middle Row: Specialist Player */}
                    <div className="relative z-10 flex items-center gap-2 py-1.5 border-y border-border/30 my-1">
                      <PlayerAvatar
                        nickname={spec.player.nickname}
                        avatarUrl={spec.player.avatarUrl}
                        size="sm"
                      />
                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/players/${spec.player.id}`}
                          className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate leading-tight"
                        >
                          {spec.player.nickname}
                        </Link>
                        <span className="text-[10px] font-mono font-bold text-gold tabular-nums">
                          {spec.rating.toFixed(2)} <span className="text-[8px] font-normal text-muted-foreground/60">RTG</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Group Winrate context */}
                    <div className="relative z-10 flex items-center justify-between pt-1 text-[9px] font-mono text-muted-foreground/70">
                      <span>{wrEntry ? `${wrEntry.matchesPlayed} partidas` : "—"}</span>
                      {wrEntry && (
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            wrEntry.winrate >= 60
                              ? "text-status-good"
                              : wrEntry.winrate < 45
                                ? "text-status-critical"
                                : "text-foreground"
                          )}
                        >
                          {wrEntry.winrate.toFixed(0)}% WR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 2. WINRATE CHART & EXTREMES (5 cols) ─── */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-5 bg-surface-deck/30">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.16em]">
                Aproveitamento Coletivo (%)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                Winrate da Temporada
              </span>
            </div>

            {mapWinrates.length > 0 && (
              <div className="min-h-[190px]">
                <MapWinrateChart data={mapWinrates} />
              </div>
            )}
          </div>

          {/* Best / Worst Territory Callouts */}
          <div className="flex flex-col gap-2.5 border-t border-border/40 pt-3.5">
            {bestMap && (() => {
              const bestMapImg = getCleanMapImage(bestMap.map);
              return (
                <div className="relative flex flex-col gap-1 p-3 rounded-xs bg-status-good/[0.04] border border-status-good/25 overflow-hidden group">
                  {bestMapImg && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={bestMapImg}
                        alt={bestMap.map}
                        className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-surface-deck/90 via-surface-deck/70 to-transparent" />
                    </div>
                  )}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-status-good font-mono font-bold text-[10px] uppercase tracking-wider">
                      <Flame className="size-3.5" /> Território Forte
                    </span>
                    <span className="font-mono font-bold text-xs text-foreground tabular-nums">
                      {bestMap.map.replace(/^de_/i, "")} · {bestMap.winrate.toFixed(0)}% WR
                    </span>
                  </div>
                  <p className="relative z-10 text-[10px] font-mono text-muted-foreground/80 italic leading-snug mt-0.5">
                    &ldquo;{mapNarratives.dominant[0].tagline}&rdquo;
                  </p>
                </div>
              );
            })()}

            {worstMap && (() => {
              const worstMapImg = getCleanMapImage(worstMap.map);
              return (
                <div className="relative flex flex-col gap-1 p-3 rounded-xs bg-status-critical/[0.04] border border-status-critical/25 overflow-hidden group">
                  {worstMapImg && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={worstMapImg}
                        alt={worstMap.map}
                        className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-surface-deck/90 via-surface-deck/70 to-transparent" />
                    </div>
                  )}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-status-critical font-mono font-bold text-[10px] uppercase tracking-wider">
                      <ShieldAlert className="size-3.5" /> Ponto Crítico
                    </span>
                    <span className="font-mono font-bold text-xs text-foreground tabular-nums">
                      {worstMap.map.replace(/^de_/i, "")} · {worstMap.winrate.toFixed(0)}% WR
                    </span>
                  </div>
                  <p className="relative z-10 text-[10px] font-mono text-muted-foreground/80 italic leading-snug mt-0.5">
                    &ldquo;{mapNarratives.struggle[0].tagline}&rdquo;
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
