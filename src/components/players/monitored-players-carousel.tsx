"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Map, Users, Clock } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FORMA_STYLE } from "@/lib/forma";
import type { CarouselMonitoredPlayerEntry } from "@/lib/monitored-players";
import { cn } from "@/lib/utils";

interface Props {
  players: CarouselMonitoredPlayerEntry[];
  isAllSeasons?: boolean;
}

export function MonitoredPlayersCarousel({ players, isAllSeasons = false }: Props) {
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

  // Reseta scroll e paginação ao trocar a lista filtrada (ex: troca de temporada)
  useEffect(() => {
    setCurrentIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [players]);

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
        setCurrentIndex(Math.min(idx, Math.max(0, players.length - 1)));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, [players.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < players.length - visibleCount;

  if (players.length === 0) {
    const emptyMessage = isAllSeasons
      ? "Nenhum jogador atingiu o mínimo de 5 partidas no histórico."
      : "Nenhum jogador atingiu o mínimo de 5 partidas nesta temporada.";

    return (
      <div className="bg-surface-panel rounded-sm border border-border/60 p-8 text-center flex flex-col items-center justify-center gap-2">
        <Users className="size-8 text-muted-foreground/40 mb-1" />
        <p className="text-xs font-mono font-bold text-foreground">
          {emptyMessage}
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm">
          Mínimo de 5 partidas para aparecer e 10 para disputar posições oficiais.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controles de navegação e paginação */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/60 font-semibold tabular-nums">
          {currentIndex + 1} de {players.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Jogador anterior"
            className="flex items-center justify-center size-7 rounded-xs border border-border/50 bg-surface-deck text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Próximo jogador"
            className="flex items-center justify-center size-7 rounded-xs border border-border/50 bg-surface-deck text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho de Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {players.map((entry) => {
          const forma = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];
          const FormaIcon = forma.icon;
          const isTop1 = entry.displayRank === 1 && !entry.isInitialSample;

          return (
            <Link
              key={entry.player.id}
              href={`/players/${entry.player.id}`}
              data-player-card
              className={cn(
                "bg-surface-panel rounded-sm border overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] xl:w-[calc(25%-9px)] flex flex-col relative z-0 group transition-all duration-200 shadow-sm",
                isTop1 ? "border-gold/40 hover:border-gold/70" : "border-border/60 hover:border-border/90"
              )}
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header do Card */}
              <div className="px-3.5 py-3 border-b border-border/40 bg-surface-deck/40 flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                    {/* Numeração exibida exclusivamente para quem tem amostra completa */}
                    {!entry.isInitialSample && entry.displayRank !== null && (
                      <span
                        className={cn(
                          "absolute -bottom-1 -right-1 text-[8px] font-mono font-black leading-none px-1 py-0.5 rounded-2xs border tabular-nums",
                          entry.displayRank === 1
                            ? "bg-gold text-black border-gold font-black"
                            : entry.displayRank <= 3
                            ? "bg-surface-panel text-foreground border-border"
                            : "bg-surface-deck text-muted-foreground border-border/60"
                        )}
                      >
                        #{entry.displayRank}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {entry.player.nickname}
                    </p>
                    {entry.player.levelGc ? (
                      <p className="text-[9px] font-mono text-muted-foreground/70 font-semibold">
                        GC Nível {entry.player.levelGc}
                      </p>
                    ) : (
                      <p className="text-[9px] font-mono text-muted-foreground/50">
                        Jogador Ativo
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    {/* Badge Amostra Inicial para 5 a 9 partidas */}
                    {entry.isInitialSample && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-2xs text-[8px] font-mono font-bold uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-400">
                        Amostra inicial
                      </span>
                    )}
                    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-2xs text-[9px] font-mono font-bold border", forma.bg, forma.border, forma.color)}>
                      <FormaIcon className="size-2.5" />
                      {forma.text}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[8px] font-mono text-muted-foreground/60">
                    <Clock className="size-2" />
                    Últimas {entry.sampleMatches} partidas
                  </span>
                </div>
              </div>

              {/* Rating destaque */}
              <div className="px-3.5 py-3 flex items-end justify-between border-b border-border/30 bg-surface-panel relative z-10">
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/60 block font-semibold">
                    RATING 2.0
                  </span>
                  <span className="text-2xl font-mono font-black text-foreground tabular-nums leading-none">
                    <AnimatedNumber value={entry.rating} decimals={2} duration={0.8} />
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-right font-mono">
                  <div>
                    <span className="text-[7px] uppercase tracking-wider text-muted-foreground/60 block">K/D</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      <AnimatedNumber value={entry.kd} decimals={2} duration={0.7} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] uppercase tracking-wider text-muted-foreground/60 block">ADR</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      <AnimatedNumber value={entry.adr} decimals={0} duration={0.65} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] uppercase tracking-wider text-muted-foreground/60 block">KAST</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      <AnimatedNumber value={entry.kast} decimals={0} suffix="%" duration={0.6} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] uppercase tracking-wider text-muted-foreground/60 block">WR</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      <AnimatedNumber value={entry.winrate} decimals={0} suffix="%" duration={0.6} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats totais da amostra recente */}
              <div className="px-3.5 py-2 grid grid-cols-4 gap-1 border-b border-border/30 bg-surface-deck/30 text-center font-mono relative z-10">
                {[
                  { label: "KILLS",    value: entry.totalKills,   dec: 0 },
                  { label: "MORTES",   value: entry.totalDeaths,  dec: 0 },
                  { label: "ASSISTS",  value: entry.totalAssists, dec: 0 },
                  { label: "HS%",      value: entry.hsPercent,    dec: 0, suffix: "%" },
                ].map((s) => (
                  <div key={s.label}>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/50 block">{s.label}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums mt-0.5 block">
                      <AnimatedNumber value={s.value} decimals={s.dec} suffix={s.suffix ?? ""} />
                    </span>
                  </div>
                ))}
              </div>

              {/* Mapas + Total real de partidas no período */}
              <div className="px-3.5 py-2.5 flex items-start justify-between gap-2 mt-auto bg-surface-panel relative z-10">
                <div className="min-w-0 flex-1 font-mono text-[9px]">
                  {entry.bestMap && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <Map className="size-2.5 text-status-good shrink-0" />
                      <span className="text-foreground font-semibold truncate">{entry.bestMap}</span>
                      <span className="text-[7px] text-status-good font-bold uppercase shrink-0">(forte)</span>
                    </div>
                  )}
                  {entry.worstMap && (
                    <div className="flex items-center gap-1">
                      <Map className="size-2.5 text-status-warning shrink-0" />
                      <span className="text-muted-foreground font-semibold truncate">{entry.worstMap}</span>
                      <span className="text-[7px] text-status-warning font-bold uppercase shrink-0">(revisar)</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono">
                  <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/60 block">
                    {isAllSeasons ? "NO HISTÓRICO" : "NA TEMPORADA"}
                  </span>
                  <span className="text-[11px] font-black text-foreground tabular-nums">
                    {entry.totalSeasonMatches} partidas
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Indicadores de bolinha (Dots) */}
      <div className="flex items-center justify-center gap-1 pt-1">
        {players.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIndex(i);
              scrollToIndex(i);
            }}
            aria-label={`Ir para jogador ${i + 1}`}
            className={cn(
              "h-1 rounded-none transition-all cursor-pointer",
              i === currentIndex ? "w-5 bg-primary" : "w-2 bg-border/60 hover:bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
