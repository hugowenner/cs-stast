"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, Flame, ShieldAlert, Crosshair } from "lucide-react";
import { mapNarratives } from "@/lib/narrator/templates";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import type { MapSpecialist, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn, cleanMapName } from "@/lib/utils";

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
                Destaque por Aproveitamento
              </span>
            </div>
            <span
              className="text-[9px] font-mono text-muted-foreground/80 bg-surface-base/50 border border-border/40 px-2 py-0.5 rounded-[2px] cursor-help"
              title="A classificação equilibra percentual de vitórias e quantidade de partidas usando o limite inferior de Wilson com 95% de confiança. Históricos maiores reduzem a incerteza. Por isso, o maior percentual exibido nem sempre ocupa o primeiro lugar."
            >
              Ranking ajustado pela amostra
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
                const displayName = spec.cleanMapName || cleanMapName(spec.mapName);
                const isDominant = bestMap?.map.toLowerCase().replace(/^de_/, "").trim() === norm;

                return (
                  <div
                    key={spec.mapId ?? spec.mapName}
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

                    {/* Top Row: Map Name + Dominant Tag */}
                    <div className="relative z-10 flex items-start justify-between gap-1 mb-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 font-semibold block">
                          MAPA
                        </span>
                        <span className="text-xs font-mono font-black uppercase text-foreground truncate block">
                          {displayName}
                        </span>
                      </div>
                      {isDominant && (
                        <TacticalBadge label="DOMÍNIO" variant="primary" size="xs" />
                      )}
                    </div>

                    {/* Middle Row: Leader Player & Podium or Empty State */}
                    {spec.player ? (
                      <div className="relative z-10 flex flex-col gap-2 my-1">
                        {/* ─── 1º Colocado (Destaque: Melhor Aproveitamento) ─── */}
                        <div className="flex items-center gap-2 py-1.5 border-y border-border/30">
                          <PlayerAvatar
                            nickname={spec.player.nickname}
                            avatarUrl={spec.player.avatarUrl}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[9px] font-mono font-bold text-gold shrink-0">#1</span>
                                <Link
                                  href={`/players/${spec.player.id}`}
                                  className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate leading-tight"
                                >
                                  {spec.player.nickname}
                                </Link>
                                <Crown className="size-3 text-gold shrink-0" aria-label="1º lugar (Destaque por aproveitamento)" />
                              </div>
                              {spec.rating !== null && (
                                <span
                                  title={`Rating no mapa: ${spec.rating.toFixed(2)}${
                                    spec.wilsonScore !== null && spec.wilsonScore !== undefined
                                      ? ` • Índice para classificação: ${(spec.wilsonScore * 100).toFixed(1)}`
                                      : ""
                                  }`}
                                  className="cursor-help text-[9px] font-mono text-muted-foreground/60 hover:text-foreground shrink-0 tabular-nums"
                                >
                                  ({spec.rating.toFixed(2)})
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline justify-between gap-1 mt-0.5">
                              <span className="text-xs font-mono font-black text-status-good tabular-nums">
                                {spec.winrate.toFixed(0)}%
                              </span>
                              <span
                                className="text-[9px] font-mono text-muted-foreground/75 tabular-nums cursor-help"
                                title={
                                  spec.wilsonScore !== null && spec.wilsonScore !== undefined
                                    ? `Índice para classificação: ${(spec.wilsonScore * 100).toFixed(1)}`
                                    : undefined
                                }
                              >
                                {spec.wins} {spec.wins === 1 ? "vitória" : "vitórias"} em {spec.matches} {spec.matches === 1 ? "partida" : "partidas"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ─── 2º e 3º Colocados (Linhas Compactas) ─── */}
                        {spec.podium && spec.podium.length > 1 && (
                          <div className="flex flex-col gap-1">
                            {spec.podium.slice(1).map((runnerUp, idx) => {
                              const pos = idx + 2;
                              return (
                                <div
                                  key={runnerUp.player.id}
                                  className="flex items-center justify-between gap-1.5 py-1 px-1.5 rounded-xs bg-surface-base/30 border border-border/25 text-[10px] font-mono hover:border-border/60 transition-micro"
                                  title={`Rating no mapa: ${runnerUp.rating.toFixed(2)}${
                                    runnerUp.wilsonScore !== undefined
                                      ? ` • Índice para classificação: ${(runnerUp.wilsonScore * 100).toFixed(1)}`
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className={cn(
                                      "text-[8px] font-bold px-1 rounded-[2px] shrink-0 tabular-nums",
                                      pos === 2 ? "text-slate-300 bg-white/10" : "text-amber-500 bg-amber-500/10"
                                    )}>
                                      #{pos}
                                    </span>
                                    <PlayerAvatar
                                      nickname={runnerUp.player.nickname}
                                      avatarUrl={runnerUp.player.avatarUrl}
                                      size="xs"
                                    />
                                    <Link
                                      href={`/players/${runnerUp.player.id}`}
                                      className="font-medium text-foreground/90 hover:text-primary transition-micro truncate leading-tight max-w-[85px] sm:max-w-[110px]"
                                    >
                                      {runnerUp.player.nickname}
                                    </Link>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 tabular-nums text-[9px] text-muted-foreground/80">
                                    <span className="font-bold text-foreground">
                                      {runnerUp.winrate.toFixed(0)}%
                                    </span>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span
                                      title={
                                        runnerUp.wilsonScore !== undefined
                                          ? `Índice para classificação: ${(runnerUp.wilsonScore * 100).toFixed(1)}`
                                          : undefined
                                      }
                                    >
                                      {runnerUp.wins}V em {runnerUp.matches}P
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col justify-center py-3 border-y border-border/30 my-1 min-h-[56px]">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground/80">
                          Nenhum jogador elegível
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50 leading-tight mt-0.5">
                          É necessário disputar pelo menos 5 partidas e conquistar 1 vitória neste mapa.
                        </span>
                      </div>
                    )}

                    {/* Bottom Row: Individual Performance or Placeholder */}
                    <div className="relative z-10 flex items-center justify-between pt-1 text-[9px] font-mono text-muted-foreground/50">
                      <span
                        className="cursor-help underline decoration-dotted decoration-muted-foreground/40 hover:text-foreground transition-micro"
                        title="A classificação equilibra percentual de vitórias e quantidade de partidas usando o limite inferior de Wilson com 95% de confiança. Históricos maiores reduzem a incerteza. Por isso, o maior percentual exibido nem sempre ocupa o primeiro lugar."
                      >
                        Mínimo: 5 partidas
                      </span>
                      <span className="text-[8px] font-mono text-muted-foreground/60">
                        Ajustado pela amostra
                      </span>
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
              const displayName = bestMap.cleanMapName || cleanMapName(bestMap.map);
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
                      {displayName} · {bestMap.winrate.toFixed(0)}% WR
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
              const displayName = worstMap.cleanMapName || cleanMapName(worstMap.map);
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
                      {displayName} · {worstMap.winrate.toFixed(0)}% WR
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
