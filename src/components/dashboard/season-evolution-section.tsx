import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { SeasonComparisonEntry } from "@/server/services/competitive.service";

interface SeasonEvolutionSectionProps {
  gainers: SeasonComparisonEntry[];
  decliners: SeasonComparisonEntry[];
}

function FeaturedEntry({ entry, accent }: { entry: SeasonComparisonEntry; accent: "good" | "critical" }) {
  const color = accent === "good" ? "text-status-good" : "text-status-critical";

  return (
    <div className="px-4 py-4 flex items-start gap-3.5">
      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white truncate">{entry.player.nickname}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] tabular-nums">
          <span className="text-muted-foreground/60 font-semibold">{entry.season.rating.toFixed(2)}</span>
          <ArrowRight className="size-2.5 text-muted-foreground/40 shrink-0" />
          <span className={`font-black ${color}`}>{entry.recent.rating.toFixed(2)}</span>
          <span className="text-[9px] text-muted-foreground/50 ml-0.5">Rating</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {[
            { label: "Rating", diff: entry.diff.rating.toFixed(2) },
            { label: "ADR", diff: entry.diff.adr.toString() },
            { label: "WR", diff: `${entry.diff.winrate}%` },
          ].map((stat) => (
            <div key={stat.label} className={`text-center rounded-lg p-1.5 border ${accent === "good" ? "bg-status-good/5 border-status-good/10" : "bg-status-critical/5 border-status-critical/10"}`}>
              <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">{stat.label}</p>
              <p className={`text-xs font-black mt-0.5 tabular-nums ${color}`}>
                {Number(stat.diff) >= 0 ? "+" : ""}{stat.diff}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompactRow({ entry, accent }: { entry: SeasonComparisonEntry; accent: "good" | "critical" }) {
  const color = accent === "good" ? "text-status-good" : "text-status-critical";

  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
      <p className="text-xs font-bold text-white/90 truncate flex-1 min-w-0">{entry.player.nickname}</p>
      <span className={`text-[11px] font-black tabular-nums shrink-0 ${color}`}>
        {entry.diff.rating >= 0 ? "+" : ""}{entry.diff.rating.toFixed(2)}
      </span>
    </div>
  );
}

function ComparisonPanel({ entries, accent }: { entries: SeasonComparisonEntry[]; accent: "good" | "critical" }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground/55 px-4 py-8 text-center">Sem dados suficientes ainda.</p>;
  }

  const [top, ...rest] = entries;

  return (
    <>
      <FeaturedEntry entry={top} accent={accent} />
      {rest.length > 0 && (
        <div className="border-t border-white/[0.04] divide-y divide-white/[0.03]">
          {rest.map((entry) => (
            <CompactRow key={entry.player.id} entry={entry} accent={accent} />
          ))}
        </div>
      )}
    </>
  );
}

export function SeasonEvolutionSection({ gainers, decliners }: SeasonEvolutionSectionProps) {
  if (gainers.length === 0 && decliners.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="glass-panel rounded-2xl border border-status-good/20 bg-status-good/[0.015] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-good/10 flex items-center gap-2">
          <TrendingUp className="size-3.5 text-status-good shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-good/80">📈 Subindo no Rank com Raça</p>
        </div>
        <ComparisonPanel entries={gainers} accent="good" />
      </div>
      <div className="glass-panel rounded-2xl border border-status-critical/20 bg-status-critical/[0.015] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-critical/10 flex items-center gap-2">
          <TrendingDown className="size-3.5 text-status-critical shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">📉 Precisa Treinar Mais</p>
        </div>
        <ComparisonPanel entries={decliners} accent="critical" />
      </div>
    </div>
  );
}
