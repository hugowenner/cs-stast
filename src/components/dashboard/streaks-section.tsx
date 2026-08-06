import { Flame, Snowflake } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { StreakEntry } from "@/server/services/competitive.service";

interface StreaksSectionProps {
  hot: StreakEntry[];
  cold: StreakEntry[];
}

const MAX_TRAIL_DOTS = 8;

function StreakTrail({ count, accent }: { count: number; accent: "good" | "critical" }) {
  const dotColor = accent === "good" ? "bg-status-good" : "bg-status-critical";
  const shown = Math.min(count, MAX_TRAIL_DOTS);
  const overflow = count - shown;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${dotColor}`} style={{ opacity: 0.45 + (i / shown) * 0.55 }} />
      ))}
      {overflow > 0 && (
        <span className="text-[8px] font-bold text-muted-foreground/60 ml-0.5">+{overflow}</span>
      )}
    </div>
  );
}

function StreakList({ entries, accent }: { entries: StreakEntry[]; accent: "good" | "critical" }) {
  const color = accent === "good" ? "text-status-good" : "text-status-critical";
  const bg = accent === "good" ? "bg-status-good/10" : "bg-status-critical/10";
  const border = accent === "good" ? "border-status-good/20" : "border-status-critical/20";

  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-muted-foreground/55">Nenhuma sequência relevante no momento.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {entries.slice(0, 3).map((entry) => (
        <div key={entry.player.id} className="px-4 py-3.5 flex items-center gap-3">
          <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-white truncate">{entry.player.nickname}</p>
              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${color} ${bg} ${border}`}>
                {entry.streak}x {entry.type === "hot" ? "seguidas" : "seguidas"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/55 mt-1">
              {entry.type === "hot" ? "Vitórias consecutivas" : "Derrotas consecutivas"} · últimas {entry.matchCount} partidas
            </p>
            <div className="mt-1.5">
              <StreakTrail count={entry.streak} accent={accent} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 text-center">
            <div>
              <p className="text-xs font-black text-white/90 tabular-nums">
                <AnimatedNumber value={entry.recentRating} decimals={2} duration={0.6} />
              </p>
              <p className="text-[7px] uppercase tracking-widest text-muted-foreground/55 font-bold mt-0.5">Rating</p>
            </div>
            <div>
              <p className={`text-xs font-black tabular-nums ${entry.adrChangePercent >= 0 ? "text-status-good" : "text-status-critical"}`}>
                {entry.adrChangePercent > 0 ? "+" : ""}{entry.adrChangePercent}%
              </p>
              <p className="text-[7px] uppercase tracking-widest text-muted-foreground/55 font-bold mt-0.5">ADR</p>
            </div>
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
      <div className="glass-panel rounded-2xl border border-status-good/20 bg-status-good/[0.015] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-good/10 flex items-center gap-2">
          <Flame className="size-3.5 text-status-good shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-good/80">🔥 Modo Deus Ativado</p>
          {hot.length > 0 && (
            <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{hot.length} jogador{hot.length > 1 ? "es" : ""}</span>
          )}
        </div>
        <StreakList entries={hot} accent="good" />
      </div>
      <div className="glass-panel rounded-2xl border border-status-critical/20 bg-status-critical/[0.015] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-status-critical/10 flex items-center gap-2">
          <Snowflake className="size-3.5 text-status-critical shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">❄️ Sequência de Sofrimento</p>
          {cold.length > 0 && (
            <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{cold.length} jogador{cold.length > 1 ? "es" : ""}</span>
          )}
        </div>
        <StreakList entries={cold} accent="critical" />
      </div>
    </div>
  );
}
