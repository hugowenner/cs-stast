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
      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2.5 transition-colors hover:bg-white/5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-semibold">
          {match.map.name.slice(0, 3).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{match.map.name}</p>
          <p className="text-muted-foreground truncate text-[11px] sm:text-xs">
            <span className="hidden sm:inline">{match.session.name} · </span>
            <span>{new Date(match.playedAt).toLocaleDateString("pt-BR")}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
          <span className={won && winningTeam === "A" ? "text-status-good" : "text-muted-foreground"}>
            {match.scoreTeamA}
          </span>
          <span className="text-muted-foreground font-medium">:</span>
          <span className={won && winningTeam === "B" ? "text-status-good" : "text-muted-foreground"}>
            {match.scoreTeamB}
          </span>
        </div>

        {topPlayer && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground border border-white/5 bg-white/[0.02] rounded-lg px-2 py-1">
            <PlayerAvatar
              nickname={topPlayer.player.nickname}
              avatarUrl={topPlayer.player.avatarUrl}
              size="sm"
            />
            <span className="max-w-[50px] truncate font-bold text-white">{topPlayer.player.nickname}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
