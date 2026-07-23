"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import Link from "next/link";

export interface RecentMatchCardData {
  id: string;
  playedAt: Date;
  scoreTeamA: number;
  scoreTeamB: number;
  map: { name: string };
  session: { name: string };
  playerStats: {
    team: string;
    kills: number;
    deaths: number;
    adr: number;
    rating: number;
    player: { id: string; nickname: string; avatarUrl: string | null };
  }[];
}

interface Props {
  matches: RecentMatchCardData[];
}

const MAP_ABBR: Record<string, string> = {
  dust2: "D2", mirage: "MIR", inferno: "INF", nuke: "NUK", overpass: "OVP",
  ancient: "ANC", anubis: "ANB", vertigo: "VRT", cache: "CHE", train: "TRN",
};

function mapAbbr(name: string): string {
  return MAP_ABBR[name.toLowerCase()] ?? name.slice(0, 3).toUpperCase();
}

function kd(kills: number, deaths: number): string {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function RecentMatchesCarousel({ matches }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    if (!card) return;
    el.scrollTo({ left: index * (card.offsetWidth + 14), behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = Math.min(matches.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, matches.length, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const card = el.querySelector("[data-card]") as HTMLElement | null;
        if (!card) return;
        const idx = Math.round(el.scrollLeft / (card.offsetWidth + 14));
        setCurrentIndex(Math.min(idx, matches.length - 1));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, [matches.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < matches.length - visibleCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/55 font-semibold tabular-nums">
          {currentIndex + 1} de {matches.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrev} disabled={!canPrev} aria-label="Partida anterior"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="size-3.5" />
          </button>
          <button onClick={handleNext} disabled={!canNext} aria-label="Próxima partida"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho */}
      <div ref={scrollRef} className="flex gap-3.5 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}>
        {matches.map((match) => {
          const winA = match.scoreTeamA > match.scoreTeamB;
          const winB = match.scoreTeamB > match.scoreTeamA;
          const draw = match.scoreTeamA === match.scoreTeamB;
          const date = DATE_FMT.format(new Date(match.playedAt));

          // Separar jogadores por time, ordenar por rating desc
          const teamA = match.playerStats.filter((p) => p.team === "A").sort((a, b) => b.rating - a.rating);
          const teamB = match.playerStats.filter((p) => p.team === "B").sort((a, b) => b.rating - a.rating);

          return (
            <div key={match.id} data-card
              className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)] flex flex-col"
              style={{ scrollSnapAlign: "start" }}>

              {/* Header: mapa + data + placar */}
              <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.05] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-white/[0.05] border border-white/[0.06] text-[10px] font-black text-muted-foreground/80 shrink-0">
                    {mapAbbr(match.map.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white capitalize truncate">{match.map.name}</p>
                    <p className="text-[9px] text-muted-foreground/55">{date}</p>
                  </div>
                </div>

                {/* Placar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-base font-black tabular-nums ${winA ? "text-status-good" : draw ? "text-muted-foreground/60" : "text-muted-foreground/40"}`}>
                    {match.scoreTeamA}
                  </span>
                  <span className="text-[10px] text-muted-foreground/30 font-bold">–</span>
                  <span className={`text-base font-black tabular-nums ${winB ? "text-status-good" : draw ? "text-muted-foreground/60" : "text-muted-foreground/40"}`}>
                    {match.scoreTeamB}
                  </span>
                </div>
              </div>

              {/* Corpo: times separados */}
              <div className="flex flex-col flex-1 divide-y divide-white/[0.035]">
                {/* Time A */}
                {teamA.length > 0 && (
                  <div className="px-4 py-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-2">
                      Time A {winA && <span className="text-status-good/80">· Vitória</span>}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {teamA.map((ps) => (
                        <div key={ps.player.id} className="flex items-center gap-2">
                          <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />
                          <span className="text-[10px] font-bold text-white/85 min-w-0 truncate flex-1">{ps.player.nickname}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] text-muted-foreground/65 tabular-nums font-semibold">{ps.kills}/{ps.deaths}</span>
                            <span className="text-[10px] font-black tabular-nums text-white/80 w-9 text-right">{kd(ps.kills, ps.deaths)}</span>
                            <span className="text-[9px] font-bold tabular-nums text-accent-cyan/80 w-8 text-right">{ps.rating.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time B */}
                {teamB.length > 0 && (
                  <div className="px-4 py-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-2">
                      Time B {winB && <span className="text-status-good/80">· Vitória</span>}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {teamB.map((ps) => (
                        <div key={ps.player.id} className="flex items-center gap-2">
                          <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />
                          <span className="text-[10px] font-bold text-white/85 min-w-0 truncate flex-1">{ps.player.nickname}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] text-muted-foreground/65 tabular-nums font-semibold">{ps.kills}/{ps.deaths}</span>
                            <span className="text-[10px] font-black tabular-nums text-white/80 w-9 text-right">{kd(ps.kills, ps.deaths)}</span>
                            <span className="text-[9px] font-bold tabular-nums text-accent-cyan/80 w-8 text-right">{ps.rating.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: link para detalhes */}
              <div className="px-4 py-3 border-t border-white/[0.05] mt-auto">
                <Link href={`/matches/${match.id}`}
                  className="text-[10px] text-primary/65 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group">
                  Ver detalhes
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {matches.map((_, i) => (
          <button key={i} onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para partida ${i + 1}`}
            className={`rounded-full transition-all ${i === currentIndex ? "w-4 h-1.5 bg-primary/70" : "size-1.5 bg-white/[0.15] hover:bg-white/[0.3]"}`}
          />
        ))}
      </div>
    </div>
  );
}
