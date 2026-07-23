"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Swords, Shield } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import Link from "next/link";
import type { RecentMatchCardData } from "./recent-matches-carousel";

// ─── helpers ─────────────────────────────────────────────────────────────────

function kdRatio(kills: number, deaths: number): string {
  if (deaths === 0) return kills > 0 ? kills.toFixed(2) : "0.00";
  return (kills / deaths).toFixed(2);
}

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

// ─── Card interno ─────────────────────────────────────────────────────────────

type PS = RecentMatchCardData["playerStats"][number];

function PlayerRow({ ps, reverse = false }: { ps: PS; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />
      <div className={`min-w-0 flex-1 ${reverse ? "text-right" : ""}`}>
        <p className="text-[10px] font-bold text-white/90 truncate leading-tight">{ps.player.nickname}</p>
        <p className="text-[9px] text-muted-foreground/65 tabular-nums leading-tight">
          {ps.kills}/{ps.deaths} · KD {kdRatio(ps.kills, ps.deaths)} · {Math.round(ps.adr)} ADR
        </p>
      </div>
      <span className="text-[9px] font-bold text-accent-cyan/80 tabular-nums shrink-0 w-7 text-center">
        {ps.rating.toFixed(2)}
      </span>
    </div>
  );
}

function ConfrontationCard({ match }: { match: RecentMatchCardData }) {
  const sideA = [...match.playerStats.filter((p) => p.team === "A")].sort(
    (a, b) => b.rating - a.rating,
  );
  const sideB = [...match.playerStats.filter((p) => p.team === "B")].sort(
    (a, b) => b.rating - a.rating,
  );

  const wonA = match.scoreTeamA > match.scoreTeamB;
  const wonB = match.scoreTeamB > match.scoreTeamA;
  const draw = !wonA && !wonB;

  const hasConfrontation = sideA.length > 0 && sideB.length > 0;
  const is1v1 = sideA.length === 1 && sideB.length === 1;

  const date = DATE_FMT.format(new Date(match.playedAt));
  const mapName = match.map.name;

  return (
    <div
      data-card
      className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex-shrink-0 flex flex-col
        w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)]"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
        {hasConfrontation ? (
          <Swords className="size-3 text-muted-foreground/45 shrink-0" />
        ) : (
          <Shield className="size-3 text-muted-foreground/45 shrink-0" />
        )}
        <span className="text-xs font-bold text-white/85 capitalize truncate">{mapName}</span>
        <span className="ml-auto text-[9px] text-muted-foreground/55 shrink-0">{date}</span>
      </div>

      {/* ── Corpo ─────────────────────────────────────────────────────── */}
      <div className="flex-1">

        {/* HERO — 1 vs 1 */}
        {is1v1 && (() => {
          const a = sideA[0];
          const b = sideB[0];
          const aWon = wonA;
          const bWon = wonB;
          return (
            <div className="px-4 py-4 flex items-start gap-3">
              {/* Jogador A */}
              <div className={`flex-1 flex flex-col items-center gap-1.5 min-w-0 ${!aWon && !draw ? "opacity-50" : ""}`}>
                <PlayerAvatar nickname={a.player.nickname} avatarUrl={a.player.avatarUrl} size="lg" />
                <p className="text-xs font-bold text-white truncate max-w-full text-center mt-0.5">
                  {a.player.nickname}
                </p>
                {aWon && (
                  <span className="text-[7px] font-black uppercase tracking-wider text-status-good bg-status-good/10 border border-status-good/20 px-2 py-0.5 rounded-full">
                    Venceu
                  </span>
                )}
                <div className="mt-1.5 space-y-1 text-center">
                  <p className="text-sm font-black text-white tabular-nums">{a.kills} / {a.deaths}</p>
                  <p className="text-[9px] text-muted-foreground/65">KD {kdRatio(a.kills, a.deaths)}</p>
                  <p className="text-[9px] text-muted-foreground/55">{Math.round(a.adr)} ADR</p>
                  <p className="text-[9px] font-bold text-accent-cyan/80">★ {a.rating.toFixed(2)}</p>
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center justify-center pt-7 shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-6 w-px bg-white/[0.06]" />
                  <span className="text-[9px] font-black text-muted-foreground/35 uppercase tracking-widest">vs</span>
                  <div className="h-6 w-px bg-white/[0.06]" />
                </div>
              </div>

              {/* Jogador B */}
              <div className={`flex-1 flex flex-col items-center gap-1.5 min-w-0 ${!bWon && !draw ? "opacity-50" : ""}`}>
                <PlayerAvatar nickname={b.player.nickname} avatarUrl={b.player.avatarUrl} size="lg" />
                <p className="text-xs font-bold text-white truncate max-w-full text-center mt-0.5">
                  {b.player.nickname}
                </p>
                {bWon && (
                  <span className="text-[7px] font-black uppercase tracking-wider text-status-good bg-status-good/10 border border-status-good/20 px-2 py-0.5 rounded-full">
                    Venceu
                  </span>
                )}
                <div className="mt-1.5 space-y-1 text-center">
                  <p className="text-sm font-black text-white tabular-nums">{b.kills} / {b.deaths}</p>
                  <p className="text-[9px] text-muted-foreground/65">KD {kdRatio(b.kills, b.deaths)}</p>
                  <p className="text-[9px] text-muted-foreground/55">{Math.round(b.adr)} ADR</p>
                  <p className="text-[9px] font-bold text-accent-cyan/80">★ {b.rating.toFixed(2)}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TABLE — múltiplos jogadores (ambos os lados) */}
        {hasConfrontation && !is1v1 && (
          <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
            {/* Lado A */}
            <div className="px-3 py-3 flex flex-col gap-2">
              <p className={`text-[8px] uppercase tracking-widest font-black leading-none ${wonA ? "text-status-good/85" : "text-muted-foreground/45"}`}>
                {wonA ? "✓ Vitória" : "Derrota"}
              </p>
              {sideA.map((ps) => (
                <PlayerRow key={ps.player.id} ps={ps} />
              ))}
            </div>
            {/* Lado B */}
            <div className="px-3 py-3 flex flex-col gap-2">
              <p className={`text-[8px] uppercase tracking-widest font-black leading-none ${wonB ? "text-status-good/85" : "text-muted-foreground/45"}`}>
                {wonB ? "✓ Vitória" : "Derrota"}
              </p>
              {sideB.map((ps) => (
                <PlayerRow key={ps.player.id} ps={ps} reverse />
              ))}
            </div>
          </div>
        )}

        {/* ALL SAME SIDE — todos no mesmo time */}
        {!hasConfrontation && (
          <div className="px-4 py-3 flex flex-col gap-2">
            <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55 leading-none mb-1">
              {(wonA && sideA.length > 0) || (wonB && sideB.length > 0) ? "✓ Vitória em equipe" : "Partida em equipe"}
            </p>
            {[...sideA, ...sideB].map((ps) => (
              <div key={ps.player.id} className="flex items-center gap-2">
                <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-white/90 truncate">{ps.player.nickname}</p>
                  <p className="text-[9px] text-muted-foreground/65 tabular-nums">{ps.kills}/{ps.deaths} · KD {kdRatio(ps.kills, ps.deaths)} · {Math.round(ps.adr)} ADR</p>
                </div>
                <span className="text-[9px] font-bold text-accent-cyan/80 tabular-nums shrink-0">{ps.rating.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: placar + link ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex items-center justify-between gap-3 mt-auto">
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-black tabular-nums ${wonA ? "text-status-good" : draw ? "text-muted-foreground/60" : "text-muted-foreground/40"}`}>
            {match.scoreTeamA}
          </span>
          <span className="text-[10px] text-muted-foreground/30 font-bold">×</span>
          <span className={`text-base font-black tabular-nums ${wonB ? "text-status-good" : draw ? "text-muted-foreground/60" : "text-muted-foreground/40"}`}>
            {match.scoreTeamB}
          </span>
          {draw && <span className="text-[9px] text-muted-foreground/50 ml-1">Empate</span>}
        </div>
        <Link
          href={`/matches/${match.id}`}
          className="text-[10px] text-primary/65 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0"
        >
          Ver detalhes
          <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── Carousel wrapper ─────────────────────────────────────────────────────────

interface Props {
  matches: RecentMatchCardData[];
}

export function ConfrontationsCarousel({ matches }: Props) {
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
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
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

      {/* Trilho */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {matches.map((match) => (
          <ConfrontationCard key={match.id} match={match} />
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {matches.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para partida ${i + 1}`}
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
