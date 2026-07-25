import { TrendingUp, TrendingDown } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { SeasonComparisonEntry } from "@/server/services/competitive.service";

interface SeasonEvolutionSectionProps {
  gainers: SeasonComparisonEntry[];
  decliners: SeasonComparisonEntry[];
}

function ComparisonList({ entries, accent }: { entries: SeasonComparisonEntry[]; accent: "good" | "critical" }) {
  const color = accent === "good" ? "text-status-good" : "text-status-critical";

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground/55 px-4 py-6 text-center">Sem dados suficientes ainda.</p>;
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {entries.map((entry) => (
        <div key={entry.player.id} className="px-4 py-3.5 flex items-center gap-3">
          <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{entry.player.nickname}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-black tabular-nums ${color}`}>
                {entry.diff.rating >= 0 ? "+" : ""}{entry.diff.rating.toFixed(2)} Rating
              </span>
              <span className="text-[10px] text-muted-foreground/55 tabular-nums">
                {entry.diff.adr >= 0 ? "+" : ""}{entry.diff.adr} ADR
              </span>
              <span className="text-[10px] text-muted-foreground/55 tabular-nums">
                {entry.diff.winrate >= 0 ? "+" : ""}{entry.diff.winrate}% WR
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-white/90 tabular-nums">
              <AnimatedNumber value={entry.recent.rating} decimals={2} duration={0.6} />
            </p>
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/55 font-bold">Últimas 10</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SeasonEvolutionSection({ gainers, decliners }: SeasonEvolutionSectionProps) {
  if (gainers.length === 0 && decliners.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
          <TrendingUp className="size-3.5 text-status-good shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-good/80">Maior Evolução</p>
        </div>
        <ComparisonList entries={gainers} accent="good" />
      </div>
      <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
          <TrendingDown className="size-3.5 text-status-critical shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">Queda de Performance</p>
        </div>
        <ComparisonList entries={decliners} accent="critical" />
      </div>
    </div>
  );
}
