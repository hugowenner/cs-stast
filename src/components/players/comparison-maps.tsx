import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

export function ComparisonMaps({
  maps,
  playerIdA,
  playerIdB,
  nicknameA,
  nicknameB,
}: {
  maps: PlayerComparisonDTO["maps"];
  playerIdA: string;
  playerIdB: string;
  nicknameA: string;
  nicknameB: string;
}) {
  if (maps.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">Sem dados de mapas.</p>;
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-white/15 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 font-semibold">Mapa</th>
            <th className="px-4 py-3 font-semibold text-right">{nicknameA} (A)</th>
            <th className="px-4 py-3 font-semibold text-center w-1/3">Comparação de Winrate</th>
            <th className="px-4 py-3 font-semibold text-right">{nicknameB} (B)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {maps.map((map) => {
            const wrA = map.winrates[playerIdA] ?? 0;
            const wrB = map.winrates[playerIdB] ?? 0;
            const countA = map.appearances[playerIdA] ?? 0;
            const countB = map.appearances[playerIdB] ?? 0;

            const isABetter = wrA > wrB;
            const isBBetter = wrB > wrA;

            return (
              <tr key={map.mapName} className="hover:bg-white/[0.01] transition-colors">
                <td className="px-4 py-3.5 font-bold text-white text-base">{map.mapName}</td>
                
                {/* Winrate A */}
                <td className="px-4 py-3.5 text-right font-medium">
                  <span className={`text-base font-bold ${isABetter ? "text-status-good" : "text-white"}`}>
                    {wrA.toFixed(1)}%
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {countA} {countA === 1 ? "jogo" : "jogos"}
                  </span>
                </td>

                {/* Center Comparison Slider */}
                <td className="px-4 py-3.5 text-center">
                  <div className="flex h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      style={{ width: `${wrA}%` }}
                      className={`h-full self-start transition-all ${
                        isABetter ? "bg-status-good" : "bg-white/20"
                      }`}
                    />
                    <div
                      style={{ width: `${wrB}%` }}
                      className={`h-full self-end transition-all ${
                        isBBetter ? "bg-status-good" : "bg-white/20"
                      }`}
                    />
                  </div>
                </td>

                {/* Winrate B */}
                <td className="px-4 py-3.5 text-right font-medium">
                  <span className={`text-base font-bold ${isBBetter ? "text-status-good" : "text-white"}`}>
                    {wrB.toFixed(1)}%
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {countB} {countB === 1 ? "jogo" : "jogos"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
