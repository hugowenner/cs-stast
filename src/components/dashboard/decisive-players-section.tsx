"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { DecisivePlayerEntry } from "@/server/services/competitive.service";

interface Props {
  decisive: DecisivePlayerEntry[];
}

const RANK_STYLE: Record<number, { border: string; badge: string; badgeText: string }> = {
  1: {
    border: "border-status-warning/35 shadow-[0_0_12px_0_rgba(245,158,11,0.1)]",
    badge: "bg-status-warning text-black border-status-warning/50",
    badgeText: "#1",
  },
  2: {
    border: "border-white/[0.12]",
    badge: "bg-white/15 text-white border-white/20",
    badgeText: "#2",
  },
  3: {
    border: "border-accent-violet/25",
    badge: "bg-accent-violet/20 text-accent-violet border-accent-violet/30",
    badgeText: "#3",
  },
};

export function DecisivePlayersSection({ decisive }: Props) {
  if (decisive.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {decisive.map((entry, i) => {
        const rank = i + 1;
        const style = RANK_STYLE[rank] ?? RANK_STYLE[3];
        const hideExtra = entry.hideTradesAndClutches;

        return (
          <Link
            key={entry.player.id}
            href={`/players/${entry.player.id}`}
            className={`glass-panel card-hover rounded-2xl border overflow-hidden flex flex-col ${style.border}`}
          >
            {/* Header */}
            <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.05] flex items-center gap-3">
              <div className="relative">
                <PlayerAvatar
                  nickname={entry.player.nickname}
                  avatarUrl={entry.player.avatarUrl}
                  size="md"
                />
                <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-0.5 rounded-full border ${style.badge}`}>
                  {style.badgeText}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">{entry.player.nickname}</p>
                <p className="text-[9px] text-muted-foreground/55 font-semibold mt-0.5">Jogador Decisivo</p>
              </div>
            </div>

            {/* Impacto — métrica principal */}
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55">
                Impacto nos Rounds
              </p>
              <p className="text-2xl font-black text-white tabular-nums leading-tight mt-0.5">
                <AnimatedNumber value={entry.impactPercent} decimals={0} suffix="%" duration={0.8} />
              </p>
            </div>

            {/* Entry kills sempre visível */}
            <div className={`px-4 py-2.5 ${hideExtra ? "" : "border-b border-white/[0.04]"} mt-auto`}>
              <div>
                <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                  Entry Kills
                </p>
                <p className="text-xs font-black text-white/80 tabular-nums mt-0.5">
                  <AnimatedNumber value={entry.entryKills} decimals={0} duration={0.6} />
                </p>
              </div>
            </div>

            {/* Trade kills + Clutch wins — só exibidos se o banco tem esses dados */}
            {!hideExtra && (
              <div className="px-4 py-2.5 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                    Trade Kills
                  </p>
                  <p className="text-xs font-black text-white/80 tabular-nums mt-0.5">
                    <AnimatedNumber value={entry.tradeKills} decimals={0} duration={0.55} />
                  </p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                    Clutch Wins
                  </p>
                  <p className="text-xs font-black text-white/80 tabular-nums mt-0.5">
                    <AnimatedNumber value={entry.clutchWins} decimals={0} duration={0.55} />
                  </p>
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
