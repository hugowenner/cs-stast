import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { MatchTypeBadge } from "@/components/matches/match-type-badge";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import { cn } from "@/lib/utils";

export interface MatchRowData {
  id: string;
  playedAt: Date;
  scoreTeamA: number;
  scoreTeamB: number;
  map: { name: string };
  session: { name: string };
  trackedPlayersCount: number;
  playerStats: {
    rating: number;
    player: { id: string; nickname: string; avatarUrl: string | null };
  }[];
}

export function MatchRow({ match }: { match: MatchRowData }) {
  const won = match.scoreTeamA !== match.scoreTeamB;
  const winningTeam = match.scoreTeamA > match.scoreTeamB ? "A" : "B";
  const topPlayer = [...match.playerStats].sort((a, b) => b.rating - a.rating)[0];
  const cleanMap = match.map.name.replace(/^de_/i, "").toUpperCase();
  const mapImg = getCleanMapImage(match.map.name);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="surface-panel rounded-sm border border-border/40 px-4 py-3 flex items-center justify-between gap-3 hover:border-primary/50 hover:bg-surface-elevated/40 transition-all duration-150 group"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-9 shrink-0 rounded-xs overflow-hidden border border-border/60 bg-surface-deck flex items-center justify-center">
          {mapImg ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapImg}
                alt={cleanMap}
                className="w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/15" />
            </>
          ) : (
            <span className="text-primary text-[11px] font-mono font-black">{cleanMap.slice(0, 3)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs sm:text-sm font-mono font-black text-white group-hover:text-primary transition-colors tracking-tight">
            {cleanMap}
          </p>
          <p className="text-white/70 truncate text-[11px] font-mono font-medium">
            <span className="hidden sm:inline">{match.session.name} · </span>
            <span>
              {new Date(match.playedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block">
          <MatchTypeBadge trackedPlayersCount={match.trackedPlayersCount} />
        </div>

        {/* Placar */}
        <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black tabular-nums">
          <span className={won && winningTeam === "A" ? "text-white" : "text-white/60"}>
            {match.scoreTeamA}
          </span>
          <span className="text-white/40 font-bold">:</span>
          <span className={won && winningTeam === "B" ? "text-white" : "text-white/60"}>
            {match.scoreTeamB}
          </span>
        </div>

        {topPlayer && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/80 border border-border/40 bg-surface-deck rounded-xs px-2 py-1">
            <PlayerAvatar
              nickname={topPlayer.player.nickname}
              avatarUrl={topPlayer.player.avatarUrl}
              size="sm"
            />
            <span className="max-w-[60px] truncate font-bold text-white">
              {topPlayer.player.nickname}
            </span>
            <span className="text-gold font-black tabular-nums">
              {topPlayer.rating.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
