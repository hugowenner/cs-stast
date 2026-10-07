"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Award } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { MatchTypeBadge } from "@/components/matches/match-type-badge";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import Link from "next/link";
import type { RecentMatchCardData } from "./recent-matches-carousel";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

type PS = RecentMatchCardData["playerStats"][number];

// ─── PlayerRow ─────────────────────────────────────────────────────────────────
function PlayerRow({ ps, position, isMvp }: { ps: PS; position: number; isMvp: boolean }) {
  const isTop1 = position === 0;
  const isTopThree = position < 3;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-xs transition-colors relative z-10",
        isMvp
          ? "bg-gold/[0.08] border border-gold/25"
          : "hover:bg-surface-deck/60"
      )}
    >
      {/* Position rank */}
      <span
        className={cn(
          "shrink-0 w-4 font-mono text-[10px] font-bold text-center leading-none tabular-nums",
          isTop1 ? "text-gold font-black" : isTopThree ? "text-white font-bold" : "text-white/40"
        )}
      >
        #{position + 1}
      </span>

      {/* Avatar */}
      <PlayerAvatar nickname={ps.player.nickname} avatarUrl={ps.player.avatarUrl} size="sm" />

      {/* Name + secondary stats */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-bold text-white truncate leading-tight">
            {ps.player.nickname}
          </p>
          {isMvp && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[8px] font-mono font-black text-gold uppercase px-1 py-0.2 bg-gold/15 border border-gold/30 rounded-2xs">
              <Award className="size-2.5" />
              MVP
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-white/80 font-medium tabular-nums leading-tight mt-0.5">
          {ps.kills}/{ps.deaths} · {Math.round(ps.adr)} ADR
        </p>
      </div>

      {/* Rating — protagonist */}
      <div className="shrink-0 text-right min-w-[32px]">
        <p className={cn(
          "text-xs font-mono font-black tabular-nums leading-none",
          isMvp ? "text-gold" : "text-white"
        )}>
          {ps.rating.toFixed(2)}
        </p>
        <p className="text-[8px] font-mono text-white/40 font-semibold leading-none mt-0.5 uppercase tracking-wider">
          RTG
        </p>
      </div>
    </div>
  );
}

// ─── ConfrontationCard ────────────────────────────────────────────────────────

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

  // For all-same-side matches, determine their result
  const monitoredTeam = sideA.length > 0 ? "A" : "B";
  const monitoredWon = allSameSide && (monitoredTeam === "A" ? wonA : wonB);
  const monitoredDraw = allSameSide && draw;
  const monitoredLost = allSameSide && !monitoredWon && !monitoredDraw;

  const cardBorderClass = allSameSide
    ? monitoredWon
      ? "border-status-good/40 hover:border-status-good/60"
      : monitoredLost
      ? "border-status-critical/30 hover:border-status-critical/50"
      : "border-border/60 hover:border-border/90"
    : "border-border/60 hover:border-border/90";

  const mapImg = getMapImage(match.map.name);

  return (
    <div
      data-card
      className={cn(
        "bg-surface-panel rounded-sm border overflow-hidden flex-shrink-0 flex flex-col relative group transition-all duration-200 shadow-sm",
        "w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)]",
        cardBorderClass,
      )}
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Background Map Texture with vivid recognition (55-65% presence) */}
      {mapImg && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapImg}
            alt=""
            className="w-full h-full object-cover object-center opacity-55 group-hover:opacity-75 group-hover:scale-105 transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          {/* Calibrated tactical scrim: keeps map vivid in header/score while ensuring 100% contrast over player stats */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-panel via-surface-panel/80 via-40% to-surface-panel/30" />
        </div>
      )}

      {/* ── HEADER: map • type • date ───── */}
      <div className="px-3.5 py-2.5 border-b border-border/40 bg-surface-deck/80 backdrop-blur-xs flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-mono font-black text-white uppercase tracking-wider truncate">
            {match.map.name}
          </span>
          <span className="shrink-0">
            <MatchTypeBadge trackedPlayersCount={match.trackedPlayersCount} />
          </span>
        </div>
        <span className="text-[10px] font-mono font-medium text-white/70 shrink-0 tabular-nums">
          {date}
        </span>
      </div>

      {/* ── SCORE HERO ────────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 border-b border-border/30 flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-2xl font-mono font-black tabular-nums leading-none",
              wonA ? "text-white" : draw ? "text-white" : "text-white/60"
            )}
          >
            {match.scoreTeamA}
          </span>
          <span className="text-xs font-mono text-white/40 font-bold">×</span>
          <span
            className={cn(
              "text-2xl font-mono font-black tabular-nums leading-none",
              wonB ? "text-white" : draw ? "text-white" : "text-white/60"
            )}
          >
            {match.scoreTeamB}
          </span>
        </div>

        {/* Result badge */}
        {allSameSide && (
          <TacticalBadge
            label={monitoredWon ? "VITÓRIA" : monitoredDraw ? "EMPATE" : "DERROTA"}
            variant={monitoredWon ? "good" : monitoredDraw ? "neutral" : "critical"}
            size="xs"
          />
        )}
        {hasConfrontation && !is1v1 && (
          <TacticalBadge label="5v5" variant="primary" size="xs" />
        )}
      </div>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <div className="flex-1 p-2.5 flex flex-col relative z-10">
        {/* 1v1 layout */}
        {is1v1 && (() => {
          const a = sideA[0];
          const b = sideB[0];
          return (
            <div className="flex items-stretch gap-2 py-1">
              {/* Player A */}
              <div className={cn("flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xs bg-surface-deck/60", !wonA && !draw ? "opacity-75" : "")}>
                <PlayerAvatar nickname={a.player.nickname} avatarUrl={a.player.avatarUrl} size="md" />
                <p className="text-xs font-bold text-white truncate max-w-full text-center">
                  {a.player.nickname}
                </p>
                {a.player.id === mvpId && (
                  <TacticalBadge label="MVP" variant="gold" size="xs" />
                )}
                <div className="mt-1 text-center font-mono">
                  <p className="text-sm font-black text-white tabular-nums">
                    {a.rating.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-white/50 uppercase font-semibold">rating</p>
                  <p className="text-[10px] text-white/80 font-medium tabular-nums mt-1">
                    {a.kills}/{a.deaths} · {Math.round(a.adr)} ADR
                  </p>
                </div>
              </div>

              {/* VS divider */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-mono font-black text-white/40 uppercase">VS</span>
              </div>

              {/* Player B */}
              <div className={cn("flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xs bg-surface-deck/60", !wonB && !draw ? "opacity-75" : "")}>
                <PlayerAvatar nickname={b.player.nickname} avatarUrl={b.player.avatarUrl} size="md" />
                <p className="text-xs font-bold text-white truncate max-w-full text-center">
                  {b.player.nickname}
                </p>
                {b.player.id === mvpId && (
                  <TacticalBadge label="MVP" variant="gold" size="xs" />
                )}
                <div className="mt-1 text-center font-mono">
                  <p className="text-sm font-black text-white tabular-nums">
                    {b.rating.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-white/50 uppercase font-semibold">rating</p>
                  <p className="text-[10px] text-white/80 font-medium tabular-nums mt-1">
                    {b.kills}/{b.deaths} · {Math.round(b.adr)} ADR
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5v5 confrontation layout */}
        {hasConfrontation && !is1v1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Side A */}
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-0.5 mb-0.5">
                <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider", wonA ? "text-status-good" : draw ? "text-white/80" : "text-white/50")}>
                  {wonA ? "Vitória" : draw ? "Empate" : "Derrota"}
                </span>
              </div>
              {sideA.map((ps, i) => (
                <PlayerRow key={ps.player.id} ps={ps} position={i} isMvp={ps.player.id === mvpId} />
              ))}
            </div>

            {/* Side B */}
            <div className="flex flex-col gap-0.5 border-t sm:border-t-0 sm:border-l border-border/30 pt-2 sm:pt-0 sm:pl-2">
              <div className="px-2 py-0.5 mb-0.5">
                <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider", wonB ? "text-status-good" : draw ? "text-white/80" : "text-white/50")}>
                  {wonB ? "Vitória" : draw ? "Empate" : "Derrota"}
                </span>
              </div>
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
      <div className="px-3.5 py-2 border-t border-border/30 bg-surface-deck/30 flex items-center justify-end relative z-10">
        <Link
          href={`/matches/${match.id}`}
          className="text-xs font-mono font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group/btn"
        >
          <span>Ver detalhes</span>
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
        <span className="text-[10px] font-mono text-muted-foreground/60 font-semibold tabular-nums">
          {currentIndex + 1} de {matches.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Confronto anterior"
            className="flex items-center justify-center size-7 rounded-xs border border-border/50 bg-surface-deck text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Próximo confronto"
            className="flex items-center justify-center size-7 rounded-xs border border-border/50 bg-surface-deck text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all"
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
      <div className="flex items-center justify-center gap-1 pt-1">
        {matches.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para partida ${i + 1}`}
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
