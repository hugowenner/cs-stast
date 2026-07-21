import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";

export interface MatchRowData {
  id: string;
  playedAt: Date;
  scoreTeamA: number;
  scoreTeamB: number;
  map: { name: string };
  session: { name: string };
  playerStats: {
    rating: number;
    player: { id: string; nickname: string; avatarUrl: string | null };
  }[];
}

export function MatchRow({ match }: { match: MatchRowData }) {
  const won = match.scoreTeamA !== match.scoreTeamB;
  const winningTeam = match.scoreTeamA > match.scoreTeamB ? "A" : "B";
  const topPlayer = [...match.playerStats].sort((a, b) => b.rating - a.rating)[0];

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 px-4 py-3 transition-colors hover:bg-white/5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-semibold">
          {match.map.name.slice(0, 3).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{match.map.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {match.session.name} · {match.playedAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold tabular-nums">
        <span className={won && winningTeam === "A" ? "text-status-good" : "text-muted-foreground"}>
          {match.scoreTeamA}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className={won && winningTeam === "B" ? "text-status-good" : "text-muted-foreground"}>
          {match.scoreTeamB}
        </span>
      </div>

      {topPlayer && (
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <PlayerAvatar
            nickname={topPlayer.player.nickname}
            avatarUrl={topPlayer.player.avatarUrl}
            size="sm"
          />
          <span className="text-muted-foreground text-xs">{topPlayer.player.nickname}</span>
        </div>
      )}
    </Link>
  );
}
