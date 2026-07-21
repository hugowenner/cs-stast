import type { ComparisonPlayerDTO } from "@/server/dtos/playerComparison.dto";

interface MetricConfig {
  key: "rating" | "adr" | "kast" | "hsPercentage" | "kd" | "impact" | "winrate";
  label: string;
  format: (v: number) => string;
}

const METRICS_LIST: MetricConfig[] = [
  { key: "rating", label: "Rating Médio", format: (v) => v.toFixed(2) },
  { key: "kd", label: "K/D Ratio", format: (v) => v.toFixed(2) },
  { key: "adr", label: "ADR Médio", format: (v) => v.toFixed(1) },
  { key: "kast", label: "KAST %", format: (v) => `${v.toFixed(1)}%` },
  { key: "hsPercentage", label: "Headshot %", format: (v) => `${v.toFixed(1)}%` },
  { key: "impact", label: "Impacto", format: (v) => v.toFixed(2) },
  { key: "winrate", label: "Winrate Geral", format: (v) => `${v.toFixed(1)}%` },
];

export function ComparisonStats({ players }: { players: ComparisonPlayerDTO[] }) {
  if (players.length < 2) return null;

  const [pA, pB] = players;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {METRICS_LIST.map(({ key, label, format }) => {
        const valA = pA.metrics[key];
        const valB = pB.metrics[key];

        const isABetter = valA > valB;
        const isBBetter = valB > valA;
        const isTie = valA === valB;

        return (
          <div
            key={key}
            className="glass-panel p-4 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              {label}
            </span>

            <div className="grid grid-cols-3 items-center gap-2">
              {/* Player A column */}
              <div className="text-left">
                <span className={`text-xs block text-muted-foreground truncate font-medium`}>
                  {pA.nickname}
                </span>
                <span
                  className={`text-lg font-bold ${
                    isABetter ? "text-status-good" : isBBetter ? "text-muted-foreground/60" : "text-white"
                  }`}
                >
                  {format(valA)}
                </span>
              </div>

              {/* Middle Comparison Line */}
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${isTie ? 50 : isABetter ? 70 : 30}%` }}
                    className={`h-full transition-all duration-300 ${
                      isABetter ? "bg-status-good" : "bg-white/10"
                    }`}
                  />
                  <div
                    style={{ width: `${isTie ? 50 : isBBetter ? 70 : 30}%` }}
                    className={`h-full transition-all duration-300 ${
                      isBBetter ? "bg-status-good" : "bg-white/10"
                    }`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                  {isTie ? "Empate" : isABetter ? "A" : "B"}
                </span>
              </div>

              {/* Player B column */}
              <div className="text-right">
                <span className={`text-xs block text-muted-foreground truncate font-medium`}>
                  {pB.nickname}
                </span>
                <span
                  className={`text-lg font-bold ${
                    isBBetter ? "text-status-good" : isABetter ? "text-muted-foreground/60" : "text-white"
                  }`}
                >
                  {format(valB)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
