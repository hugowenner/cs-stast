"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { MatchTypeBadge } from "@/components/matches/match-type-badge";
import Link from "next/link";
import type { RecentMatchCardData } from "./recent-matches-carousel";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

const POSITION_LABELS = ["🥇", "🥈", "🥉", "4º", "5º", "6º", "7º", "8º", "9º", "10º"];

type PS = RecentMatchCardData["playerStats"][number];

// ─── PlayerRow ─────────────────────────────────────────────────────────────────
// Rating is the dominant stat. Medal shows rank within the team.

function PlayerRow({ ps, position, isMvp }: { ps: PS; position: number; isMvp: boolean }) {
  const posLabel = POSITION_LABELS[position] ?? `${position + 1}º`;
  const isTopThree = position < 3;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-[5px] rounded-lg relative z-10",
        isMvp
          ? "bg-accent-gold/[0.05] border border-accent-gold/[0.12]"
          : "hover:bg-white/[0.025] transition-colors",
      )}
    >
      {/* Position medal */}
      <span
        className={cn(
          "shrink-0 w-4 text-center leading-none select-none",
          isTopThree ? "text-[11px] [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]" : "text-[9px] font-bold text-white/40 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]",
        )}
      >
        {posLabel}
      </span>

      {/* Avatar */}
      <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />

      {/* Name + secondary stats */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[10px] font-bold text-white truncate leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            {ps.player.nickname}
          </p>
          {isMvp && (
            <span className="shrink-0 text-[9px] leading-none select-none">🏆</span>
          )}
        </div>
        <p className="text-[8px] text-white/70 tabular-nums leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          {ps.kills}/{ps.deaths} · {Math.round(ps.adr)} ADR
        </p>
      </div>

      {/* Rating — protagonist */}
      <div className="shrink-0 text-right min-w-[28px]">
        <p className={cn(
          "text-xs font-black tabular-nums leading-none [text-shadow:0_1px_6px_rgba(0,0,0,0.95)]",
          isMvp ? "text-accent-gold" : "text-white",
        )}>
          {ps.rating.toFixed(2)}
        </p>
        <p className="text-[7px] text-white/40 leading-none mt-0.5 uppercase tracking-wider [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          rtg
        </p>
      </div>
    </div>
  );
}

// ─── ConfrontationCard ────────────────────────────────────────────────────────

function ConfrontationCard({ match }: { match: RecentMatchCardData }) {
  const allSorted = [...match.playerStats].sort((a, b) => b.rating - a.rating);
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
  const allSameSide = !hasConfrontation;

  const mvpId = allSorted[0]?.player.id ?? null;
  const date = DATE_FMT.format(new Date(match.playedAt));

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

function getMapImage(mapName: string): string | null {
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGES[norm] ?? null;
}

// For all-same-side matches, determine their result
  const monitoredTeam = sideA.length > 0 ? "A" : "B";
  const monitoredWon = allSameSide && (monitoredTeam === "A" ? wonA : wonB);
  const monitoredDraw = allSameSide && draw;
  const monitoredLost = allSameSide && !monitoredWon && !monitoredDraw;

  // Card border reflects result (only when we know which team is "ours")
  const cardBorderClass = allSameSide
    ? monitoredWon
      ? "border-status-good/[0.25]"
      : monitoredLost
      ? "border-status-critical/[0.18]"
      : "border-white/[0.08]"
    : "border-white/[0.08]";

  const mapImg = getMapImage(match.map.name);

  return (
    <div
      data-card
      className={cn(
        "glass-panel rounded-2xl border overflow-hidden flex-shrink-0 flex flex-col relative group",
        "w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)]",
        "hover:shadow-xl hover:shadow-black/[0.28] hover:brightness-105 transition-all duration-200",
        cardBorderClass,
      )}
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Background Map Image Overlay */}
      {mapImg && (
        <>
          <img
            src={mapImg}
            alt={match.map.name}
            className="bg-map-texture"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="bg-texture-overlay" />
        </>
      )}

      {/* ── HEADER: map • type • date — compact single line ───── */}
      <div className="px-4 py-2 border-b border-white/[0.05] flex items-center gap-2 relative z-10">
        <span className="text-[10px] font-black text-white uppercase tracking-wide truncate [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
          {match.map.name}
        </span>
        <span className="text-muted-foreground/20 text-[9px] shrink-0">•</span>
        <span className="shrink-0">
          <MatchTypeBadge trackedPlayersCount={match.trackedPlayersCount} />
        </span>
        <span className="ml-auto text-[9px] text-white/80 shrink-0 font-semibold tabular-nums [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
          {date}
        </span>
      </div>

      {/* ── SCORE HERO ────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between gap-3 relative z-10">
        {/* Score — largest element in card */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[22px] font-black tabular-nums leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.95)]",
              wonA ? "text-status-good" : draw ? "text-white/60" : "text-white/30",
            )}
          >
            {match.scoreTeamA}
          </span>
          <span className="text-[11px] text-white/40 font-black [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">×</span>
          <span
            className={cn(
              "text-[22px] font-black tabular-nums leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.95)]",
              wonB ? "text-status-good" : draw ? "text-white/60" : "text-white/30",
            )}
          >
            {match.scoreTeamB}
          </span>
        </div>

        {/* Result badge */}
        {allSameSide && (
          <span
            className={cn(
              "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
              monitoredWon
                ? "text-status-good bg-status-good/[0.08] border-status-good/[0.2]"
                : monitoredDraw
                ? "text-white/60 bg-white/[0.02] border-white/[0.06]"
                : "text-status-critical bg-status-critical/[0.07] border-status-critical/[0.15]",
            )}
          >
            {monitoredWon ? "Vitória" : monitoredDraw ? "Empate" : "Derrota"}
          </span>
        )}
        {hasConfrontation && !is1v1 && (
          <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider shrink-0 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
            5v5
          </span>
        )}
      </div>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <div className="flex-1 px-3 py-2 flex flex-col relative z-10">

        {/* 1v1 layout */}
        {is1v1 && (() => {
          const a = sideA[0];
          const b = sideB[0];
          return (
            <div className="flex items-stretch gap-3 py-1">
              {/* Player A */}
              <div
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl",
                  !wonA && !draw ? "opacity-40" : "",
                )}
              >
                <PlayerAvatar nickname={a.player.nickname} avatarUrl={a.player.avatarUrl} size="lg" />
                <p className="text-[10px] font-bold text-white truncate max-w-full text-center leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                  {a.player.nickname}
                </p>
                {a.player.id === mvpId && (
                  <span className="text-[9px] text-accent-gold font-black leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">🏆 MVP</span>
                )}
                <div className="mt-1.5 text-center space-y-0.5">
                  <p className="text-sm font-black text-white tabular-nums leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.95)]">
                    {a.rating.toFixed(2)}
                  </p>
                  <p className="text-[7px] text-white/50 uppercase tracking-wider leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                    rating
                  </p>
                  <p className="text-[9px] font-semibold text-white/80 tabular-nums mt-1.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                    {a.kills}/{a.deaths}
                  </p>
                  <p className="text-[8px] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{Math.round(a.adr)} ADR</p>
                </div>
              </div>

              {/* VS divider */}
              <div className="flex flex-col items-center justify-center shrink-0 gap-1">
                <div className="flex-1 w-px bg-white/[0.05]" />
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                  vs
                </span>
                <div className="flex-1 w-px bg-white/[0.05]" />
              </div>

              {/* Player B */}
              <div
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl",
                  !wonB && !draw ? "opacity-40" : "",
                )}
              >
                <PlayerAvatar nickname={b.player.nickname} avatarUrl={b.player.avatarUrl} size="lg" />
                <p className="text-[10px] font-bold text-white truncate max-w-full text-center leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                  {b.player.nickname}
                </p>
                {b.player.id === mvpId && (
                  <span className="text-[9px] text-accent-gold font-black leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">🏆 MVP</span>
                )}
                <div className="mt-1.5 text-center space-y-0.5">
                  <p className="text-sm font-black text-white tabular-nums leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.95)]">
                    {b.rating.toFixed(2)}
                  </p>
                  <p className="text-[7px] text-white/50 uppercase tracking-wider leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                    rating
                  </p>
                  <p className="text-[9px] font-semibold text-white/80 tabular-nums mt-1.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                    {b.kills}/{b.deaths}
                  </p>
                  <p className="text-[8px] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">{Math.round(b.adr)} ADR</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5v5 confrontation layout */}
        {hasConfrontation && !is1v1 && (
          <div className="grid grid-cols-2 gap-x-1">
            {/* Side A */}
            <div className="flex flex-col gap-0.5">
              <p
                className={cn(
                  "text-[7px] uppercase tracking-widest font-black px-2 pb-1 leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]",
                  wonA ? "text-status-good/95" : "text-white/40",
                )}
              >
                {wonA ? "✓ Vitória" : draw ? "Empate" : "Derrota"}
              </p>
              {sideA.map((ps, i) => (
                <PlayerRow key={ps.player.id} ps={ps} position={i} isMvp={ps.player.id === mvpId} />
              ))}
            </div>
            {/* Side B */}
            <div className="flex flex-col gap-0.5 border-l border-white/[0.04] pl-1">
              <p
                className={cn(
                  "text-[7px] uppercase tracking-widest font-black px-2 pb-1 leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]",
                  wonB ? "text-status-good/95" : "text-white/40",
                )}
              >
                {wonB ? "✓ Vitória" : draw ? "Empate" : "Derrota"}
              </p>
              {sideB.map((ps, i) => (
                <PlayerRow key={ps.player.id} ps={ps} position={i} isMvp={ps.player.id === mvpId} />
              ))}
            </div>
          </div>
        )}

        {/* All same side layout */}
        {allSameSide && (
          <div className="flex flex-col gap-0.5">
            {[...sideA, ...sideB].map((ps, i) => (
              <PlayerRow key={ps.player.id} ps={ps} position={i} isMvp={ps.player.id === mvpId} />
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-end relative z-10">
        <Link
          href={`/matches/${match.id}`}
          className="text-[10px] text-primary/50 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group/btn"
        >
          Ver detalhes
          <ArrowRight className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
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
        <span className="text-[10px] text-muted-foreground/50 font-semibold tabular-nums">
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
