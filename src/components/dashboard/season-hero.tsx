"use client";

import { useState, useEffect } from "react";
import { Trophy, Swords, TrendingUp, Award, Clock, Flame, Users2, RefreshCw, Crosshair, Zap, Target, TrendingDown, AlertTriangle } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { PlayerMomentumEntry, MapPerformanceEntry } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

const MAP_IMAGES: Record<string, string> = {
  mirage: "/maps/mirage.png",
  dust2: "/maps/dust2.png",
  inferno: "/maps/inferno.png",
  ancient: "/maps/ancient.png",
  anubis: "/maps/anubis.png",
  nuke: "/maps/nuke.png",
  cache: "/maps/cache.png",
  overpass: "/maps/overpass.png",
};

function getMapImage(mapName: string | null | undefined): string | null {
  if (!mapName) return null;
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGES[norm] ?? null;
}

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

  // Format season label: "julho de 2026" -> "Julho/2026"
  const formattedLabel = seasonLabel
    .replace(" de ", "/")
    .replace(/^\w/, (c) => c.toUpperCase());

  const isActive = seasonStatus === "ACTIVE";

  const bestMapImg = bestMap ? getMapImage(bestMap.map) : null;
  const worstMapImg = worstMap ? getMapImage(worstMap.map) : null;

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.003] p-6 shadow-2xl flex flex-col gap-6">
      {/* Gameplay video background — desktop/tablet only, respects prefers-reduced-motion */}
      {showVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.15] pointer-events-none select-none"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source src="/video/videocapa.mp4" type="video/mp4" />
        </video>
      )}
      {/* Overlay: preserves readability over the video */}
      {showVideo && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75 pointer-events-none select-none" />
      )}

      {/* Background ambient light overlay for esports premium feel */}
      <div className="absolute -right-20 -top-20 size-80 rounded-full bg-primary/10 blur-[120px] pointer-events-none select-none" />
      <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-accent-cyan/5 blur-[120px] pointer-events-none select-none" />

      {/* 1. HEADER SECTION (Identity & Action) */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="size-3.5 text-status-warning shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                {isActive ? "Temporada" : "Temporada encerrada"}
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight leading-none mt-1">
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

      {/* ZONE 1: PERFORMANCE GERAL */}
      <div className="flex flex-col gap-4 z-10">
        <div className="flex items-center gap-4 select-none">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50 shrink-0">
            Performance Geral
          </span>
          <div className="h-px bg-white/[0.04] flex-1" />
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Partidas */}
          <div className="glass-panel rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest">Partidas</span>
              <Swords className="size-3.5 text-accent-cyan/80 shrink-0" />
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none tracking-tight">
                {totalMatches}
              </p>
              <p className="text-[8px] text-muted-foreground/35 mt-1.5 uppercase font-semibold">Total Disputado</p>
            </div>
          </div>

          {/* Card 2: Winrate */}
          <div className="glass-panel rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest">Winrate da Temporada</span>
              <TrendingUp className="size-3.5 text-emerald-400 shrink-0" />
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none tracking-tight">
                {communityWinrate}%
              </p>
              <p className="text-[8px] text-muted-foreground/35 mt-1.5 uppercase font-semibold">Performance da Temporada</p>
            </div>
          </div>

          {/* Card 3: Melhor Rating */}
          <div className="glass-panel rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest">Melhor Rating</span>
              <Award className="size-3.5 text-status-warning shrink-0" />
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none tracking-tight">
                {bestPlayer ? bestPlayer.rating.toFixed(2) : "—"}
              </p>
              <p className="text-[8px] text-muted-foreground/35 mt-1.5 uppercase font-semibold">Recorde Individual</p>
            </div>
          </div>

          {/* Card 4: Líder da Temporada */}
          <div className="glass-panel rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest">Líder da Temporada</span>
              <Users2 className="size-3.5 text-primary/80 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              {bestPlayer && <PlayerAvatar avatarUrl={bestPlayer.avatarUrl} nickname={bestPlayer.nickname} size="size-7" />}
              <div className="min-w-0">
                <p className="text-lg font-black text-white leading-none truncate uppercase tracking-tight">
                  {bestPlayer ? bestPlayer.nickname : "—"}
                </p>
                <p className="text-[8px] text-muted-foreground/35 mt-1 uppercase font-semibold">Melhor da temporada</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 2: ESTATÍSTICAS DE COMBATE */}
      <div className="flex flex-col gap-4 z-10">
        <div className="flex items-center gap-4 select-none">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50 shrink-0">
            Estatísticas de Combate
          </span>
          <div className="h-px bg-white/[0.04] flex-1" />
        </div>

        <div className="glass-panel rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
          <div className="grid grid-cols-5 divide-x divide-white/[0.04] text-center">
            <div className="flex flex-col gap-0.5">
              <p className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                <AnimatedNumber value={advancedStats.totalRounds} decimals={0} />
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none mt-2">Rounds</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                <AnimatedNumber value={advancedStats.totalKills} decimals={0} />
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none mt-2">Kills</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                <AnimatedNumber value={advancedStats.avgAdr} decimals={0} />
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none mt-2">ADR</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                <AnimatedNumber value={advancedStats.avgKd} decimals={2} />
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none mt-2">K/D</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                <AnimatedNumber value={advancedStats.avgHsPercent} decimals={0} suffix="%" />
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground/50 font-bold leading-none mt-2">HS%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 3: INSIGHTS DA TEMPORADA */}
      {(hottestPlayer || coldestPlayer || bestMap || worstMap) && (
        <div className="flex flex-col gap-4 z-10">
          <div className="flex items-center gap-4 select-none">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50 shrink-0">
              Insights da Temporada
            </span>
            <div className="h-px bg-white/[0.04] flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Em Alta */}
            {hottestPlayer && (
              <div className="glass-panel rounded-xl border border-status-good/10 bg-status-good/[0.005] p-4 flex flex-col justify-between gap-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-wider text-status-good/80 flex items-center gap-1.5">
                    <Zap className="size-3 text-status-good shrink-0" />
                    <span>Em alta</span>
                  </span>
                  <span className="text-[8px] font-extrabold bg-status-good/10 border border-status-good/15 text-status-good px-1.5 py-0.5 rounded uppercase">HOT</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <PlayerAvatar avatarUrl={hottestPlayer.player.avatarUrl} nickname={hottestPlayer.player.nickname} size="size-7" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-none truncate uppercase">{hottestPlayer.player.nickname}</p>
                    <p className="text-[8px] text-muted-foreground/60 font-semibold mt-1 leading-tight">Evolução de impacto</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px] border-t border-white/[0.03] pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/50">Rating:</span>
                    <strong className="text-status-good font-bold">{hottestPlayer.ratingChangeText}</strong>
                  </div>
                  {hottestPlayer.winrateChangeText && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/50">Winrate:</span>
                      <strong className="text-white/80 font-bold">{hottestPlayer.winrateChangeText}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Fase Ruim */}
            {coldestPlayer && (
              <div className="glass-panel rounded-xl border border-status-critical/10 bg-status-critical/[0.005] p-4 flex flex-col justify-between gap-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-wider text-status-critical/80 flex items-center gap-1.5">
                    <TrendingDown className="size-3 text-status-critical shrink-0" />
                    <span>Em queda</span>
                  </span>
                  <span className="text-[8px] font-extrabold bg-status-critical/10 border border-status-critical/15 text-status-critical px-1.5 py-0.5 rounded uppercase">COLD</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <PlayerAvatar avatarUrl={coldestPlayer.player.avatarUrl} nickname={coldestPlayer.player.nickname} size="size-7" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-none truncate uppercase">{coldestPlayer.player.nickname}</p>
                    <p className="text-[8px] text-muted-foreground/60 font-semibold mt-1 leading-tight">Impacto caiu</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px] border-t border-white/[0.03] pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/50">Rating:</span>
                    <strong className="text-status-critical font-bold">{coldestPlayer.ratingChangeText}</strong>
                  </div>
                  {coldestPlayer.winrateChangeText && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/55">Mas mantém:</span>
                      <strong className="text-white/80 font-bold">{coldestPlayer.winrateChangeText}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Território */}
            {bestMap && (
              <div className={cn(
                "glass-panel rounded-xl border p-4 flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden z-0",
                bestMapImg ? "border-accent-cyan/15" : "border-accent-cyan/10 bg-accent-cyan/[0.005]"
              )}>
                {bestMapImg && (
                  <>
                    <img
                      src={bestMapImg}
                      alt={bestMap.map}
                      className="bg-map-texture"
                    />
                    <div className="bg-texture-overlay" />
                  </>
                )}
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-wider text-accent-cyan flex items-center gap-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                    <Flame className="size-3 text-accent-cyan shrink-0" />
                    <span>🔥 Território</span>
                  </span>
                  <span className="text-[8px] font-extrabold bg-accent-cyan/10 border border-accent-cyan/15 text-accent-cyan px-1.5 py-0.5 rounded uppercase">MAPA</span>
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-white uppercase tracking-tight leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{bestMap.map}</p>
                  <p className="text-[8px] text-white/70 font-semibold mt-1 leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Forte domínio tático</p>
                </div>
                <div className="space-y-1.5 text-[10px] border-t border-white/[0.05] pt-2 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Winrate:</span>
                    <strong className="text-accent-cyan font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{bestMap.winrate.toFixed(0)}% WR</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Partidas:</span>
                    <strong className="text-white font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{bestMap.matchesPlayed} partidas</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Bala longe */}
            {worstMap && (
              <div className={cn(
                "glass-panel rounded-xl border p-4 flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden z-0",
                worstMapImg ? "border-status-warning/15" : "border-status-warning/10 bg-status-warning/[0.005]"
              )}>
                {worstMapImg && (
                  <>
                    <img
                      src={worstMapImg}
                      alt={worstMap.map}
                      className="bg-map-texture"
                    />
                    <div className="bg-texture-overlay" />
                  </>
                )}
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-wider text-status-warning flex items-center gap-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                    <AlertTriangle className="size-3 text-status-warning shrink-0" />
                    <span>😂 Bala longe</span>
                  </span>
                  <span className="text-[8px] font-extrabold bg-status-warning/10 border border-status-warning/15 text-status-warning px-1.5 py-0.5 rounded uppercase">VETO</span>
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-white uppercase tracking-tight leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{worstMap.map}</p>
                  <p className="text-[8px] text-white/70 font-semibold mt-1 leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Recomendação de Veto</p>
                </div>
                <div className="space-y-1.5 text-[10px] border-t border-white/[0.05] pt-2 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Winrate:</span>
                    <strong className="text-status-warning font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{worstMap.winrate.toFixed(0)}% WR</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">Partidas:</span>
                    <strong className="text-white font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{worstMap.matchesPlayed} partidas</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER TIMELINE & LAST UPDATE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/[0.04] pt-4 z-10 text-[10px] text-muted-foreground/50 font-medium">
        <div className="flex items-center gap-1.5 select-none">
          <Clock className="size-3 text-muted-foreground/35" />
          <span>Última atualização: agora</span>
        </div>

        {dominantMap && (
          <div className="flex items-center gap-1.5">
            <Flame className="size-3 text-status-danger/70 shrink-0 animate-pulse" />
            <span>
              Território Dominado: <strong className="text-foreground">{dominantMap.name}</strong> ({dominantMap.percentage}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
