"use client";

import { useState, useEffect } from "react";
import { Trophy, Clock, Flame } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

interface SeasonHeroProps {
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

function PlayerAvatar({ avatarUrl, nickname, size = "size-5" }: { avatarUrl?: string | null; nickname: string; size?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className={cn("rounded-full object-cover border border-white/10 shrink-0", size)}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  const initial = nickname.slice(0, 2).toUpperCase();
  return (
    <div className={cn("rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 font-bold text-primary text-[8px] uppercase tracking-wider select-none", size)}>
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
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced && window.innerWidth >= 768) {
      setShowVideo(true);
    }
  }, []);

  const formattedLabel = seasonLabel
    .replace(" de ", "/")
    .replace(/^\w/, (c) => c.toUpperCase());

  const isActive = seasonStatus === "ACTIVE";
  const prefersReduced = useReducedMotion();

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.003] p-6 shadow-2xl flex flex-col gap-8">
      {/* Video background */}
      {showVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.28] pointer-events-none select-none"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source src="/video/videocapa.mp4" type="video/mp4" />
        </video>
      )}
      {/* Single overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65 pointer-events-none select-none" />

      {/* Ambient light — single, subtle */}
      <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/8 blur-[100px] pointer-events-none select-none" />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="size-3.5 text-status-warning shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                {isActive ? "Temporada" : "Temporada encerrada"}
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight leading-none mt-1 [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
              {formattedLabel}
            </h2>
          </div>

          <div className="h-8 w-px bg-white/5 shrink-0" />

          {isActive ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Em andamento</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span>Finalizada</span>
            </div>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* ── MÉTRICAS PRINCIPAIS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 z-10">
        {/* Partidas */}
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.22, delay: prefersReduced ? 0 : 0.2, ease: [0.25, 0, 0, 1] }}
        >
          <p className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
            {totalMatches}
          </p>
          <p className="text-[9px] font-bold text-muted-foreground/55 uppercase tracking-widest select-none">
            Partidas
          </p>
        </motion.div>

        {/* Winrate */}
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.22, delay: prefersReduced ? 0 : 0.26, ease: [0.25, 0, 0, 1] }}
        >
          <p className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
            {communityWinrate}%
          </p>
          <p className="text-[9px] font-bold text-muted-foreground/55 uppercase tracking-widest select-none">
            Winrate
          </p>
        </motion.div>

        {/* Melhor Rating */}
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.22, delay: prefersReduced ? 0 : 0.32, ease: [0.25, 0, 0, 1] }}
        >
          <p className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
            {bestPlayer ? bestPlayer.rating.toFixed(2) : "—"}
          </p>
          <p className="text-[9px] font-bold text-muted-foreground/55 uppercase tracking-widest select-none">
            Melhor Rating
          </p>
        </motion.div>

        {/* Líder */}
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.22, delay: prefersReduced ? 0 : 0.38, ease: [0.25, 0, 0, 1] }}
        >
          <div className="flex items-center gap-2.5">
            {bestPlayer && (
              <PlayerAvatar avatarUrl={bestPlayer.avatarUrl} nickname={bestPlayer.nickname} size="size-9" />
            )}
            <p className="text-2xl lg:text-3xl font-black text-white leading-none uppercase tracking-tight truncate [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
              {bestPlayer ? bestPlayer.nickname : "—"}
            </p>
          </div>
          <p className="text-[9px] font-bold text-muted-foreground/55 uppercase tracking-widest select-none">
            Líder da Temporada
          </p>
        </motion.div>
      </div>

      {/* ── MÉTRICAS DE COMBATE ── */}
      <div className="z-10 border-t border-white/[0.05] pt-5">
        <div className="grid grid-cols-5 divide-x divide-white/[0.04] text-center">
          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-lg sm:text-xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              <AnimatedNumber value={advancedStats.totalRounds} decimals={0} />
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none select-none">Rounds</p>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-lg sm:text-xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              <AnimatedNumber value={advancedStats.totalKills} decimals={0} />
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none select-none">Kills</p>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-lg sm:text-xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              <AnimatedNumber value={advancedStats.avgAdr} decimals={0} />
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none select-none">ADR</p>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-lg sm:text-xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              <AnimatedNumber value={advancedStats.avgKd} decimals={2} />
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none select-none">K/D</p>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-lg sm:text-xl font-black text-white leading-none tracking-tight tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              <AnimatedNumber value={advancedStats.avgHsPercent} decimals={0} suffix="%" />
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none select-none">HS%</p>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/[0.04] pt-3 z-10 text-[10px] text-muted-foreground/45 font-medium">
        <div className="flex items-center gap-1.5 select-none">
          <Clock className="size-3 text-muted-foreground/30" />
          <span>Última atualização: agora</span>
        </div>

        {dominantMap && (
          <div className="flex items-center gap-1.5">
            <Flame className="size-3 text-status-danger/60 shrink-0" />
            <span>
              Território: <strong className="text-foreground/70">{dominantMap.name}</strong> ({dominantMap.percentage}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
