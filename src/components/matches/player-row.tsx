import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { StatCell } from "./stat-cell";
import { cn } from "@/lib/utils";
import type { PlayerMatchDTO } from "@/server/dtos/matchDetails.dto";

export function PlayerRow({ player }: { player: PlayerMatchDTO }) {
  const eloColorClass =
    player.eloChange > 0
      ? "text-status-good"
      : player.eloChange < 0
      ? "text-status-critical"
      : "text-muted-foreground";

  return (
    <tr
      className={cn(
        "hover:bg-surface-elevated/40 transition-colors",
        player.isTracked ? "bg-primary/[0.03]" : ""
      )}
    >
      {/* Jogador avatar e nickname */}
      <td
        className={cn(
          "sticky left-0 z-20 px-3.5 py-2.5 text-left border-r border-border/40 min-w-[130px] sm:min-w-[160px]",
          player.isTracked ? "bg-surface-elevated" : "bg-surface-panel"
        )}
      >
        <Link href={`/players/${player.id}`} className="flex items-center gap-2.5 group">
          <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p
              className={cn(
                "font-bold text-xs truncate group-hover:text-primary transition-colors",
                player.isTracked ? "text-primary" : "text-foreground"
              )}
            >
              {player.nickname}
            </p>
            {player.isTracked && (
              <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 rounded-xs px-1 py-0.2 uppercase tracking-wider block w-max">
                WATCHLIST
              </span>
            )}
          </div>
        </Link>
      </td>

      {/* ELO */}
      <StatCell className={eloColorClass}>
        {player.isTracked ? (
          <span className="font-mono font-black tabular-nums">
            {player.eloChange >= 0 ? "+" : ""}
            {player.eloChange}
          </span>
        ) : (
          <span className="opacity-30 font-normal font-mono">—</span>
        )}
      </StatCell>

      {/* Rating */}
      <StatCell align="center">
        <RatingBadge rating={player.rating} />
      </StatCell>

      {/* ADR */}
      <StatCell className="font-mono tabular-nums">{player.adr.toFixed(1)}</StatCell>

      {/* KAST */}
      <StatCell className="font-mono tabular-nums">{player.kast.toFixed(1)}%</StatCell>

      {/* Impact */}
      <StatCell className="font-mono tabular-nums">{player.impact.toFixed(2)}</StatCell>

      {/* K / D / A */}
      <StatCell className="text-foreground font-mono font-bold tabular-nums">{player.kills}</StatCell>
      <StatCell className="text-muted-foreground font-mono tabular-nums">{player.deaths}</StatCell>
      <StatCell className="text-muted-foreground font-mono tabular-nums">{player.assists}</StatCell>

      {/* HS % */}
      <StatCell className="font-mono tabular-nums text-muted-foreground">{player.hsPercentage.toFixed(1)}%</StatCell>
    </tr>
  );
}
