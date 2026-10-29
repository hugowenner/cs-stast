"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Trophy, Zap, Compass, Crosshair, Target, Shield, Flame, Activity, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalTabs } from "@/components/ui/tactical-tabs";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type { PowerRankingEntry, DecisivePlayerEntry, PlayerArchetype } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

export interface MuralCompetitivoProps {
  powerRanking: PowerRankingEntry[];
  decisive: DecisivePlayerEntry[];
  archetypes: PlayerArchetype[];
  isHistoricalSnapshot?: boolean;
  seasonName?: string;
}

type MetricKey = "rating" | "adr" | "hs" | "kd" | "winrate";

const METRICS: { key: MetricKey; label: string; suffix: string; decimals: number; description: string }[] = [
  { key: "rating",  label: "Rating 2.0", suffix: "",  decimals: 2, description: "Desempenho geral ponderado por round" },
  { key: "adr",     label: "ADR",        suffix: "",  decimals: 0, description: "Dano médio causado por round" },
  { key: "hs",      label: "HS%",        suffix: "%", decimals: 0, description: "Percentual de abates com tiro na cabeça" },
  { key: "kd",      label: "K/D",        suffix: "",  decimals: 2, description: "Razão entre total de abates e mortes" },
  { key: "winrate", label: "Winrate",    suffix: "%", decimals: 0, description: "Percentual de vitórias nas partidas elegíveis" },
];

function getRawValue(entry: PowerRankingEntry, key: MetricKey): number {
  switch (key) {
    case "rating":  return entry.rawRating ?? entry.rating;
    case "adr":     return entry.rawAdr ?? entry.adr;
    case "hs":      return entry.rawHsPercent ?? entry.hsPercent;
    case "kd":      return entry.rawKd ?? entry.kd;
    case "winrate": return entry.rawWinrate ?? entry.winrate;
  }
}

function getDisplayValue(entry: PowerRankingEntry, key: MetricKey): number {
  switch (key) {
    case "rating":  return entry.rating;
    case "adr":     return entry.adr;
    case "hs":      return entry.hsPercent;
    case "kd":      return entry.kd;
    case "winrate": return entry.winrate;
  }
}

function compareLeaderEntries(a: PowerRankingEntry, b: PowerRankingEntry, key: MetricKey): number {
  const valA = getRawValue(a, key);
  const valB = getRawValue(b, key);
  const diff = valB - valA;
  if (Math.abs(diff) > 1e-9) return diff;
  if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
  const nickDiff = a.player.nickname.localeCompare(b.player.nickname);
  if (nickDiff !== 0) return nickDiff;
  return a.player.id.localeCompare(b.player.id);
}

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  entry:      Flame,
  clutch:     Shield,
  headshot:   Crosshair,
  consistent: Target,
  tactician:  Compass,
  impact:     Zap,
  support:    Activity,
};

// ─── Tab 1: Líderes por Métrica ──────────────────────────────────────────────
function LideresTab({
  powerRanking,
  isHistoricalSnapshot,
}: {
  powerRanking: PowerRankingEntry[];
  isHistoricalSnapshot?: boolean;
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("rating");
  const meta = METRICS.find((m) => m.key === activeMetric)!;

  // Filtragem e ordenação determinística com base na precisão integral
  const { eligibleLeaders, initialSample } = useMemo(() => {
    // Apenas jogadores com partidas válidas na métrica
    const activeCandidates = powerRanking.filter((p) => p.matchCount > 0);

    const eligible = activeCandidates
      .filter((p) => p.matchCount >= 10)
      .sort((a, b) => compareLeaderEntries(a, b, activeMetric))
      .slice(0, 5);

    const initial = activeCandidates
      .filter((p) => p.matchCount >= 5 && p.matchCount < 10)
      .sort((a, b) => compareLeaderEntries(a, b, activeMetric));

    return { eligibleLeaders: eligible, initialSample: initial };
  }, [powerRanking, activeMetric]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header explicativo e disclaimers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-surface-deck/60 border border-border/40 rounded-xs">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/90">
          <Info className="size-3.5 text-primary shrink-0" />
          <span>
            Destaques por métrica da temporada · mínimo de 10 partidas válidas · <strong className="text-foreground">Painel de performance (não oficial)</strong>
          </span>
        </div>
        {isHistoricalSnapshot && (
          <TacticalBadge variant="neutral" size="xs" className="self-start sm:self-auto">
            Registro Histórico
          </TacticalBadge>
        )}
      </div>

      {/* Metric Selector Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Seletor de métricas">
        {METRICS.map((m) => {
          const isActive = activeMetric === m.key;
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={isActive}
              aria-label={`Visualizar líderes de ${m.label}`}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-xs border transition-micro cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface-deck text-muted-foreground/80 border-border/50 hover:border-border hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Metric description hint */}
      <p className="text-[11px] font-mono text-muted-foreground/70 -mt-1">
        Critério: {meta.description}. Ordenação por valor real com desempate por partidas e nickname.
      </p>

      {/* Leaderboard Rows (Top 5 com mínimo de 10 partidas) */}
      <div className="flex flex-col border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
        <div className="py-2 px-3 bg-surface-deck/80 border-b border-border/30 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">
            Top 5 — {meta.label} (Amostra consolidada ≥ 10 partidas)
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60">
            {eligibleLeaders.length} {eligibleLeaders.length === 1 ? "elegível" : "elegíveis"}
          </span>
        </div>

        {eligibleLeaders.length === 0 ? (
          <div className="py-6 px-4 text-center">
            <p className="text-xs font-mono text-muted-foreground/80">
              Nenhum jogador atingiu a amostra mínima de 10 partidas válidas nesta temporada para compor os destaques.
            </p>
            <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
              As amostras em consolidação disponíveis estão listadas abaixo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/30">
            {eligibleLeaders.map((entry, idx) => {
              const val = getDisplayValue(entry, activeMetric);
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop3 = rank <= 3;

              return (
                <div
                  key={entry.player.id}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 hover:bg-surface-elevated/30 transition-micro group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "font-mono text-xs font-black w-6 text-center shrink-0 tabular-nums",
                        isTop1
                          ? "text-gold"
                          : isTop3
                            ? "text-foreground font-bold"
                            : "text-muted-foreground/40"
                      )}
                    >
                      #{rank}
                    </span>
                    <PlayerAvatar
                      nickname={entry.player.nickname}
                      avatarUrl={entry.player.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex items-baseline gap-2">
                      <Link
                        href={`/players/${entry.player.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate"
                      >
                        {entry.player.nickname}
                      </Link>
                      <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap">
                        {entry.matchCount} partidas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 text-right shrink-0">
                    <span
                      className={cn(
                        "font-mono text-sm font-bold tabular-nums",
                        isTop1 ? "text-gold font-black" : "text-foreground"
                      )}
                    >
                      <AnimatedNumber value={val} decimals={meta.decimals} suffix={meta.suffix} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Amostra inicial (5 a 9 partidas) — Seção separada, sem medalha ou posição numerada */}
      {initialSample.length > 0 && (
        <div className="flex flex-col border border-border/30 rounded-xs overflow-hidden bg-surface-deck/20">
          <div className="py-2 px-3 bg-surface-deck/50 border-b border-border/20 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
              Amostra inicial (5 a 9 partidas) · Sem classificação oficial
            </span>
            <TacticalBadge variant="neutral" size="xs">
              Em consolidação
            </TacticalBadge>
          </div>

          <div className="flex flex-col divide-y divide-border/20">
            {initialSample.map((entry) => {
              const val = getDisplayValue(entry, activeMetric);
              return (
                <div
                  key={entry.player.id}
                  className="flex items-center justify-between gap-3 py-2 px-3 hover:bg-surface-elevated/20 transition-micro"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[10px] text-muted-foreground/40 w-6 text-center shrink-0">
                      —
                    </span>
                    <PlayerAvatar
                      nickname={entry.player.nickname}
                      avatarUrl={entry.player.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex items-baseline gap-2">
                      <Link
                        href={`/players/${entry.player.id}`}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-micro truncate"
                      >
                        {entry.player.nickname}
                      </Link>
                      <span className="text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap">
                        {entry.matchCount} partidas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 text-right shrink-0">
                    <span className="font-mono text-xs font-semibold text-muted-foreground/90 tabular-nums">
                      <AnimatedNumber value={val} decimals={meta.decimals} suffix={meta.suffix} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Impacto & Duelos ──────────────────────────────────────────────────
function ImpactoTab({
  decisive,
  isHistoricalSnapshot,
}: {
  decisive: DecisivePlayerEntry[];
  isHistoricalSnapshot?: boolean;
}) {
  if (decisive.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Dados insuficientes para análise de impacto na temporada.
      </p>
    );
  }

  // Detecção honesta da disponibilidade de telemetria no conjunto de dados recebido
  const hasOpeningDeathsTelemetry =
    decisive[0]?.hasOpeningDeathsTelemetry ?? decisive.some((d) => d.entryDeaths > 0);

  const hasTradeTelemetry =
    decisive[0]?.hasTradeTelemetry ?? decisive.some((d) => d.tradeKills > 0 || (d.tradedDeaths ?? 0) > 0);

  const hasClutchTelemetry =
    decisive[0]?.hasClutchTelemetry ?? decisive.some((d) => d.clutchWins > 0);

  // Impacto Total depende de trades e clutches — se ambos faltarem, o cálculo fica suspenso
  const isImpactTotalSuspended = !hasTradeTelemetry && !hasClutchTelemetry;

  // Filtragem de candidatos elegíveis (mínimo de 10 partidas para posições numeradas)
  const eligibleCandidates = decisive.filter((d) => (d.matchCount ?? 0) >= 10);
  const initialCandidates = decisive.filter((d) => (d.matchCount ?? 0) >= 5 && (d.matchCount ?? 0) < 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Header explicativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-surface-deck/60 border border-border/40 rounded-xs">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/90">
          <Info className="size-3.5 text-primary shrink-0" />
          <span>
            Estatísticas individuais de abertura e impacto · mínimo de 10 partidas válidas para líderes numerados (#1..#3)
          </span>
        </div>
        {isHistoricalSnapshot && (
          <TacticalBadge variant="neutral" size="xs" className="self-start sm:self-auto">
            Registro Histórico
          </TacticalBadge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1. OPENING KILLS (Disponível - Cobertura 100% via API da GC) */}
        {(() => {
          const sorted = [...eligibleCandidates].sort((a, b) => {
            const diff = b.entryKills - a.entryKills;
            if (diff !== 0) return diff;
            return (b.matchCount ?? 0) - (a.matchCount ?? 0) || a.player.nickname.localeCompare(b.player.nickname);
          });
          const top = sorted.slice(0, 3);
          const initialTop = [...initialCandidates]
            .sort((a, b) => b.entryKills - a.entryKills)
            .slice(0, 1)[0];

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    OPENING KILLS
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Total de abates em abertura de round
                </span>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.length === 0 ? (
                  <p className="text-[11px] font-mono text-muted-foreground/60 py-2">
                    Sem jogadores com 10+ partidas.
                  </p>
                ) : (
                  top.map((d, idx) => (
                    <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "font-mono text-[10px] font-black w-3 text-center",
                            idx === 0 ? "text-gold" : "text-muted-foreground/50"
                          )}
                        >
                          #{idx + 1}
                        </span>
                        <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                        <Link
                          href={`/players/${d.player.id}`}
                          className="font-medium text-foreground hover:text-primary transition-micro truncate"
                        >
                          {d.player.nickname}
                        </Link>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-foreground tabular-nums block">
                          {d.entryKills} abates
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50 block">
                          {d.matchCount} partidas
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {initialTop && (
                  <div className="mt-1 pt-1.5 border-t border-border/20 flex items-center justify-between text-[11px] font-mono text-muted-foreground/70">
                    <span className="truncate">Amostra inicial: {initialTop.player.nickname}</span>
                    <span className="tabular-nums font-semibold shrink-0">
                      {initialTop.entryKills} ({initialTop.matchCount}p)
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 2. OPENING DUELS WR% (Condicional a telemetria de mortes em abertura) */}
        {(() => {
          if (!hasOpeningDeathsTelemetry) {
            return (
              <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs opacity-80">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                      OPENING DUELS WR%
                    </span>
                    <TacticalBadge variant="neutral" size="xs">
                      Dados indisponíveis
                    </TacticalBadge>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                    Taxa de vitória no 1º duelo de abertura
                  </span>
                </div>
                <div className="border-t border-border/30 pt-3 pb-1">
                  <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
                    Requer registro de mortes em abertura de round (ausente na súmula da GC nesta temporada).
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                    Disponível apenas em temporadas com parsing de demos.
                  </p>
                </div>
              </div>
            );
          }

          const sorted = [...eligibleCandidates]
            .filter((d) => (d.totalOpeningDuels ?? (d.entryKills + d.entryDeaths)) >= 5)
            .sort((a, b) => {
              const diff = (b.rawOpeningWinrate ?? b.openingWinrate) - (a.rawOpeningWinrate ?? a.openingWinrate);
              if (Math.abs(diff) > 1e-9) return diff;
              return (b.totalOpeningDuels ?? 0) - (a.totalOpeningDuels ?? 0);
            });
          const top = sorted.slice(0, 3);

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    OPENING DUELS WR%
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Taxa de vitória no 1º duelo de abertura
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.map((d, idx) => (
                  <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("font-mono text-[10px] font-black w-3 text-center", idx === 0 ? "text-gold" : "text-muted-foreground/50")}>
                        #{idx + 1}
                      </span>
                      <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                      <Link href={`/players/${d.player.id}`} className="font-medium text-foreground hover:text-primary transition-micro truncate">
                        {d.player.nickname}
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-foreground tabular-nums block">
                        {d.openingWinrate}%
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/50 block">
                        {d.entryKills}/{d.totalOpeningDuels ?? (d.entryKills + d.entryDeaths)} duelos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 3. IMPACTO TOTAL % (Suspenso quando faltam trades e clutches) */}
        {(() => {
          if (isImpactTotalSuspended) {
            return (
              <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs opacity-80">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                      IMPACTO TOTAL %
                    </span>
                    <TacticalBadge variant="warning" size="xs">
                      Cálculo suspenso
                    </TacticalBadge>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                    Participação decisiva em rounds
                  </span>
                </div>
                <div className="border-t border-border/30 pt-3 pb-1">
                  <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
                    Fórmula depende de eventos de trade e clutch, ausentes na súmula desta temporada.
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                    Cálculo preservado para temporadas com telemetria completa.
                  </p>
                </div>
              </div>
            );
          }

          const sorted = [...eligibleCandidates].sort((a, b) => {
            const diff = (b.rawImpactPercent ?? b.impactPercent) - (a.rawImpactPercent ?? a.impactPercent);
            if (Math.abs(diff) > 1e-9) return diff;
            return (b.matchCount ?? 0) - (a.matchCount ?? 0);
          });
          const top = sorted.slice(0, 3);

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    IMPACTO TOTAL %
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Aberturas + trades + clutches
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.map((d, idx) => (
                  <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("font-mono text-[10px] font-black w-3 text-center", idx === 0 ? "text-gold" : "text-muted-foreground/50")}>
                        #{idx + 1}
                      </span>
                      <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                      <Link href={`/players/${d.player.id}`} className="font-medium text-foreground hover:text-primary transition-micro truncate">
                        {d.player.nickname}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
                      {d.impactPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 4. EFICIÊNCIA EM TRADE (Condicional a telemetria de trocas) */}
        {(() => {
          if (!hasTradeTelemetry) {
            return (
              <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs opacity-80">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                      EFICIÊNCIA EM TRADE
                    </span>
                    <TacticalBadge variant="neutral" size="xs">
                      Dados indisponíveis
                    </TacticalBadge>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                    Conversão de mortes em re-trade aliado
                  </span>
                </div>
                <div className="border-t border-border/30 pt-3 pb-1">
                  <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
                    Telemetria de trocas de abates ausente na súmula desta temporada.
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                    Requer parsing detalhado de demos para apuração.
                  </p>
                </div>
              </div>
            );
          }

          const sorted = [...eligibleCandidates].sort((a, b) => {
            const diff = (b.rawTradeEfficiency ?? b.tradeEfficiency) - (a.rawTradeEfficiency ?? a.tradeEfficiency);
            if (Math.abs(diff) > 1e-9) return diff;
            return (b.matchCount ?? 0) - (a.matchCount ?? 0);
          });
          const top = sorted.slice(0, 3);

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    EFICIÊNCIA EM TRADE
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Mortes de aliados vingadas
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.map((d, idx) => (
                  <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("font-mono text-[10px] font-black w-3 text-center", idx === 0 ? "text-gold" : "text-muted-foreground/50")}>
                        #{idx + 1}
                      </span>
                      <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                      <Link href={`/players/${d.player.id}`} className="font-medium text-foreground hover:text-primary transition-micro truncate">
                        {d.player.nickname}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
                      {d.tradeEfficiency}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 5. TRADES CONCRETIZADOS (Condicional a telemetria de trocas) */}
        {(() => {
          if (!hasTradeTelemetry) {
            return (
              <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs opacity-80">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                      TRADES CONCRETIZADOS
                    </span>
                    <TacticalBadge variant="neutral" size="xs">
                      Dados indisponíveis
                    </TacticalBadge>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                    Abates em resposta rápida de equipe
                  </span>
                </div>
                <div className="border-t border-border/30 pt-3 pb-1">
                  <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
                    Telemetria de trocas não registrada na súmula desta temporada.
                  </p>
                </div>
              </div>
            );
          }

          const sorted = [...eligibleCandidates].sort((a, b) => b.tradeKills - a.tradeKills);
          const top = sorted.slice(0, 3);

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    TRADES CONCRETIZADOS
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Kills em resposta rápida
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.map((d, idx) => (
                  <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("font-mono text-[10px] font-black w-3 text-center", idx === 0 ? "text-gold" : "text-muted-foreground/50")}>
                        #{idx + 1}
                      </span>
                      <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                      <Link href={`/players/${d.player.id}`} className="font-medium text-foreground hover:text-primary transition-micro truncate">
                        {d.player.nickname}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
                      {d.tradeKills}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 6. CLUTCHES GANHOS (Condicional a telemetria de clutches) */}
        {(() => {
          if (!hasClutchTelemetry) {
            return (
              <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs opacity-80">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                      CLUTCHES GANHOS
                    </span>
                    <TacticalBadge variant="neutral" size="xs">
                      Dados indisponíveis
                    </TacticalBadge>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                    Rounds 1vX vencidos
                  </span>
                </div>
                <div className="border-t border-border/30 pt-3 pb-1">
                  <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
                    Telemetria de situações 1vX não registrada na súmula desta temporada.
                  </p>
                </div>
              </div>
            );
          }

          const sorted = [...eligibleCandidates].sort((a, b) => b.clutchWins - a.clutchWins);
          const top = sorted.slice(0, 3);

          return (
            <div className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    CLUTCHES GANHOS
                  </span>
                  <TacticalBadge variant="good" size="xs">
                    Disponível
                  </TacticalBadge>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                  Rounds 1vX vencidos
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/30 pt-2">
                {top.map((d, idx) => (
                  <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("font-mono text-[10px] font-black w-3 text-center", idx === 0 ? "text-gold" : "text-muted-foreground/50")}>
                        #{idx + 1}
                      </span>
                      <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                      <Link href={`/players/${d.player.id}`} className="font-medium text-foreground hover:text-primary transition-micro truncate">
                        {d.player.nickname}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
                      {d.clutchWins}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Tab 3: Perfis & Arquétipos ───────────────────────────────────────────────
function PerfisTab({
  archetypes,
  isHistoricalSnapshot,
}: {
  archetypes: PlayerArchetype[];
  isHistoricalSnapshot?: boolean;
}) {
  if (archetypes.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Perfis competitivos ainda não computados para esta temporada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header explicativo com disclaimer conceitual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-surface-deck/60 border border-border/40 rounded-xs">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/90">
          <Info className="size-3.5 text-primary shrink-0" />
          <span>
            Distribuição estatística do período com base no percentil relativo dos jogadores · <strong className="text-foreground">Não representa função tática fixa in-game.</strong>
          </span>
        </div>
        {isHistoricalSnapshot && (
          <TacticalBadge variant="neutral" size="xs" className="self-start sm:self-auto">
            Registro Histórico
          </TacticalBadge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {archetypes.map((a) => {
          const isForming = Boolean(a.isForming || (a.matchCount ?? 0) < 10);
          const isDataUnavailable = Boolean(a.dataUnavailable);

          const IconComponent = isForming ? Compass : (ARCHETYPE_ICONS[a.archetype] ?? Crosshair);

          return (
            <div
              key={a.player.id}
              className="flex items-center justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs hover:border-border/80 transition-micro"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xs shrink-0 border",
                    isForming
                      ? "bg-muted/10 border-border/60 text-muted-foreground"
                      : isDataUnavailable
                        ? "bg-warning/10 border-warning/30 text-warning"
                        : "bg-primary/10 border-primary/20 text-primary"
                  )}
                >
                  <IconComponent className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block truncate">
                      {isForming ? "Perfil em formação" : isDataUnavailable ? "Perfil Indeterminado" : a.label}
                    </span>
                    {isForming ? (
                      <TacticalBadge variant="neutral" size="xs">
                        EM FORMAÇÃO
                      </TacticalBadge>
                    ) : isDataUnavailable ? (
                      <TacticalBadge variant="warning" size="xs">
                        DADOS INSUFICIENTES
                      </TacticalBadge>
                    ) : null}
                  </div>
                  <Link
                    href={`/players/${a.player.id}`}
                    className="text-xs font-black text-foreground hover:text-primary transition-micro block truncate"
                  >
                    {a.player.nickname}
                  </Link>
                  <span className="text-[9px] font-mono text-muted-foreground/50 block truncate mt-0.5">
                    {isForming ? "Mínimo de 10 partidas para definição de perfil" : a.rankText}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                  {isForming ? `${a.matchCount} partidas` : isDataUnavailable ? "—" : a.metricValue}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/50 block">
                  {isForming ? "Amostra em consolidação" : isDataUnavailable ? "Telemetria ausente" : a.metricLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MuralCompetitivo({
  powerRanking,
  decisive,
  archetypes,
  isHistoricalSnapshot,
  seasonName,
}: MuralCompetitivoProps) {
  const [activeTab, setActiveTab] = useState<string>("lideres");
  const prefersReduced = useReducedMotion();
  const xOffset = prefersReduced ? 0 : 8;

  const tabs = [
    { id: "lideres", label: "Líderes de Desempenho", icon: Trophy },
    { id: "impacto", label: "Impacto & Duelos", icon: Zap },
    { id: "perfis",  label: "Perfis & Arquétipos", icon: Compass },
  ];

  return (
    <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden flex flex-col">
      {/* Tactical Tabs Navigation */}
      <div className="p-3 border-b border-border/40 bg-surface-deck/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <TacticalTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        {seasonName && (
          <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-1 bg-surface-deck/60 rounded-xs self-start sm:self-auto">
            {seasonName}
          </span>
        )}
      </div>

      {/* Tab Body */}
      <div className="p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: xOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -xOffset }}
            transition={{ duration: prefersReduced ? 0.01 : 0.18, ease: [0.25, 0, 0, 1] }}
          >
            {activeTab === "lideres" && (
              <LideresTab powerRanking={powerRanking} isHistoricalSnapshot={isHistoricalSnapshot} />
            )}
            {activeTab === "impacto" && (
              <ImpactoTab decisive={decisive} isHistoricalSnapshot={isHistoricalSnapshot} />
            )}
            {activeTab === "perfis"  && (
              <PerfisTab archetypes={archetypes} isHistoricalSnapshot={isHistoricalSnapshot} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
