import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { StatCell } from "./stat-cell";
import type { PlayerMatchDTO } from "@/server/dtos/matchDetails.dto";

export function PlayerRow({ player }: { player: PlayerMatchDTO }) {
  const eloColorClass =
    player.eloChange > 0
      ? "text-status-good"
      : player.eloChange < 0
      ? "text-status-critical"
      : "text-muted-foreground";

  return (
    <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${player.isTracked ? "bg-primary/5" : ""}`}>
      {/* Jogador avatar e nickname */}
      <td className="px-4 py-3 text-left">
        <Link href={`/players/${player.id}`} className="flex items-center gap-3 group">
          <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className={`font-semibold text-sm truncate group-hover:text-primary transition-colors ${player.isTracked ? "text-accent-cyan" : "text-white"}`}>
              {player.nickname}
            </p>
            {player.isTracked && (
              <span className="text-[9px] font-bold text-accent-cyan bg-accent-cyan/15 rounded px-1.5 py-0.5 uppercase tracking-wider block w-max mt-0.5">
                Watchlist
              </span>
            )}
          </div>
        </Link>
      </td>

      {/* ELO */}
      <StatCell className={eloColorClass}>
        {player.isTracked ? (
          <span className="font-bold">
            {player.eloChange >= 0 ? "+" : ""}
            {player.eloChange}
          </span>
        ) : (
          <span className="opacity-40 font-normal">—</span>
        )}
      </StatCell>

      {/* Rating */}
      <StatCell align="center">
        <RatingBadge rating={player.rating} />
      </StatCell>

      {/* ADR */}
      <StatCell>{player.adr.toFixed(1)}</StatCell>

      {/* KAST */}
      <StatCell>{player.kast.toFixed(1)}%</StatCell>

      {/* Impact */}
      <StatCell>{player.impact.toFixed(2)}</StatCell>

      {/* K / D / A */}
      <StatCell className="text-white font-bold">{player.kills}</StatCell>
      <StatCell className="text-muted-foreground">{player.deaths}</StatCell>
      <StatCell className="text-muted-foreground">{player.assists}</StatCell>

      {/* HS % */}
      <StatCell>{player.hsPercentage.toFixed(1)}%</StatCell>
    </tr>
  );
}
