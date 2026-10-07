"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, ShieldCheck, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { SampleIndicator } from "@/components/ui/sample-indicator";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import type { PowerRankingEntry, SeasonComparisonEntry } from "@/server/services/competitive.service";
import { FORMA_STYLE } from "@/lib/forma";
import { cn } from "@/lib/utils";

export interface OfficialScoreRankingEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc?: number | null } | null;
  matchesPlayed: number;
  value: number;
  rHat: number;
  pHat: number;
  confidenceStatus: "PROVISIONAL" | "MEDIUM" | "HIGH";
  isEligible: boolean;
  rawRating: number;
  rawScore: number;
}

export interface RankingTableProps {
  entries?: PowerRankingEntry[];
  officialEntries?: OfficialScoreRankingEntry[];
  seasonComparison?: SeasonComparisonEntry[];
  delay?: number;
  className?: string;
}

export function RankingTable({
  entries = [],
  officialEntries,
  seasonComparison = [],
  delay = 0.1,
  className = "w-full",
}: RankingTableProps) {
  const diffByPlayer = new Map(seasonComparison.map((e) => [e.player.id, e.diff.rating]));
  const prefersReduced = useReducedMotion();

  const isOfficial = Array.isArray(officialEntries) && officialEntries.length > 0;

  if (isOfficial) {
    return (
      <div className={cn("bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col", className)}>
        {/* Header bar */}
        <div className="px-5 py-3.5 border-b border-border/40 bg-surface-deck/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                Score Oficial da Temporada
              </span>
              <TacticalBadge label="MODELO 3.5" variant="gold" size="xs" />
            </div>
            <p className="text-[11px] text-muted-foreground/65 font-sans leading-tight">
              Classificação auditada: desempenho individual, winrate Bayesiano e amostragem mínima de 10 partidas.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Mín. 10 jogos</span>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {officialEntries.map((entry, index) => {
            if (!entry.player) return null;
            const rank = index + 1;
            const isTop1 = rank === 1;
            const isTop3 = rank <= 3;

            return (
              <motion.div
                key={entry.player.id}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReduced ? 0.01 : 0.16,
                  delay: prefersReduced ? 0 : delay + index * 0.03,
                  ease: [0.25, 0, 0, 1],
                }}
                className={cn(
                  "px-4 sm:px-5 py-3 flex items-center justify-between gap-3 transition-micro group",
                  isTop1
                    ? "bg-gold/[0.02] hover:bg-gold/[0.05]"
                    : "hover:bg-surface-elevated/30"
                )}
              >
                {/* Left: Position + Avatar + Player Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={cn(
                      "font-mono text-xs font-black w-6 text-center shrink-0 tabular-nums",
                      isTop1
                        ? "text-gold font-black drop-shadow-[0_0_8px_rgba(230,175,46,0.3)]"
                        : isTop3
                          ? "text-foreground font-bold"
                          : "text-muted-foreground/50 font-semibold"
                    )}
                  >
                    #{rank}
                  </span>

                  <PlayerAvatar
                    nickname={entry.player.nickname}
                    avatarUrl={entry.player.avatarUrl}
                    size="sm"
                  />

                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/players/${entry.player.id}`}
                        className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-micro truncate"
                      >
                        {entry.player.nickname}
                      </Link>
                      {isTop1 && (
                        <TacticalBadge label="LÍDER" variant="gold" size="xs" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground/60">
                      <span>{entry.matchesPlayed} partidas</span>
                      <span>·</span>
                      <span
                        className={cn(
                          "font-bold uppercase",
                          entry.confidenceStatus === "HIGH"
                            ? "text-status-good"
                            : entry.confidenceStatus === "MEDIUM"
                              ? "text-cyan-400"
                              : "text-status-warning"
                        )}
                      >
                        {entry.confidenceStatus === "HIGH" ? "Amostra Forte" : entry.confidenceStatus === "MEDIUM" ? "Elegível" : "Provisório"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop stats telemetry matrix */}
                <div className="hidden md:grid grid-cols-4 gap-6 text-right shrink-0">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                      R_HAT (RATING)
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground/90 tabular-nums block">
                      <AnimatedNumber value={entry.rHat} decimals={3} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                      P_HAT (WINRATE)
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground/90 tabular-nums block">
                      <AnimatedNumber value={Math.round(entry.pHat * 100)} decimals={0} suffix="%" />
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                      RATING BRUTO
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground/90 tabular-nums block">
                      <AnimatedNumber value={entry.rawRating} decimals={2} />
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                      SCORE 3.5
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm font-black tabular-nums block",
                        isTop1 ? "text-gold" : "text-primary"
                      )}
                    >
                      <AnimatedNumber value={entry.value} decimals={3} />
                    </span>
                  </div>
                </div>

                {/* Mobile stats representation */}
                <div className="md:hidden text-right shrink-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                    SCORE 3.5
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-black tabular-nums block",
                      isTop1 ? "text-gold" : "text-primary"
                    )}
                  >
                    <AnimatedNumber value={entry.value} decimals={3} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Generic Power Ranking table
  return (
    <div className={cn("bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col", className)}>
      <div className="px-5 py-3.5 border-b border-border/40 bg-surface-deck/40 flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
          Classificação Geral da Temporada
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Ordenação por Rating 2.0
        </span>
      </div>

      <div className="divide-y divide-border/30">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isTop1 = rank === 1;
          const isTop3 = rank <= 3;
          const diff = diffByPlayer.get(entry.player.id);
          const forma = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];

          return (
            <motion.div
              key={entry.player.id}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0.01 : 0.16,
                delay: prefersReduced ? 0 : delay + index * 0.03,
                ease: [0.25, 0, 0, 1],
              }}
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-elevated/30 transition-micro group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={cn(
                    "font-mono text-xs font-black w-6 text-center shrink-0 tabular-nums",
                    isTop1
                      ? "text-gold font-black drop-shadow-[0_0_8px_rgba(230,175,46,0.3)]"
                      : isTop3
                        ? "text-foreground font-bold"
                        : "text-muted-foreground/50 font-semibold"
                  )}
                >
                  #{rank}
                </span>

                <PlayerAvatar
                  nickname={entry.player.nickname}
                  avatarUrl={entry.player.avatarUrl}
                  size="sm"
                />

                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/players/${entry.player.id}`}
                      className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-micro truncate"
                    >
                      {entry.player.nickname}
                    </Link>
                    {isTop1 && (
                      <TacticalBadge label="TOP 1" variant="gold" size="xs" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground/60">
                    <span>{entry.matchCount} partidas</span>
                    {diff !== undefined && (
                      <>
                        <span>·</span>
                        <DeltaIndicator value={diff.toFixed(2)} size="xs" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop stats row */}
              <div className="hidden sm:grid grid-cols-5 gap-5 text-right shrink-0">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                    ADR
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                    <AnimatedNumber value={entry.adr} decimals={0} />
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                    K/D
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                    <AnimatedNumber value={entry.kd} decimals={2} />
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                    KAST
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                    <AnimatedNumber value={entry.kast} decimals={0} suffix="%" />
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                    WINRATE
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                    <AnimatedNumber value={entry.winrate} decimals={0} suffix="%" />
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                    RATING 2.0
                  </span>
                  <span className="font-mono text-sm font-black text-primary tabular-nums block">
                    <AnimatedNumber value={entry.rating} decimals={2} />
                  </span>
                </div>
              </div>

              {/* Mobile stats */}
              <div className="sm:hidden text-right shrink-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                  RATING
                </span>
                <span className="font-mono text-sm font-black text-primary tabular-nums block">
                  <AnimatedNumber value={entry.rating} decimals={2} />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
