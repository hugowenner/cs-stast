"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, TrendingUp, TrendingDown, Target, Shield, Flame, Activity, Compass } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MetricDisplay } from "@/components/ui/metric-display";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

export interface SeasonHeroProps {
  seasonLabel: string;
  seasonStatus?: string;
  totalMatches: number;
  bestPlayer: { nickname: string; rating: number; avatarUrl?: string | null } | null;
  communityWinrate: number;
  dominantMap: { name: string; percentage: number } | null;
  totalPlayers: number;
  advancedStats: {
    totalRounds: number;
    totalKills: number;
    avgAdr: number;
    avgKd: number;
    avgHsPercent: number;
  };
  hottestPlayer: PlayerMomentumEntry | null;
  coldestPlayer: PlayerMomentumEntry | null;
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
  action?: React.ReactNode;
}

function PlayerAvatar({
  avatarUrl,
  nickname,
  size = "size-8",
}: {
  avatarUrl?: string | null;
  nickname: string;
  size?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className={cn("rounded-sm object-cover border border-border/80 shrink-0", size)}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  const initial = nickname.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 font-mono font-bold text-primary text-[10px] uppercase tracking-wider select-none",
        size
      )}
    >
      {initial}
    </div>
  );
}

export function SeasonHero({
  seasonLabel,
  seasonStatus = "ACTIVE",
  totalMatches,
  bestPlayer,
  communityWinrate,
  dominantMap,
  totalPlayers,
  advancedStats,
  hottestPlayer,
  coldestPlayer,
  bestMap,
  worstMap,
  action,
}: SeasonHeroProps) {
  const formattedLabel = seasonLabel
    .replace(" de ", "/")
    .replace(/^\w/, (c) => c.toUpperCase());

  const isActive = seasonStatus === "ACTIVE";
  const prefersReduced = useReducedMotion();

  const dominantMapImg = dominantMap ? getCleanMapImage(dominantMap.name) : null;
  const bestMapImg = bestMap ? getCleanMapImage(bestMap.map) : null;
  const worstMapImg = worstMap ? getCleanMapImage(worstMap.map) : null;

  const bestMapMatch = bestMap && dominantMap && (
    bestMap.map.toLowerCase().replace(/^de_/, "").trim() === dominantMap.name.toLowerCase().replace(/^de_/, "").trim()
  ) ? bestMap : null;

  return (
    <div className="relative flex flex-col bg-surface-panel border border-border/70 rounded-sm overflow-hidden shadow-lg">
      {/* Top Tactical Accent Bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-primary via-gold to-border/40" />

      {/* ─── 1. HEADER ROW: Season Identity + Status + Selector ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 border-b border-border/40 bg-surface-deck/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 items-center justify-center bg-primary/10 border border-primary/25 rounded-xs shrink-0">
            <Trophy className="size-4 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                Central de Inteligência
              </span>
              <TacticalBadge
                label={isActive ? "EM ANDAMENTO" : "FINALIZADA"}
                variant={isActive ? "good" : "neutral"}
                size="xs"
              />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight truncate mt-0.5">
              {formattedLabel}
            </h2>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* ─── 2. MAIN TELEMETRY DECK ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
        
        {/* Leader Highlight Module (5 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between gap-6 bg-gradient-to-b from-surface-elevated/20 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <TacticalBadge label="LÍDER OFICIAL" variant="gold" size="xs" />
                <span className="text-[10px] font-mono text-gold font-bold">#1 DA TEMPORADA</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">
                Maior pontuação competitiva registrada.
              </p>
            </div>
          </div>

          {bestPlayer ? (
            <div className="flex items-center gap-4 py-2">
              <PlayerAvatar
                avatarUrl={bestPlayer.avatarUrl}
                nickname={bestPlayer.nickname}
                size="size-14 sm:size-16"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60 font-semibold">
                  Melhor Rating Médio
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight truncate">
                  {bestPlayer.nickname}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-gold tabular-nums">
                    <AnimatedNumber value={bestPlayer.rating} decimals={2} />
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gold/80 font-bold">
                    RATING 2.0
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground/60 font-mono">
              Aguardando primeiras partidas oficiais.
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-[11px] text-muted-foreground/70 font-mono">
            <span>{totalPlayers} jogadores monitorados</span>
            <Link
              href="/rankings"
              className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider transition-micro flex items-center gap-1"
            >
              Ver Tabela Completa →
            </Link>
          </div>
        </div>

        {/* Core Season Telemetry Matrix (7 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            <MetricDisplay
              label="PARTIDAS"
              value={totalMatches}
              context={`${advancedStats.totalRounds} rounds jogados`}
              size="md"
              accent="orange"
            />
            <MetricDisplay
              label="TAXA DE VITÓRIA"
              value={`${communityWinrate}%`}
              context={communityWinrate >= 50 ? "Balanço positivo" : "Abaixo de 50%"}
              reaction={communityWinrate >= 55 ? "positive" : communityWinrate < 45 ? "negative" : "neutral"}
              size="md"
            />
            <MetricDisplay
              label="TOTAL DE KILLS"
              value={<AnimatedNumber value={advancedStats.totalKills} decimals={0} />}
              context={`${advancedStats.avgAdr.toFixed(0)} ADR médio coletivo`}
              size="md"
              accent="muted"
            />
            <MetricDisplay
              label="K/D COLETIVO"
              value={<AnimatedNumber value={advancedStats.avgKd} decimals={2} />}
              context="Relação de eliminações"
              reaction={advancedStats.avgKd >= 1.05 ? "positive" : advancedStats.avgKd < 0.95 ? "negative" : "neutral"}
              size="md"
            />
            <MetricDisplay
              label="PRECISÃO HS%"
              value={<AnimatedNumber value={advancedStats.avgHsPercent} decimals={0} suffix="%" />}
              context="Taxa de tiro na cabeça"
              size="md"
              accent="cyan"
            />

            {/* Bloco MAPA DOMINANTE com miniatura compacta */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-gold/90 truncate">
                MAPA DOMINANTE
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                {dominantMapImg && (
                  <div className="relative size-8 sm:size-9 rounded-sm overflow-hidden border border-border/60 shrink-0 bg-surface-panel shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dominantMapImg}
                      alt={dominantMap ? dominantMap.name : "Mapa"}
                      className="w-full h-full object-cover object-center opacity-85"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate block leading-tight uppercase">
                    {dominantMap ? dominantMap.name.replace(/^de_/i, "") : "—"}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground/80 truncate">
                {dominantMap ? (
                  <>
                    <span className="font-semibold text-foreground/90">{dominantMap.percentage}%</span> das partidas
                    {bestMapMatch ? ` · ${bestMapMatch.winrate.toFixed(0)}% WR` : ""}
                  </>
                ) : (
                  "Distribuição neutra"
                )}
              </span>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="border-t border-border/30 pt-3 text-[11px] text-muted-foreground/60 font-mono flex items-center justify-between">
            <span>Telemetria agregada da temporada</span>
            <span className="text-foreground/80 font-bold uppercase">Taxa de amostragem ativa</span>
          </div>
        </div>
      </div>

      {/* ─── 3. TRAJECTORY & MOMENTUM FOOTER ─── */}
      {(hottestPlayer || coldestPlayer || bestMap || worstMap) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/30 border-t border-border/40 bg-surface-deck/70">
          
          {/* Em Alta */}
          {hottestPlayer ? (
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar
                  nickname={hottestPlayer.player.nickname}
                  avatarUrl={hottestPlayer.player.avatarUrl}
                  size="size-7"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-status-good font-bold">
                    EM ALTA · ÚLTIMOS JOGOS
                  </span>
                  <Link
                    href={`/players/${hottestPlayer.player.id}`}
                    className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                  >
                    {hottestPlayer.player.nickname}
                  </Link>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-status-good shrink-0 tabular-nums">
                {hottestPlayer.recentRating.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="p-3.5 text-[11px] text-muted-foreground/50 font-mono">Sem streak de alta</div>
          )}

          {/* Ponto de Atenção */}
          {coldestPlayer ? (
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar
                  nickname={coldestPlayer.player.nickname}
                  avatarUrl={coldestPlayer.player.avatarUrl}
                  size="size-7"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-status-warning font-bold">
                    PONTO DE ATENÇÃO
                  </span>
                  <Link
                    href={`/players/${coldestPlayer.player.id}`}
                    className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                  >
                    {coldestPlayer.player.nickname}
                  </Link>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-status-warning shrink-0 tabular-nums">
                {coldestPlayer.recentRating.toFixed(2)} ({coldestPlayer.ratingChangeText})
              </span>
            </div>
          ) : (
            <div className="p-3.5 text-[11px] text-muted-foreground/50 font-mono">Sem queda crítica</div>
          )}

          {/* Melhor Mapa */}
          {bestMap ? (
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {bestMapImg ? (
                  <div className="relative size-7 rounded-sm overflow-hidden border border-border/60 shrink-0 bg-surface-panel shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bestMapImg}
                      alt={bestMap.map}
                      className="w-full h-full object-cover object-center opacity-85"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                  </div>
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-sm bg-primary/15 text-primary border border-primary/25 shrink-0">
                    <Flame className="size-3.5" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold">
                    MELHOR APROVEITAMENTO
                  </span>
                  <span className="text-xs font-bold text-foreground truncate block">
                    {bestMap.map.replace(/^de_/i, "")}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-primary shrink-0 tabular-nums">
                {bestMap.winrate.toFixed(0)}% WR
              </span>
            </div>
          ) : (
            <div className="p-3.5 text-[11px] text-muted-foreground/50 font-mono">Sem mapa destaque</div>
          )}

          {/* Pior Mapa */}
          {worstMap ? (
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {worstMapImg ? (
                  <div className="relative size-7 rounded-sm overflow-hidden border border-border/60 shrink-0 bg-surface-panel shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={worstMapImg}
                      alt={worstMap.map}
                      className="w-full h-full object-cover object-center opacity-85"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                  </div>
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-sm bg-status-critical/15 text-status-critical border border-status-critical/25 shrink-0">
                    <Compass className="size-3.5" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-status-critical font-bold">
                    MAPA VULNERÁVEL
                  </span>
                  <span className="text-xs font-bold text-foreground truncate block">
                    {worstMap.map.replace(/^de_/i, "")}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-status-critical shrink-0 tabular-nums">
                {worstMap.winrate.toFixed(0)}% WR
              </span>
            </div>
          ) : (
            <div className="p-3.5 text-[11px] text-muted-foreground/50 font-mono">Sem mapa crítico</div>
          )}
        </div>
      )}
    </div>
  );
}
