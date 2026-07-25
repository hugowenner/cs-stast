"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Map, Users, Clock } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FORMA_STYLE } from "@/lib/forma";
import type { MonitoredPlayerEntry } from "@/server/services/competitive.service";

interface Props {
  players: MonitoredPlayerEntry[];
}

const RANK_GLOW: Record<number, string> = {
  1: "border-status-warning/40 shadow-[0_0_12px_0_rgba(245,158,11,0.12)]",
  2: "border-white/20",
  3: "border-accent-violet/30",
};

export function MonitoredPlayersCarousel({ players }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 2;
    if (window.innerWidth >= 1280) return 4;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-player-card]") as HTMLElement | null;
    if (!card) return;
    const cardWidth = card.offsetWidth + 12; // gap-3
    el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = Math.min(players.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, players.length, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const card = el.querySelector("[data-player-card]") as HTMLElement | null;
        if (!card) return;
        const cardWidth = card.offsetWidth + 12;
        const idx = Math.round(el.scrollLeft / cardWidth);
        setCurrentIndex(Math.min(idx, players.length - 1));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(timeout); };
  }, [players.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < players.length - visibleCount;

  if (players.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.06] p-8 text-center">
        <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/50">Nenhum jogador monitorado com partidas registradas.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/55 font-semibold tabular-nums">
          {currentIndex + 1} de {players.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrev} disabled={!canPrev} aria-label="Jogador anterior"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="size-3.5" />
          </button>
          <button onClick={handleNext} disabled={!canNext} aria-label="Próximo jogador"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {players.map((entry) => {
          const forma = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];
          const FormaIcon = forma.icon;
          const rankGlow = RANK_GLOW[entry.rank] ?? "border-white/[0.08]";

          return (
            <Link
              key={entry.player.id}
              href={`/players/${entry.player.id}`}
              data-player-card
              className={`glass-panel card-hover rounded-2xl border overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] xl:w-[calc(25%-9px)] flex flex-col ${rankGlow}`}
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header */}
              <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.05] flex items-center gap-3">
                <div className="relative">
                  <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                  <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-0.5 rounded-full border ${
                    entry.rank === 1 ? "bg-status-warning text-black border-status-warning/50" :
                    entry.rank === 2 ? "bg-white/15 text-white border-white/20" :
                    entry.rank === 3 ? "bg-accent-violet/20 text-accent-violet border-accent-violet/30" :
                    "bg-white/[0.06] text-muted-foreground/70 border-white/[0.08]"
                  }`}>#{entry.rank}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white truncate">{entry.player.nickname}</p>
                  {entry.player.levelGc && (
                    <p className="text-[9px] text-muted-foreground/55 font-semibold mt-0.5">GC Nível {entry.player.levelGc}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${forma.bg} ${forma.border} ${forma.color}`}>
                    <FormaIcon className="size-2.5" />
                    {forma.text}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground/45 font-semibold">
                    <Clock className="size-2" />
                    Últimas {entry.matchCount}
                  </span>
                </div>
              </div>

              {/* Rating destaque */}
              <div className="px-4 py-3 flex items-end gap-3 border-b border-white/[0.04]">
                <div>
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55">Rating</p>
                  <p className="text-2xl font-black text-white tabular-nums leading-tight">
                    <AnimatedNumber value={entry.rating} decimals={2} duration={0.8} />
                  </p>
                </div>
                <div className="flex gap-3 mb-0.5">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">K/D</p>
                    <p className="text-xs font-black text-white/80 tabular-nums">
                      <AnimatedNumber value={entry.kd} decimals={2} duration={0.7} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">ADR</p>
                    <p className="text-xs font-black text-white/80 tabular-nums">
                      <AnimatedNumber value={entry.adr} decimals={0} duration={0.65} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">KAST</p>
                    <p className="text-xs font-black text-white/80 tabular-nums">
                      <AnimatedNumber value={entry.kast} decimals={0} suffix="%" duration={0.6} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">WR</p>
                    <p className="text-xs font-black text-white/80 tabular-nums">
                      <AnimatedNumber value={entry.winrate} decimals={0} suffix="%" duration={0.6} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats totais */}
              <div className="px-4 py-2.5 grid grid-cols-4 gap-1 border-b border-white/[0.04]">
                {[
                  { label: "Kills",    value: entry.totalKills,   dec: 0, dur: 0.6  },
                  { label: "Deaths",   value: entry.totalDeaths,  dec: 0, dur: 0.55 },
                  { label: "Assists",  value: entry.totalAssists, dec: 0, dur: 0.55 },
                  { label: "HS%",      value: entry.hsPercent,    dec: 0, dur: 0.5, suffix: "%" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">{s.label}</p>
                    <p className="text-[11px] font-black text-white/75 tabular-nums mt-0.5">
                      <AnimatedNumber value={s.value} decimals={s.dec} suffix={s.suffix ?? ""} duration={s.dur} />
                    </p>
                  </div>
                ))}
              </div>

              {/* Mapas + última partida */}
              <div className="px-4 py-2.5 flex items-start justify-between gap-2 mt-auto">
                <div className="min-w-0 flex-1">
                  {entry.bestMap && (
                    <div className="flex items-center gap-1 mb-1">
                      <Map className="size-2.5 text-status-good/70 shrink-0" />
                      <span className="text-[8px] text-status-good/80 font-semibold truncate">{entry.bestMap}</span>
                      <span className="text-[7px] text-muted-foreground/40 font-bold uppercase tracking-widest shrink-0">melhor</span>
                    </div>
                  )}
                  {entry.worstMap && (
                    <div className="flex items-center gap-1">
                      <Map className="size-2.5 text-status-warning/60 shrink-0" />
                      <span className="text-[8px] text-status-warning/70 font-semibold truncate">{entry.worstMap}</span>
                      <span className="text-[7px] text-muted-foreground/40 font-bold uppercase tracking-widest shrink-0">revisar</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/40">Partidas</p>
                  <p className="text-[11px] font-black text-white/60 tabular-nums">{entry.matchCount}</p>
                  {entry.lastMatchDate && (
                    <>
                      <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/40 mt-1">Última</p>
                      <p className="text-[9px] text-muted-foreground/55 tabular-nums">
                        {new Date(entry.lastMatchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {players.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para jogador ${i + 1}`}
            className={`rounded-full transition-all ${
              i === currentIndex ? "w-4 h-1.5 bg-primary/70" : "size-1.5 bg-white/[0.15] hover:bg-white/[0.3]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
