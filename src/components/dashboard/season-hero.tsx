"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, Crown, Flame, Compass } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MetricDisplay } from "@/components/ui/metric-display";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import {
  calculateLeaderDiff,
  formatLastSync,
  formatSeasonHeader,
  type OfficialTop3Entry,
} from "@/lib/season-podium";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn, cleanMapName } from "@/lib/utils";

export interface SeasonHeroProps {
  seasonLabel: string;
  seasonStatus?: string;
  seasonId?: string;
  totalMatches: number;
  top3?: OfficialTop3Entry[];
  bestPlayer?: { nickname: string; rating: number; avatarUrl?: string | null } | null;
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
  collectiveStats?: {
    eligibleMatches: number;
    eligibleWins: number;
    winrate: number;
  } | null;
  hottestPlayer: PlayerMomentumEntry | null;
  coldestPlayer?: PlayerMomentumEntry | null;
  bestMap: MapPerformanceEntry | null;
  worstMap: MapPerformanceEntry | null;
  lastSyncAt?: Date | string | null;
  action?: React.ReactNode;
}

function PlayerAvatar({
  avatarUrl,
  nickname,
  size = "size-8",
  className,
}: {
  avatarUrl?: string | null;
  nickname: string;
  size?: string;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className={cn("rounded-sm object-cover border border-border/80 shrink-0", size, className)}
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
        size,
        className
      )}
    >
      {initial}
    </div>
  );
}

export function SeasonHero({
  seasonLabel,
  seasonStatus = "ACTIVE",
  seasonId,
  totalMatches,
  top3 = [],
  communityWinrate,
  dominantMap,
  totalPlayers,
  advancedStats,
  collectiveStats,
  hottestPlayer,
  bestMap,
  worstMap,
  lastSyncAt,
  action,
}: SeasonHeroProps) {
  const { title, statusBadge } = formatSeasonHeader(seasonLabel, seasonStatus, seasonId);
  const syncText = formatLastSync(lastSyncAt);

  // Top 3 oficial
  const leader = top3[0] ?? null;
  const runnerUp = top3[1] ?? null;
  const thirdPlace = top3[2] ?? null;
  const otherRunners = [
    runnerUp ? { ...runnerUp, rank: 2 } : null,
    thirdPlace ? { ...thirdPlace, rank: 3 } : null,
  ].filter(Boolean) as Array<OfficialTop3Entry & { rank: number }>;

  // Métricas coletivas
  const effectiveWr = collectiveStats ? collectiveStats.winrate : communityWinrate;
  const collectiveContext = collectiveStats
    ? `${collectiveStats.eligibleWins} vitórias em ${collectiveStats.eligibleMatches} partidas elegíveis`
    : `${totalMatches} partidas analisadas`;

  // Miniaturas de mapas
  const dominantMapImg = dominantMap ? getCleanMapImage(dominantMap.name) : null;
  const bestMapImg = bestMap ? getCleanMapImage(bestMap.map) : null;
  const worstMapImg = worstMap ? getCleanMapImage(worstMap.map) : null;

  // Destino da classificação completa
  const rankingsHref = seasonId && seasonId !== "all" ? `/rankings?season=${seasonId}` : "/rankings";

  // Faixa inferior (máximo 3 itens úteis, sem repetições vazias)
  const bottomItems = [
    hottestPlayer
      ? {
          key: "hot",
          type: "player" as const,
          label: "EM ALTA",
          entity: hottestPlayer.player.nickname,
          avatarUrl: hottestPlayer.player.avatarUrl,
          id: hottestPlayer.player.id,
          metricLabel: "rating",
          metricValue: hottestPlayer.recentRating.toFixed(2),
          sample: "Últimas 5 partidas",
        }
      : null,
    bestMap
      ? {
          key: "best-map",
          type: "map" as const,
          label: "MELHOR APROVEITAMENTO",
          entity: cleanMapName(bestMap.map),
          img: bestMapImg,
          metricLabel: "aproveitamento",
          metricValue: `${bestMap.winrate.toFixed(0)}%`,
          sample: `${bestMap.matchesPlayed} partidas`,
        }
      : null,
    worstMap
      ? {
          key: "worst-map",
          type: "map" as const,
          label: "MENOR APROVEITAMENTO",
          entity: cleanMapName(worstMap.map),
          img: worstMapImg,
          metricLabel: "aproveitamento",
          metricValue: `${worstMap.winrate.toFixed(0)}%`,
          sample: `${worstMap.matchesPlayed} partidas`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="relative flex flex-col bg-surface-panel border border-border/70 rounded-sm overflow-hidden shadow-lg">
      {/* Linha tática superior */}
      <div className="h-[2px] w-full bg-gradient-to-r from-primary via-gold to-border/40" />

      {/* ─── 1. FAIXA SUPERIOR: Título do período + Status real + Timestamp de sync + Seletor ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 border-b border-border/40 bg-surface-deck/40">
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight truncate">
              {title}
            </h1>
            {statusBadge && (
              <TacticalBadge
                label={statusBadge.label}
                variant={statusBadge.variant}
                size="xs"
              />
            )}
          </div>
          {syncText && (
            <span className="text-xs font-mono text-muted-foreground/90 mt-0.5">
              {syncText}
            </span>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* ─── 2. CONTEÚDO PRINCIPAL: Pódio Oficial (40%) + Indicadores do Grupo (60%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
        
        {/* PÓDIO TOP 3 OFICIAL (lg:col-span-5 ~40%) */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between gap-5 bg-gradient-to-b from-surface-elevated/20 via-transparent to-transparent">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-gold/90 flex items-center gap-1.5">
                <Crown className="size-3.5 text-gold shrink-0" />
                Classificação Oficial
              </span>
              <TacticalBadge label="MODELO 3.5" variant="gold" size="xs" />
            </div>
            <p className="text-xs text-muted-foreground/90 font-medium">
              Critério oficial da temporada · Mínimo de 10 partidas
            </p>
          </div>

          {leader && leader.player ? (
            <div className="flex flex-col gap-3">
              {/* 1º Lugar em Destaque */}
              <div className="p-4 rounded-xs border border-gold/30 bg-gradient-to-b from-gold/[0.08] via-surface-panel to-surface-panel/90 shadow-xs relative">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                      <Trophy className="size-3 text-gold" />
                      1º lugar
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/90 font-semibold">
                    {leader.matchesPlayed} partidas
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <PlayerAvatar
                    avatarUrl={leader.player.avatarUrl}
                    nickname={leader.player.nickname}
                    size="size-12 sm:size-14"
                    className="border-2 border-gold/50"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <Link
                      href={`/players/${leader.player.id}`}
                      className="text-base sm:text-lg font-black text-foreground hover:text-primary transition-micro truncate block"
                    >
                      {leader.player.nickname}
                    </Link>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-mono font-black text-gold tabular-nums leading-none">
                        <AnimatedNumber value={leader.value} decimals={3} />
                      </span>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gold/90">
                        pontos · Season Score
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2º e 3º Lugares em Linhas Compactas */}
              {otherRunners.length > 0 && (
                <div className="flex flex-col gap-2">
                  {otherRunners.map((runner) => {
                    if (!runner.player) return null;
                    const diffResult = calculateLeaderDiff(leader.rawScore, runner.rawScore);

                    return (
                      <div
                        key={runner.player.id}
                        className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xs border border-border/50 bg-surface-deck/60 hover:border-border/80 transition-micro"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "text-[11px] font-mono font-bold shrink-0 w-5 text-center",
                              runner.rank === 2 ? "text-muted-foreground/90" : "text-amber-500/80"
                            )}
                          >
                            #{runner.rank}
                          </span>
                          <PlayerAvatar
                            avatarUrl={runner.player.avatarUrl}
                            nickname={runner.player.nickname}
                            size="size-8"
                          />
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/players/${runner.player.id}`}
                              className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-micro truncate block"
                            >
                              {runner.player.nickname}
                            </Link>
                            <span className="text-xs font-mono text-muted-foreground/90 font-medium">
                              {runner.matchesPlayed} partidas
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 text-right">
                          <span className="font-mono text-xs sm:text-sm font-bold text-foreground/90 tabular-nums">
                            {typeof runner.value === "number" && !isNaN(runner.value)
                              ? runner.value.toFixed(3)
                              : "—"}
                          </span>
                          {diffResult.formattedDiff ? (
                            <span
                              className="text-[11px] sm:text-xs font-mono text-muted-foreground/90 font-medium truncate max-w-[140px] sm:max-w-none"
                              title={diffResult.formattedDiff}
                            >
                              {diffResult.formattedDiff}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xs border border-border/40 bg-surface-deck/40 flex flex-col items-center justify-center text-center gap-2 my-auto">
              <Trophy className="size-8 text-muted-foreground/40" />
              <span className="text-sm font-bold text-foreground/80">
                Classificação ainda indisponível
              </span>
              <p className="text-xs text-muted-foreground/85 max-w-xs font-mono">
                São necessárias pelo menos 10 partidas válidas na temporada para obter classificação oficial.
              </p>
            </div>
          )}

          {/* Rodapé com link para tabela completa */}
          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-xs font-mono">
            <span className="text-muted-foreground/85 font-medium">
              {totalPlayers} jogadores monitorados
            </span>
            <Link
              href={rankingsHref}
              className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider transition-micro flex items-center gap-1"
            >
              Ver classificação completa →
            </Link>
          </div>
        </div>

        {/* INDICADORES DO GRUPO (lg:col-span-7 ~60%) */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Principais */}
            <MetricDisplay
              label="PARTIDAS"
              value={totalMatches}
              context={`${advancedStats.totalRounds} rounds jogados`}
              size="md"
              accent="orange"
            />
            <MetricDisplay
              label="APROVEITAMENTO"
              value={`${effectiveWr}%`}
              context={collectiveContext}
              reaction={effectiveWr >= 55 ? "positive" : effectiveWr < 45 ? "negative" : "neutral"}
              size="md"
            />
            <MetricDisplay
              label="K/D COLETIVO"
              value={<AnimatedNumber value={advancedStats.avgKd} decimals={2} />}
              context="Relação de eliminações"
              reaction={advancedStats.avgKd >= 1.05 ? "positive" : advancedStats.avgKd < 0.95 ? "negative" : "neutral"}
              size="md"
            />

            {/* Secundários */}
            <MetricDisplay
              label="ELIMINAÇÕES"
              value={<AnimatedNumber value={advancedStats.totalKills} decimals={0} />}
              context={`${advancedStats.avgAdr.toFixed(0)} ADR médio coletivo`}
              size="md"
              accent="muted"
            />
            <MetricDisplay
              label="HEADSHOTS"
              value={<AnimatedNumber value={advancedStats.avgHsPercent} decimals={0} suffix="%" />}
              context="Proporção de HS"
              size="md"
              accent="cyan"
            />

            {/* Mapa mais jogado */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-gold/90 truncate">
                MAPA MAIS JOGADO
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                {dominantMapImg && (
                  <div className="relative size-8 sm:size-9 rounded-sm overflow-hidden border border-border/60 shrink-0 bg-surface-panel shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dominantMapImg}
                      alt={dominantMap ? cleanMapName(dominantMap.name) : "Mapa"}
                      className="w-full h-full object-cover object-center opacity-85"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate block leading-tight">
                    {dominantMap ? cleanMapName(dominantMap.name) : "—"}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground/80 truncate">
                {dominantMap ? `${dominantMap.percentage}% das partidas` : "Distribuição neutra"}
              </span>
            </div>
          </div>

          {/* Faixa sutil de métricas globais */}
          <div className="border-t border-border/30 pt-3 text-xs text-muted-foreground/85 font-mono flex items-center justify-between">
            <span>Métricas Globais da Temporada</span>
            <span className="text-muted-foreground/95 font-semibold font-mono">
              {totalMatches} partidas registradas
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. FAIXA INFERIOR (Máximo 3 cards úteis: Em alta, Melhor aproveitamento, Menor aproveitamento) ─── */}
      {bottomItems.length > 0 && (
        <div
          className={cn(
            "grid divide-y sm:divide-y-0 sm:divide-x divide-border/30 border-t border-border/40 bg-surface-deck/70",
            bottomItems.length === 1 && "grid-cols-1",
            bottomItems.length === 2 && "grid-cols-1 sm:grid-cols-2",
            bottomItems.length >= 3 && "grid-cols-1 sm:grid-cols-3"
          )}
        >
          {bottomItems.map((item) => {
            if (item.type === "player") {
              return (
                <div key={item.key} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar
                      nickname={item.entity}
                      avatarUrl={item.avatarUrl}
                      size="size-7"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-status-good font-bold">
                        {item.label}
                      </span>
                      <Link
                        href={`/players/${item.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                      >
                        {item.entity}
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="font-mono text-xs font-bold text-status-good tabular-nums">
                      {item.metricValue} <span className="text-[10px] font-medium text-muted-foreground/85">rating</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground/85 font-medium">
                      {item.sample}
                    </span>
                  </div>
                </div>
              );
            }

            const isBest = item.label.includes("MELHOR");
            const colorClass = isBest ? "text-primary" : "text-status-critical";

            return (
              <div key={item.key} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.img ? (
                    <div className="relative size-7 rounded-sm overflow-hidden border border-border/60 shrink-0 bg-surface-panel shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={item.entity}
                        className="w-full h-full object-cover object-center opacity-85"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-sm shrink-0",
                        isBest
                          ? "bg-primary/15 text-primary border border-primary/25"
                          : "bg-status-critical/15 text-status-critical border border-status-critical/25"
                      )}
                    >
                      {isBest ? <Flame className="size-3.5" /> : <Compass className="size-3.5" />}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-[9px] font-mono uppercase tracking-wider font-bold", colorClass)}>
                      {item.label}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate block uppercase">
                      {item.entity}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 text-right">
                  <span className={cn("font-mono text-xs font-bold tabular-nums", colorClass)}>
                    {item.metricValue}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground/85 font-medium">
                    {item.sample}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
