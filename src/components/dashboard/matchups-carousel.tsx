"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Swords } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { PlayerMatchupSummary } from "@/server/services/competitive.service";

interface Props {
  matchups: PlayerMatchupSummary[];
}

export function MatchupsCarousel({ matchups }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const entries = matchups.filter((m) => m.dominates || m.struggles);

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
    const card = el.querySelector("[data-matchup-card]") as HTMLElement | null;
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
    const next = Math.min(entries.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, entries.length, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const card = el.querySelector("[data-matchup-card]") as HTMLElement | null;
        if (!card) return;
        const cardWidth = card.offsetWidth + 12;
        const idx = Math.round(el.scrollLeft / cardWidth);
        setCurrentIndex(Math.min(idx, entries.length - 1));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(timeout); };
  }, [entries.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < entries.length - visibleCount;

  if (entries.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.06] p-8 text-center">
        <Swords className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/50">Nenhum confronto direto identificado ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/55 font-semibold tabular-nums">
          {currentIndex + 1} de {entries.length}
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
        {entries.map((entry) => {
          const dominatesRate = entry.dominates ? Math.round((entry.dominates.wins / entry.dominates.total) * 100) : null;
          const strugglesRate = entry.struggles ? Math.round((entry.struggles.wins / entry.struggles.total) * 100) : null;

          return (
            <Link
              key={entry.player.id}
              href={`/players/${entry.player.id}`}
              data-matchup-card
              className="glass-panel card-hover rounded-2xl border border-white/[0.08] overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] xl:w-[calc(25%-9px)] flex flex-col"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header — avatar continua protagonista */}
              <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.05] flex items-center gap-3">
                <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white truncate">{entry.player.nickname}</p>
                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-muted-foreground/60">
                    <Swords className="size-2.5" />
                    Confrontos diretos
                  </span>
                </div>
              </div>

              {/* Domina */}
              <div className="px-4 py-2.5 border-b border-white/[0.04] bg-status-good/[0.06]">
                <p className="text-[7px] uppercase tracking-widest font-bold text-status-good/70">Domina</p>
                {entry.dominates ? (
                  <p className="text-xs font-black text-status-good mt-0.5">
                    vs {entry.dominates.rivalName} — {entry.dominates.wins}/{entry.dominates.total} ({dominatesRate}%)
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">Sem domínio claro</p>
                )}
              </div>

              {/* Dificuldade */}
              <div className="px-4 py-2.5 mt-auto bg-status-critical/[0.06]">
                <p className="text-[7px] uppercase tracking-widest font-bold text-status-critical/70">Dificuldade</p>
                {entry.struggles ? (
                  <p className="text-xs font-black text-status-critical mt-0.5">
                    vs {entry.struggles.rivalName} — {entry.struggles.wins}/{entry.struggles.total} ({strugglesRate}%)
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">Sem dificuldade clara</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {entries.map((_, i) => (
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
