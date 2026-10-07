"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Flame, Snowflake, ArrowRight, BarChart3, Activity } from "lucide-react";
import { trendNarratives } from "@/lib/narrator/templates";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import type { SeasonComparisonEntry, StreakEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

export interface TendenciasDaTemporadaProps {
  topGainers: SeasonComparisonEntry[];
  topDecliners: SeasonComparisonEntry[];
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
  mapWinrates: MapPerformanceEntry[];
}

// ─── Card padrão de tendência tática ──────────────────────────────────────────
function TendenciaCard({
  icon: Icon,
  label,
  badge,
  badgeVariant = "neutral",
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: string;
  badgeVariant?: "good" | "warning" | "critical" | "gold" | "info" | "neutral" | "primary";
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 p-4 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-3.5 text-muted-foreground/80 shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground truncate">
            {label}
          </span>
        </div>
        <TacticalBadge label={badge} variant={badgeVariant} size="xs" />
      </div>

      {description && (
        <p className="text-[10px] text-muted-foreground/60 font-sans -mt-1 leading-snug">
          {description}
        </p>
      )}

      <div className="flex flex-col gap-2.5 pt-1">
        {children}
      </div>
    </div>
  );
}

// ─── Maior Evolução ───────────────────────────────────────────────────────────
function EvolucaoCards({ gainers }: { gainers: SeasonComparisonEntry[] }) {
  const top = gainers.slice(0, 3);
  if (top.length === 0) return null;
  const [featured, ...rest] = top;

  return (
    <TendenciaCard
      icon={TrendingUp}
      label="Evolução Recente"
      badge="EM ALTA"
      badgeVariant="good"
      description="Últimas 10 partidas vs. média da temporada"
    >
      {/* Featured Player */}
      <div className="flex items-center gap-3 p-2.5 bg-surface-deck rounded-xs border border-status-good/20">
        <PlayerAvatar
          nickname={featured.player.nickname}
          avatarUrl={featured.player.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${featured.player.id}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
          >
            {featured.player.nickname}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono tabular-nums">
            <span className="text-muted-foreground/60">{featured.season.rating.toFixed(2)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground/40 shrink-0" />
            <span className="font-bold text-status-good">{featured.recent.rating.toFixed(2)}</span>
            <DeltaIndicator value={featured.diff.rating.toFixed(2)} size="xs" />
          </div>
        </div>
      </div>

      {/* Other Gainers */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          {rest.map((e) => (
            <div key={e.player.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <PlayerAvatar
                  nickname={e.player.nickname}
                  avatarUrl={e.player.avatarUrl}
                  size="sm"
                />
                <Link
                  href={`/players/${e.player.id}`}
                  className="font-medium text-muted-foreground hover:text-foreground transition-micro truncate"
                >
                  {e.player.nickname}
                </Link>
              </div>
              <span className="font-mono font-bold text-status-good tabular-nums shrink-0">
                +{e.diff.rating.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </TendenciaCard>
  );
}

// ─── Queda Recente ────────────────────────────────────────────────────────────
function QuedaCards({ decliners }: { decliners: SeasonComparisonEntry[] }) {
  const top = decliners.slice(0, 3);
  if (top.length === 0) return null;
  const [featured, ...rest] = top;

  return (
    <TendenciaCard
      icon={TrendingDown}
      label="Oscilação Recente"
      badge="ATENÇÃO"
      badgeVariant="warning"
      description="Últimas 10 partidas vs. média da temporada"
    >
      <div className="flex items-center gap-3 p-2.5 bg-surface-deck rounded-xs border border-status-warning/20">
        <PlayerAvatar
          nickname={featured.player.nickname}
          avatarUrl={featured.player.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${featured.player.id}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
          >
            {featured.player.nickname}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono tabular-nums">
            <span className="text-muted-foreground/60">{featured.season.rating.toFixed(2)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground/40 shrink-0" />
            <span className="font-bold text-status-warning">{featured.recent.rating.toFixed(2)}</span>
            <DeltaIndicator value={featured.diff.rating.toFixed(2)} size="xs" />
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          {rest.map((e) => (
            <div key={e.player.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <PlayerAvatar
                  nickname={e.player.nickname}
                  avatarUrl={e.player.avatarUrl}
                  size="sm"
                />
                <Link
                  href={`/players/${e.player.id}`}
                  className="font-medium text-muted-foreground hover:text-foreground transition-micro truncate"
                >
                  {e.player.nickname}
                </Link>
              </div>
              <span className="font-mono font-bold text-status-warning tabular-nums shrink-0">
                {e.diff.rating.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </TendenciaCard>
  );
}

// ─── Sequência Ativa ──────────────────────────────────────────────────────────
function SequenciaCard({
  hotStreaks,
  coldStreaks,
}: {
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
}) {
  const hot = hotStreaks[0] ?? null;
  const cold = coldStreaks[0] ?? null;
  if (!hot && !cold) return null;

  return (
    <TendenciaCard
      icon={Activity}
      label="Sequências Ativas"
      badge="STREAKS"
      badgeVariant="gold"
      description="Desempenho consecutivo no grupo"
    >
      <div className="flex flex-col gap-2.5">
        {hot && (
          <div className="flex items-center justify-between gap-2.5 p-2 bg-surface-deck rounded-xs border border-status-good/15">
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="size-3.5 text-status-good shrink-0" />
              <PlayerAvatar
                nickname={hot.player.nickname}
                avatarUrl={hot.player.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <Link
                  href={`/players/${hot.player.id}`}
                  className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
                >
                  {hot.player.nickname}
                </Link>
                <span className="text-[10px] font-mono text-status-good font-bold block">
                  {hot.streak} vitórias consecutivas
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-status-good tabular-nums shrink-0">
              <AnimatedNumber value={hot.recentRating} decimals={2} />
            </span>
          </div>
        )}

        {cold && (
          <div className="flex items-center justify-between gap-2.5 p-2 bg-surface-deck rounded-xs border border-status-critical/15">
            <div className="flex items-center gap-2 min-w-0">
              <Snowflake className="size-3.5 text-status-critical shrink-0" />
              <PlayerAvatar
                nickname={cold.player.nickname}
                avatarUrl={cold.player.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <Link
                  href={`/players/${cold.player.id}`}
                  className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
                >
                  {cold.player.nickname}
                </Link>
                <span className="text-[10px] font-mono text-status-critical font-bold block">
                  {cold.streak} jogos sem vencer
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-status-critical tabular-nums shrink-0">
              {cold.adrChangePercent > 0 ? "+" : ""}{cold.adrChangePercent}% ADR
            </span>
          </div>
        )}
      </div>
    </TendenciaCard>
  );
}

// ─── Mapa em Destaque ─────────────────────────────────────────────────────────
function MapaTendenciaCard({ mapWinrates }: { mapWinrates: MapPerformanceEntry[] }) {
  if (mapWinrates.length < 2) return null;
  const sorted = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <TendenciaCard
      icon={BarChart3}
      label="Balanço de Mapas"
      badge="TAXA DE VITÓRIA"
      badgeVariant="info"
      description="Extremos coletivos da temporada"
    >
      <div className="flex flex-col gap-2">
        <div className="p-2 bg-surface-deck rounded-xs border border-status-good/20 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-good block">
              MAIOR WINRATE
            </span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {best.map.replace(/^de_/i, "")}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-sm font-black text-status-good tabular-nums block">
              <AnimatedNumber value={best.winrate} decimals={0} suffix="%" />
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/60 block">
              {best.matchesPlayed} partidas
            </span>
          </div>
        </div>

        <div className="p-2 bg-surface-deck rounded-xs border border-status-critical/20 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-critical block">
              MENOR WINRATE
            </span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {worst.map.replace(/^de_/i, "")}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-sm font-black text-status-critical tabular-nums block">
              <AnimatedNumber value={worst.winrate} decimals={0} suffix="%" />
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/60 block">
              {worst.matchesPlayed} partidas
            </span>
          </div>
        </div>
      </div>
    </TendenciaCard>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function TendenciasDaTemporada({
  topGainers,
  topDecliners,
  hotStreaks,
  coldStreaks,
  mapWinrates,
}: TendenciasDaTemporadaProps) {
  const hasContent =
    topGainers.length > 0 ||
    topDecliners.length > 0 ||
    hotStreaks.length > 0 ||
    coldStreaks.length > 0;
  if (!hasContent) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <EvolucaoCards gainers={topGainers} />
      <QuedaCards decliners={topDecliners} />
      <SequenciaCard hotStreaks={hotStreaks} coldStreaks={coldStreaks} />
      <MapaTendenciaCard mapWinrates={mapWinrates} />
    </div>
  );
}
