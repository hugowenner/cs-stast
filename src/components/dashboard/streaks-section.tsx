import { Flame, Snowflake } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { StreakEntry } from "@/server/services/competitive.service";

interface StreaksSectionProps {
  hot: StreakEntry[];
  cold: StreakEntry[];
}

function StreakList({ entries, accent }: { entries: StreakEntry[]; accent: "good" | "critical" }) {
  const color = accent === "good" ? "text-status-good" : "text-status-critical";
  const bg = accent === "good" ? "bg-status-good/[0.02]" : "bg-status-critical/[0.02]";

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground/55 px-4 py-6 text-center">Nenhuma sequência relevante no momento.</p>;
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {entries.slice(0, 4).map((entry) => (
        <div key={entry.player.id} className={`px-4 py-3 flex items-center gap-3 ${bg}`}>
          <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{entry.player.nickname}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${color}`}>
              {entry.streak} {entry.type === "hot" ? "vitórias consecutivas" : "derrotas consecutivas"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-white/90 tabular-nums">
              <AnimatedNumber value={entry.recentRating} decimals={2} duration={0.6} />
            </p>
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/55 font-bold">Rating</p>
            {entry.adrChangePercent !== 0 && (
              <p className={`text-[9px] font-semibold mt-0.5 ${entry.adrChangePercent > 0 ? "text-status-good" : "text-status-critical"}`}>
                ADR {entry.adrChangePercent > 0 ? "+" : ""}{entry.adrChangePercent}%
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StreaksSection({ hot, cold }: StreaksSectionProps) {
  if (hot.length === 0 && cold.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="glass-panel rounded-2xl border border-status-good/20 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-good/10 flex items-center gap-2">
          <Flame className="size-3.5 text-status-good shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-good/80">Hot Streak</p>
        </div>
        <StreakList entries={hot} accent="good" />
      </div>
      <div className="glass-panel rounded-2xl border border-status-critical/20 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-critical/10 flex items-center gap-2">
          <Snowflake className="size-3.5 text-status-critical shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">Cold Streak</p>
        </div>
        <StreakList entries={cold} accent="critical" />
      </div>
    </div>
  );
}
