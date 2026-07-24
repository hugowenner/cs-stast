"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { RivalryH2HSummary } from "@/server/services/rivalry.service";

interface Props {
  rivalries: RivalryH2HSummary[];
}

export function RivalryCarousel({ rivalries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 2;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    if (!card) return;
    const cardWidth = card.offsetWidth + 14; // gap-3.5 = 14px
    el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = Math.min(rivalries.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, rivalries.length, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const card = el.querySelector("[data-card]") as HTMLElement | null;
        if (!card) return;
        const cardWidth = card.offsetWidth + 14;
        const idx = Math.round(el.scrollLeft / cardWidth);
        setCurrentIndex(Math.min(idx, rivalries.length - 1));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, [rivalries.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < rivalries.length - visibleCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/55 font-semibold tabular-nums">
          {currentIndex + 1} de {rivalries.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Confronto anterior"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Próximo confronto"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho de scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {rivalries.map((rivalry, index) => {
          const aLeads = rivalry.winsA > rivalry.winsB;
          const bLeads = rivalry.winsB > rivalry.winsA;
          const isTied = rivalry.winsA === rivalry.winsB;
          const leader = aLeads ? rivalry.playerA.nickname : bLeads ? rivalry.playerB.nickname : null;
          const leaderWins = aLeads ? rivalry.winsA : rivalry.winsB;
          const total = rivalry.matchesAgainst;
          const barWidthA = total > 0 ? (rivalry.winsA / total) * 100 : 50;

          return (
            <div
              key={rivalry.id}
              data-card
              className="glass-panel card-hover rounded-2xl border border-white/[0.08] overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)] group/card"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header */}
              <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2.5">
                <Swords className="size-3 text-muted-foreground/50 shrink-0" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">
                  Rivalidade
                </span>
                {index === 0 && (
                  <span className="text-[8px] font-bold text-accent-violet/80 border border-accent-violet/25 bg-accent-violet/10 px-1.5 py-0.5 rounded-md leading-none">
                    Principal
                  </span>
                )}
                <span className="ml-auto text-[9px] text-muted-foreground/55 font-semibold">{total} confrontos</span>
              </div>

              {/* Jogadores */}
              <div className="px-4 py-4 flex items-center gap-3">
                <div className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${!aLeads && !isTied ? "opacity-40 group-hover/card:opacity-50" : "group-hover/card:scale-[1.02]"}`}>
                  <PlayerAvatar nickname={rivalry.playerA.nickname} avatarUrl={rivalry.playerA.avatarUrl} size="md" />
                  <p className="text-xs font-bold text-white truncate max-w-full text-center">{rivalry.playerA.nickname}</p>
                  <span className={`text-xl font-black tabular-nums ${aLeads ? "text-white" : "text-muted-foreground/45"}`}>
                    {rivalry.winsA}
                  </span>
                  {rivalry.avgKdA !== null && (
                    <span className="text-[9px] text-muted-foreground/65 font-semibold">KD {rivalry.avgKdA.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex flex-col items-center shrink-0 px-1">
                  <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">vs</span>
                </div>

                <div className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${!bLeads && !isTied ? "opacity-40 group-hover/card:opacity-50" : "group-hover/card:scale-[1.02]"}`}>
                  <PlayerAvatar nickname={rivalry.playerB.nickname} avatarUrl={rivalry.playerB.avatarUrl} size="md" />
                  <p className="text-xs font-bold text-white truncate max-w-full text-center">{rivalry.playerB.nickname}</p>
                  <span className={`text-xl font-black tabular-nums ${bLeads ? "text-white" : "text-muted-foreground/45"}`}>
                    {rivalry.winsB}
                  </span>
                  {rivalry.avgKdB !== null && (
                    <span className="text-[9px] text-muted-foreground/65 font-semibold">KD {rivalry.avgKdB.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Barra de domínio */}
              <div className="px-4">
                <div className="relative h-1 rounded-full bg-white/[0.07] overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidthA}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-muted-foreground/55 font-bold">{rivalry.winrateA}%</span>
                  <span className="text-[8px] text-muted-foreground/55 font-bold">{100 - rivalry.winrateA}%</span>
                </div>
              </div>

              {/* Tabela compacta: stats comparativos */}
              {(rivalry.avgKdA !== null || rivalry.avgKdB !== null || rivalry.lastMatch) && (
                <div className="mx-4 mt-3 mb-0 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  {/* Header da tabela */}
                  <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.05]">
                    <span className="px-2.5 py-1.5 text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55 truncate">{rivalry.playerA.nickname}</span>
                    <span className="px-2 py-1.5 text-[8px] uppercase tracking-widest font-bold text-muted-foreground/30 text-center">—</span>
                    <span className="px-2.5 py-1.5 text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55 text-right truncate">{rivalry.playerB.nickname}</span>
                  </div>

                  {/* Linha: K/D médio */}
                  {(rivalry.avgKdA !== null || rivalry.avgKdB !== null) && (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.04]">
                      <span className="px-2.5 py-1.5 text-[10px] font-black text-white/80 tabular-nums">{rivalry.avgKdA?.toFixed(2) ?? "—"}</span>
                      <span className="px-2 py-1.5 text-[8px] text-muted-foreground/45 font-bold uppercase tracking-widest text-center whitespace-nowrap">KD médio</span>
                      <span className="px-2.5 py-1.5 text-[10px] font-black text-white/80 tabular-nums text-right">{rivalry.avgKdB?.toFixed(2) ?? "—"}</span>
                    </div>
                  )}

                  {/* Linha: último confronto K/D */}
                  {rivalry.lastMatch?.statsA && (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.04]">
                      <span className="px-2.5 py-1.5 text-[10px] font-black text-white/80 tabular-nums">
                        {rivalry.lastMatch.statsA.kd.toFixed(2)}
                      </span>
                      <span className="px-2 py-1.5 text-[8px] text-muted-foreground/45 font-bold uppercase tracking-widest text-center whitespace-nowrap">KD último</span>
                      <span className="px-2.5 py-1.5 text-[10px] font-black text-white/80 tabular-nums text-right">
                        {rivalry.lastMatch.statsB?.kd.toFixed(2) ?? "—"}
                      </span>
                    </div>
                  )}

                  {/* Linha: kills/deaths do último confronto */}
                  {rivalry.lastMatch?.statsA && (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                      <span className="px-2.5 py-1.5 text-[9px] text-muted-foreground/65 tabular-nums font-semibold">
                        {rivalry.lastMatch.statsA.kills}/{rivalry.lastMatch.statsA.deaths}
                      </span>
                      <span className="px-2 py-1.5 text-[8px] text-muted-foreground/35 font-bold uppercase tracking-widest text-center whitespace-nowrap">K/D</span>
                      <span className="px-2.5 py-1.5 text-[9px] text-muted-foreground/65 tabular-nums font-semibold text-right">
                        {rivalry.lastMatch.statsB ? `${rivalry.lastMatch.statsB.kills}/${rivalry.lastMatch.statsB.deaths}` : "—"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer: vantagem + último mapa */}
              <div className="px-4 pb-4 pt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {leader ? (
                    <div>
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/45">Vantagem</p>
                      <p className="text-sm font-black text-white mt-0.5 truncate">{leader}</p>
                      <p className="text-[10px] text-primary/80 font-black tabular-nums mt-0.5">{leaderWins}–{total - leaderWins}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/45">Placar</p>
                      <p className="text-[10px] text-muted-foreground/65 font-semibold mt-0.5">Empatado</p>
                    </div>
                  )}
                </div>
                {rivalry.lastMatch && (
                  <div className="text-right shrink-0">
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/45">Último mapa</p>
                    <p className="text-[10px] text-white/75 capitalize mt-0.5">{rivalry.lastMatch.mapName}</p>
                    <p className="text-[10px] font-black text-white/60 tabular-nums">{rivalry.lastMatch.scoreA}–{rivalry.lastMatch.scoreB}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots indicadores */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {rivalries.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para confronto ${i + 1}`}
            className={`rounded-full transition-all ${
              i === currentIndex
                ? "w-4 h-1.5 bg-primary/70"
                : "size-1.5 bg-white/[0.15] hover:bg-white/[0.3]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
