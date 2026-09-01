import Link from "next/link";
import { ChevronRight, MapPin, Trophy, Swords, Clock } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { cn } from "@/lib/utils";
import type { SimpleSessionSummary } from "@/server/analytics/session.analytics";

interface SessionCardProps {
  session: SimpleSessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  // format date: e.g. "26 Julho 2026", "Sábado"
  const sDate = new Date(session.date);
  const dayOfWeek = sDate.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" })
    .replace(/^\w/, (c) => c.toUpperCase());
  const dateFormatted = sDate.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const moodMeta = getSessionMoodMeta(session.mood);

  // Participants avatars
  const maxAvatars = 5;
  const displayedPlayers = session.players.slice(0, maxAvatars);
  const remainingCount = session.players.length - maxAvatars;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="glass-panel border border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.12] transition-all duration-200 rounded-2xl p-5 flex flex-col gap-4 group block relative overflow-hidden"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.04] pb-3">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
            {dayOfWeek}
          </span>
          <h4 className="text-base font-black text-white leading-tight mt-0.5">
            {dateFormatted}
          </h4>
        </div>
        
        {/* Session Mood Badge */}
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider w-max",
          moodMeta.style
        )}>
          {moodMeta.label}
        </span>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-1">
        {/* Partidas */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.05] text-muted-foreground/45">
            <Swords className="size-4" />
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none">Partidas</p>
            <p className="text-xs font-black text-white mt-1 tabular-nums leading-none">
              {session.totalMatches} {session.totalMatches === 1 ? "partida" : "partidas"}
            </p>
          </div>
        </div>

        {/* Duração */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.05] text-muted-foreground/45">
            <Clock className="size-4" />
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none">Duração</p>
            <p className="text-xs font-black text-white mt-1 tabular-nums leading-none">
              {session.durationText}
            </p>
          </div>
        </div>

        {/* MVP */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning/80">
            <Trophy className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-wider font-bold text-status-warning/75 leading-none">MVP</p>
            <p className="text-xs font-black text-white mt-1 truncate leading-none">
              {session.mvpName} · <span className="text-status-warning font-black tabular-nums">{session.mvpRating.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Mapas */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan/80">
            <MapPin className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-wider font-bold text-accent-cyan/75 leading-none">Mapas</p>
            <p className="text-xs font-black text-white mt-1 truncate leading-none">
              {session.mapNames.length > 0 ? session.mapNames.join(" / ") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Footer of card: Participants & Link button */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 mt-1">
        {/* Avatars */}
        <div className="flex items-center gap-2">
          <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/45 mr-1 leading-none">
            Participantes:
          </p>
          <div className="flex -space-x-1.5 overflow-hidden">
            {displayedPlayers.map((player) => (
              <div
                key={player.id}
                className="inline-block ring-2 ring-[#0a0a0c] rounded-full"
                title={player.nickname}
              >
                <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="sm" />
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <span className="text-[9px] font-bold text-muted-foreground/60 ml-1 leading-none">
              +{remainingCount}
            </span>
          )}
        </div>

        {/* Action arrow */}
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.06] text-muted-foreground/40 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/30 transition-all">
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function getSessionMoodMeta(mood: SimpleSessionSummary["mood"]) {
  switch (mood) {
    case "excellent":
      return {
        label: "Sessão excelente",
        style: "bg-status-warning/10 text-status-warning border-status-warning/20 shadow-[0_0_10px_rgba(245,158,11,0.04)]",
      };
    case "good":
      return {
        label: "Em evolução",
        style: "bg-status-good/10 text-status-good border-status-good/20",
      };
    case "stable":
      return {
        label: "Estável",
        style: "bg-white/[0.03] text-muted-foreground/75 border-white/[0.06]",
      };
    case "difficult":
    case "disaster":
    default:
      return {
        label: "Dia difícil",
        style: "bg-status-critical/10 text-status-critical border-status-critical/20",
      };
  }
}
