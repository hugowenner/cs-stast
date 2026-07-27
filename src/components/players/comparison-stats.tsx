import type { ComparisonPlayerDTO } from "@/server/dtos/playerComparison.dto";
import { cn } from "@/lib/utils";

interface MetricConfig {
  key: "rating" | "adr" | "kast" | "hsPercentage" | "kd" | "impact" | "winrate";
  label: string;
  format: (v: number) => string;
}

const METRICS_LIST: MetricConfig[] = [
  { key: "rating", label: "Rating Médio", format: (v) => v.toFixed(2) },
  { key: "kd", label: "K/D Ratio", format: (v) => v.toFixed(2) },
  { key: "adr", label: "ADR", format: (v) => v.toFixed(1) },
  { key: "kast", label: "KAST", format: (v) => `${v.toFixed(1)}%` },
  { key: "hsPercentage", label: "HS%", format: (v) => `${v.toFixed(1)}%` },
  { key: "impact", label: "Impacto", format: (v) => v.toFixed(2) },
  { key: "winrate", label: "Winrate Geral", format: (v) => `${v.toFixed(1)}%` },
];

export function ComparisonStats({ players }: { players: ComparisonPlayerDTO[] }) {
  if (players.length < 2) return null;

  const [pA, pB] = players;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {METRICS_LIST.map(({ key, label, format }) => {
        const valA = pA.metrics[key];
        const valB = pB.metrics[key];

        const isABetter = valA > valB;
        const isBBetter = valB > valA;
        const isTie = valA === valB;

        // Calcular diferença absoluta e percentual
        const diff = Math.abs(valA - valB);
        const minVal = Math.min(valA, valB);
        const pctDiff = minVal > 0 ? (diff / minVal) * 100 : 0;

        // Texto formatado de vantagem
        let advantageText = "";
        if (!isTie) {
          const winnerNick = isABetter ? pA.nickname : pB.nickname;
          const formattedDiff = format(diff).replace(/-/, "");
          const pctSuffix = pctDiff > 0 && key !== "winrate" && key !== "hsPercentage" && key !== "kast"
            ? ` (+${pctDiff.toFixed(0)}%)`
            : "";
          advantageText = `🔥 +${formattedDiff}${pctSuffix} para ${winnerNick}`;
        }

        return (
          <div
            key={key}
            className="glass-panel p-4 border border-white/5 bg-white/[0.01] rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors group relative overflow-hidden"
          >
            {/* Header de Categoria */}
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block mb-3">
              {label}
            </span>

            {/* Comparativo de Números */}
            <div className="grid grid-cols-3 items-center gap-2">
              {/* Jogador A */}
              <div className="text-left min-w-0">
                <span className="text-[9px] block text-muted-foreground/50 truncate font-bold leading-none">
                  {pA.nickname}
                </span>
                <span
                  className={cn(
                    "text-base font-black block mt-1 tabular-nums",
                    isABetter ? "text-primary" : "text-white/60"
                  )}
                >
                  {format(valA)}
                </span>
              </div>

              {/* Barra de Progresso Central */}
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex w-full h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/[0.04]">
                  <div
                    style={{ width: `${isTie ? 50 : isABetter ? 70 : 30}%` }}
                    className={cn(
                      "h-full transition-all duration-300",
                      isABetter ? "bg-primary" : "bg-white/10"
                    )}
                  />
                  <div
                    style={{ width: `${isTie ? 50 : isBBetter ? 70 : 30}%` }}
                    className={cn(
                      "h-full transition-all duration-300",
                      isBBetter ? "bg-accent-cyan" : "bg-white/10"
                    )}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground/55 font-black uppercase tracking-wider leading-none">
                  {isTie ? "Empate" : isABetter ? "A" : "B"}
                </span>
              </div>

              {/* Jogador B */}
              <div className="text-right min-w-0">
                <span className="text-[9px] block text-muted-foreground/50 truncate font-bold leading-none">
                  {pB.nickname}
                </span>
                <span
                  className={cn(
                    "text-base font-black block mt-1 tabular-nums",
                    isBBetter ? "text-accent-cyan" : "text-white/60"
                  )}
                >
                  {format(valB)}
                </span>
              </div>
            </div>

            {/* Vantagem Estatística Footer */}
            {!isTie && (
              <div className="mt-3 pt-2 border-t border-white/[0.03] text-center">
                <span className="text-[9.5px] font-black text-status-good uppercase tracking-wider">
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
