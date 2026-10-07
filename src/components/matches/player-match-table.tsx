import { PlayerRow } from "./player-row";
import { calculateTeamAverages } from "@/server/analytics/team.analytics";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type { PlayerMatchDTO } from "@/server/dtos/matchDetails.dto";

export function PlayerMatchTable({
  side,
  score,
  players,
}: {
  side: string;
  score: number;
  players: PlayerMatchDTO[];
}) {
  const { avgRating, avgAdr, totalKills } = calculateTeamAverages(players);

  return (
    <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
      {/* Resumo do time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-mono font-black text-foreground uppercase tracking-wide flex items-center gap-2">
            Time {side}
          </h3>
          <TacticalBadge variant="neutral" size="sm">
            {players.length} JOGADORES
          </TacticalBadge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground/70">
          <span>Kills: <strong className="text-foreground font-bold tabular-nums">{totalKills}</strong></span>
          <span>Rating: <strong className="text-foreground font-bold tabular-nums">{avgRating.toFixed(2)}</strong></span>
          <span>ADR: <strong className="text-foreground font-bold tabular-nums">{avgAdr.toFixed(1)}</strong></span>
        </div>
      </div>

      <div className="relative rounded-xs border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right min-w-[620px]">
            <thead>
              <tr className="border-b border-border/40 bg-surface-deck text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider">
                <th className="sticky left-0 z-30 bg-surface-deck px-3.5 py-2.5 text-left border-r border-border/40 min-w-[130px] sm:min-w-[160px]">
                  Jogador
                </th>
                <th className="px-3.5 py-2.5">ELO</th>
                <th className="px-3.5 py-2.5 text-center">Rating</th>
                <th className="px-3.5 py-2.5">ADR</th>
                <th className="px-3.5 py-2.5">KAST</th>
                <th className="px-3.5 py-2.5">Impact</th>
                <th className="px-3.5 py-2.5 text-foreground">K</th>
                <th className="px-3.5 py-2.5">D</th>
                <th className="px-3.5 py-2.5">A</th>
                <th className="px-3.5 py-2.5">HS %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {players.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
