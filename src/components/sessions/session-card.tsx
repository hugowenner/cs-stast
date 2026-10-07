import Link from "next/link";
import { ChevronRight, Trophy, Swords, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import { cn } from "@/lib/utils";
import type { SimpleSessionSummary } from "@/server/analytics/session.analytics";

interface SessionCardProps {
  session: SimpleSessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  const sDate = new Date(session.date);
  const dayOfWeek = sDate.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .toUpperCase()
    .replace(".", "");
  const dateFormatted = sDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).toUpperCase();

  const isPositiveElo = session.eloChangeGroup > 0;
  const isNegativeElo = session.eloChangeGroup < 0;

  const outcomeVariant =
    session.wins > session.losses
      ? "win"
      : session.losses > session.wins
      ? "loss"
      : "draw";

  const outcomeLabel =
    session.wins > session.losses
      ? "SALDO POSITIVO"
      : session.losses > session.wins
      ? "SALDO NEGATIVO"
      : "EQUILIBRADO";

  const displayedPlayers = session.players.slice(0, 5);
  const remainingCount = session.players.length - 5;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="surface-panel rounded-sm border border-border/40 hover:border-primary/50 hover:bg-surface-elevated/40 transition-all duration-150 p-4 sm:p-5 flex flex-col gap-4 group block relative overflow-hidden"
    >
      {/* Top Header: Date, Context & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="font-black text-foreground">{dayOfWeek}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground/80 font-bold">{dateFormatted}</span>
          </div>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <span className="text-xs font-mono text-muted-foreground/70 truncate max-w-[200px]">
            {session.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {session.eloChangeGroup !== 0 && (
            <span
              className={cn(
                "font-mono text-xs font-black px-2 py-0.5 rounded-xs border flex items-center gap-1",
                isPositiveElo
                  ? "text-status-good border-status-good/30 bg-status-good/10"
                  : "text-status-critical border-status-critical/30 bg-status-critical/10"
              )}
            >
              {isPositiveElo ? (
                <TrendingUp className="size-3 shrink-0" />
              ) : (
                <TrendingDown className="size-3 shrink-0" />
              )}
              {isPositiveElo ? `+${session.eloChangeGroup}` : session.eloChangeGroup} ELO
            </span>
          )}

          <TacticalBadge
            variant={outcomeVariant === "win" ? "good" : outcomeVariant === "loss" ? "critical" : "neutral"}
            size="sm"
          >
            {outcomeLabel}
          </TacticalBadge>
        </div>
      </div>

      {/* Main Row Telemetry: Scoreboard, Metrics, MVP, Maps */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-4 items-center">
        {/* Score & Record (cols 1-3) */}
        <div className="md:col-span-3 flex flex-col justify-center">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
            PLACAR DA NOITE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl sm:text-3xl font-black text-status-good tabular-nums">
              {session.wins}V
            </span>
            <span className="font-mono text-xl font-bold text-muted-foreground/40">
              -
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-status-critical tabular-nums">
              {session.losses}D
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground/70 ml-1">
              ({session.winrate.toFixed(0)}%)
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground/60 mt-0.5 flex items-center gap-1">
            <Swords className="size-3 text-primary" />
            {session.totalMatches} {session.totalMatches === 1 ? "partida" : "partidas"} · {session.durationText}
          </span>
        </div>

        {/* Tactical Rating & ADR (cols 4-6) */}
        <div className="md:col-span-3 flex flex-col justify-center border-l-0 md:border-l border-border/30 md:pl-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
            RATING & IMPACTO MÉDIO
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-mono text-xl sm:text-2xl font-black tabular-nums",
                  session.ratingAvg >= 1.15
                    ? "text-status-good"
                    : session.ratingAvg < 0.95
                    ? "text-status-critical"
                    : "text-foreground"
                )}
              >
                {session.ratingAvg.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">Rating</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-foreground tabular-nums">
                {session.adrAvg.toFixed(0)}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">ADR</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">
            Precisão HS: <strong className="text-foreground">{session.hsPercentage.toFixed(1)}%</strong>
          </span>
        </div>

        {/* MVP Spotlight (cols 7-9) */}
        <div className="col-span-2 md:col-span-3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
            <Trophy className="size-3 text-accent-gold" />
            MVP DA SESSÃO
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-foreground truncate max-w-[140px]">
              {session.mvpName || "—"}
            </span>
            {session.mvpRating > 0 && (
              <span className="font-mono text-xs font-black text-accent-gold px-1.5 py-0.5 rounded-xs bg-accent-gold/10 border border-accent-gold/20 tabular-nums">
                {session.mvpRating.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 overflow-x-auto scrollbar-none">
            {session.mapNames.map((mapName) => (
              <span
                key={mapName}
                className="text-[10px] font-mono font-bold text-accent-cyan/90 px-1.5 py-0.5 rounded-xs bg-accent-cyan/10 border border-accent-cyan/20 shrink-0"
              >
                {mapName.replace(/^de_/i, "").toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Lineup & Action CTA (cols 10-12) */}
        <div className="col-span-2 md:col-span-3 flex items-center justify-between border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              OPERADORES ({session.players.length})
            </span>
            <div className="flex -space-x-1.5 overflow-hidden py-0.5">
              {displayedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="inline-block ring-2 ring-background rounded-full shrink-0"
                  title={player.nickname}
                >
                  <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="sm" />
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="flex size-6 items-center justify-center rounded-full bg-surface-deck border border-border/60 text-[9px] font-mono font-bold text-muted-foreground shrink-0">
                  +{remainingCount}
                </div>
              )}
            </div>
          </div>

          <span className="flex items-center gap-1 text-xs font-mono font-bold text-primary group-hover:translate-x-1 transition-transform">
            <span className="hidden lg:inline">DETALHES</span>
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
