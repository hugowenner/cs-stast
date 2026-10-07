import * as React from "react";
import type { ComparisonPlayerDTO } from "@/server/dtos/playerComparison.dto";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import { cn } from "@/lib/utils";

interface MetricConfig {
  key: "rating" | "adr" | "kast" | "hsPercentage" | "kd" | "impact" | "winrate";
  label: string;
  format: (v: number) => string;
}

const METRICS_LIST: MetricConfig[] = [
  { key: "rating",       label: "RATING 2.0 MÉDIO", format: (v) => v.toFixed(2) },
  { key: "kd",           label: "K/D RATIO",        format: (v) => v.toFixed(2) },
  { key: "adr",          label: "ADR (DANO/ROUND)", format: (v) => v.toFixed(1) },
  { key: "kast",         label: "KAST% REGULAR",    format: (v) => `${v.toFixed(1)}%` },
  { key: "hsPercentage", label: "PRECISÃO HS%",     format: (v) => `${v.toFixed(1)}%` },
  { key: "impact",       label: "IMPACTO",          format: (v) => v.toFixed(2) },
  { key: "winrate",      label: "TAXA DE VITÓRIA",  format: (v) => `${v.toFixed(1)}%` },
];

export function ComparisonStats({ players }: { players: ComparisonPlayerDTO[] }) {
  if (players.length < 2) return null;

  const [pA, pB] = players;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {METRICS_LIST.map(({ key, label, format }) => {
        const valA = pA.metrics[key];
        const valB = pB.metrics[key];

        const isABetter = valA > valB;
        const isBBetter = valB > valA;
        const isTie = valA === valB;

        const diff = Math.abs(valA - valB);
        const minVal = Math.min(valA, valB);
        const pctDiff = minVal > 0 ? (diff / minVal) * 100 : 0;

        let advantageText = "";
        if (!isTie) {
          const winnerNick = isABetter ? pA.nickname : pB.nickname;
          const formattedDiff = format(diff).replace(/-/, "");
          const pctSuffix =
            pctDiff > 0 && key !== "winrate" && key !== "hsPercentage" && key !== "kast"
              ? ` (+${pctDiff.toFixed(0)}%)`
              : "";
          advantageText = `+${formattedDiff}${pctSuffix} para ${winnerNick}`;
        }

        return (
          <div
            key={key}
            className="p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-3 hover:border-border/90 transition-micro group"
          >
            {/* Metric Category Label */}
            <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider block">
              {label}
            </span>

            {/* Direct Side-by-Side Comparison */}
            <div className="grid grid-cols-3 items-center gap-2">
              {/* Player A */}
              <div className="text-left min-w-0">
                <span className="text-[10px] font-bold block text-muted-foreground/70 truncate leading-none">
                  {pA.nickname}
                </span>
                <span
                  className={cn(
                    "font-mono text-base font-black block mt-1 tabular-nums",
                    isABetter ? "text-primary" : "text-foreground/70"
                  )}
                >
                  {format(valA)}
                </span>
              </div>

              {/* Symmetric Comparison Bar */}
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex w-full h-1.5 rounded-full bg-surface-deck overflow-hidden border border-border/40">
                  <div
                    style={{ width: `${isTie ? 50 : isABetter ? 70 : 30}%` }}
                    className={cn(
                      "h-full transition-all duration-300",
                      isABetter ? "bg-primary" : "bg-border/60"
                    )}
                  />
                  <div
                    style={{ width: `${isTie ? 50 : isBBetter ? 70 : 30}%` }}
                    className={cn(
                      "h-full transition-all duration-300",
                      isBBetter ? "bg-cyan-400" : "bg-border/60"
                    )}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-muted-foreground/60 uppercase">
                  {isTie ? "=" : isABetter ? "A" : "B"}
                </span>
              </div>

              {/* Player B */}
              <div className="text-right min-w-0">
                <span className="text-[10px] font-bold block text-muted-foreground/70 truncate leading-none">
                  {pB.nickname}
                </span>
                <span
                  className={cn(
                    "font-mono text-base font-black block mt-1 tabular-nums",
                    isBBetter ? "text-cyan-400" : "text-foreground/70"
                  )}
                >
                  {format(valB)}
                </span>
              </div>
            </div>

            {/* Advantage Footer */}
            {!isTie && (
              <div className="pt-2 border-t border-border/30 text-center">
                <span className="text-[10px] font-mono font-bold text-status-good uppercase tracking-wider">
                  {advantageText}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
