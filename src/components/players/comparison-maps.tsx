import * as React from "react";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import { cn } from "@/lib/utils";

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
    return (
      <p className="text-muted-foreground/60 py-6 text-center text-xs font-mono">
        Sem dados de mapas disponíveis para este confronto.
      </p>
    );
  }

  return (
    <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-surface-deck/40 text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider">
              <th className="px-4 py-3">MAPA</th>
              <th className="px-4 py-3 text-right">{nicknameA} (A)</th>
              <th className="px-4 py-3 text-center w-1/3">BALANÇO WINRATE</th>
              <th className="px-4 py-3 text-right">{nicknameB} (B)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {maps.map((map) => {
              const wrA = map.winrates[playerIdA] ?? 0;
              const wrB = map.winrates[playerIdB] ?? 0;
              const countA = map.appearances[playerIdA] ?? 0;
              const countB = map.appearances[playerIdB] ?? 0;

              const isABetter = wrA > wrB;
              const isBBetter = wrB > wrA;
              const cleanMap = map.mapName.replace(/^de_/i, "").toUpperCase();

              return (
                <tr key={map.mapName} className="hover:bg-surface-elevated/30 transition-micro">
                  <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                    {cleanMap}
                  </td>
                  
                  {/* Winrate A */}
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums block",
                        isABetter ? "text-primary font-black" : "text-foreground/70"
                      )}
                    >
                      {wrA.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 block">
                      {countA} {countA === 1 ? "partida" : "partidas"}
                    </span>
                  </td>

                  {/* Center Comparison Slider */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex h-1.5 w-full rounded-full bg-surface-deck overflow-hidden border border-border/40">
                      <div
                        style={{ width: `${wrA}%` }}
                        className={cn(
                          "h-full self-start transition-all",
                          isABetter ? "bg-primary" : "bg-border/60"
                        )}
                      />
                      <div
                        style={{ width: `${wrB}%` }}
                        className={cn(
                          "h-full self-end transition-all",
                          isBBetter ? "bg-cyan-400" : "bg-border/60"
                        )}
                      />
                    </div>
                  </td>

                  {/* Winrate B */}
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums block",
                        isBBetter ? "text-cyan-400 font-black" : "text-foreground/70"
                      )}
                    >
                      {wrB.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 block">
                      {countB} {countB === 1 ? "partida" : "partidas"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
