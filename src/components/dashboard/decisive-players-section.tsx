"use client";

import Link from "next/link";
import { Trophy, Flame, Shield } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import {
  computeDecisiveCategories,
  type DecisivePlayerEntry,
} from "@/lib/decisive-categories";

interface Props {
  decisive: DecisivePlayerEntry[];
}

export function DecisivePlayersSection({ decisive }: Props) {
  if (decisive.length === 0) return null;

  const { reiDoClutch, pontaDeLanca, anjoDaGuarda } = computeDecisiveCategories(decisive);

  const categories = [
    {
      id: "clutch",
      title: "REI DO CLUTCH",
      subtitle: "Maior número de situações 1vX vencidas",
      icon: Trophy,
      iconColor: "text-amber-400",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      data: reiDoClutch,
      renderMetrics: (leader: DecisivePlayerEntry) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground/70">Clutches Vencidos</span>
            <span className="font-bold text-foreground">
              <AnimatedNumber value={leader.clutchWins} decimals={0} />V ({leader.clutchWinrate}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60 border-t border-border/20 pt-1">
            <span>Alta Desvantagem (1v2+)</span>
            <span>{leader.clutchHighDisadvantageWins ?? 0} vitórias</span>
          </div>
        </div>
      ),
    },
    {
      id: "ponta",
      title: "PONTA DE LANÇA",
      subtitle: "Maior número de duelos de abertura vencidos",
      icon: Flame,
      iconColor: "text-orange-400",
      badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
      data: pontaDeLanca,
      renderMetrics: (leader: DecisivePlayerEntry) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground/70">First Kills</span>
            <span className="font-bold text-foreground">
              <AnimatedNumber value={leader.entryKills} decimals={0} /> FK
              {leader.openingWinrate !== null && leader.openingWinrate !== undefined
                ? ` (${leader.openingWinrate}%)`
                : ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60 border-t border-border/20 pt-1">
            <span>Vitória Time Pós-FK</span>
            <span>
              {leader.teamWinrateAfterFk !== null && leader.teamWinrateAfterFk !== undefined
                ? `${leader.teamWinrateAfterFk}% dos rounds`
                : "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "anjo",
      title: "ANJO DA GUARDA",
      subtitle: "Maior volume de trades realizados",
      icon: Shield,
      iconColor: "text-cyan-400",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
      data: anjoDaGuarda,
      renderMetrics: (leader: DecisivePlayerEntry) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground/70">Trades Realizados</span>
            <span className="font-bold text-foreground">
              <AnimatedNumber value={leader.tradeKills} decimals={0} /> trades
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60 border-t border-border/20 pt-1">
            <span>Tempo Médio Reação</span>
            <span>{leader.avgTradeReactionTime !== null ? `${leader.avgTradeReactionTime}s` : "—"}</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {categories.map((cat) => {
        const { leader, hasTelemetry, isPreliminary } = cat.data;
        const Icon = cat.icon;

        return (
          <div
            key={cat.id}
            className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`size-3.5 ${cat.iconColor} shrink-0`} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                    {cat.title}
                  </span>
                </div>
                <TacticalBadge
                  variant={hasTelemetry ? (isPreliminary ? "warning" : "good") : "neutral"}
                  size="xs"
                >
                  {hasTelemetry ? (isPreliminary ? "Amostra preliminar" : "Disponível") : "Indisponível"}
                </TacticalBadge>
              </div>
              <span className="text-[10px] text-muted-foreground/70 font-sans block mt-0.5">
                {cat.subtitle}
              </span>
            </div>

            {!hasTelemetry || !leader ? (
              <div className="border-t border-border/30 pt-3 pb-1">
                <p className="text-[11px] font-mono text-muted-foreground/70">
                  Dados ausentes na súmula desta temporada.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 border-t border-border/30 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <PlayerAvatar
                        nickname={leader.player.nickname}
                        avatarUrl={leader.player.avatarUrl}
                        size="sm"
                      />
                      <span className={`absolute -bottom-1 -right-1 text-[8px] font-mono font-black px-1 py-0.2 rounded-xs border ${cat.badgeColor}`}>
                        #1
                      </span>
                    </div>
                    <Link
                      href={`/players/${leader.player.id}`}
                      className="font-medium text-xs text-foreground hover:text-primary transition-micro truncate"
                    >
                      {leader.player.nickname}
                    </Link>
                  </div>
                </div>

                {cat.renderMetrics(leader)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
