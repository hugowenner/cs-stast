import { PlayerRow } from "./player-row";
import { calculateTeamAverages } from "@/server/analytics/team.analytics";
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
    <div className="flex flex-col gap-3">
      {/* Resumo do time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Time {side}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({players.length} jogadores)
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-4 gap-y-1 text-xs text-muted-foreground">
          <span>Kills Totais: <strong className="text-white">{totalKills}</strong></span>
          <span>Rating Médio: <strong className="text-white">{avgRating.toFixed(2)}</strong></span>
          <span>ADR Médio: <strong className="text-white">{avgAdr.toFixed(1)}</strong></span>
        </div>
      </div>

      <div className="relative rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden group">
        {/* Indicador de scroll lateral no mobile */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent z-20 sm:hidden" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right min-w-[640px]">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-950 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="sticky left-0 z-30 bg-zinc-950 px-4 py-3 text-left shadow-[2px_0_8px_-2px_rgba(0,0,0,0.8)] border-r border-white/10 min-w-[130px] sm:min-w-[160px]">
                  Jogador
                </th>
                <th className="px-4 py-3">ELO</th>
                <th className="px-4 py-3 text-center">Rating</th>
                <th className="px-4 py-3">ADR</th>
                <th className="px-4 py-3">KAST</th>
                <th className="px-4 py-3">Impact</th>
                <th className="px-4 py-3 text-white">K</th>
                <th className="px-4 py-3">D</th>
                <th className="px-4 py-3">A</th>
                <th className="px-4 py-3">HS %</th>
              </tr>
            </thead>
            <tbody>
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
