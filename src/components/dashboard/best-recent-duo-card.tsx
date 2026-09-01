import { Handshake, Flame } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { DuoSummary } from "@/server/services/competitive.service";

interface BestRecentDuoCardProps {
  duo: DuoSummary | null;
}

export function BestRecentDuoCard({ duo }: BestRecentDuoCardProps) {
  if (!duo) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.07] p-6 text-center h-full flex flex-col items-center justify-center gap-2">
        <Handshake className="size-5 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/55">Sem dupla em destaque nas últimas partidas.</p>
      </div>
    );
  }

  const isHot = duo.winrate >= 70;

  return (
    <div className="glass-panel rounded-2xl border border-accent-cyan/15 bg-accent-cyan/[0.02] overflow-hidden h-full flex flex-col">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <Handshake className="size-3 text-accent-cyan shrink-0" />
        <span className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Dupla em destaque</span>
        <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{duo.total} partidas</span>
      </div>

      <div className="px-4 pt-4 pb-3 flex items-center justify-center gap-5">
        <div className="flex flex-col items-center gap-1.5">
          <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="md" />
          <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerA.nickname}</p>
        </div>
        <span className="text-muted-foreground/40 text-base font-light shrink-0">+</span>
        <div className="flex flex-col items-center gap-1.5">
          <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="md" />
          <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerB.nickname}</p>
        </div>
      </div>

      {isHot && (
        <div className="px-4 pb-2 flex justify-center">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border border-status-good/20 bg-status-good/10 text-status-good">
            <Flame className="size-2.5" /> 🔥 Impossível de parar
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 px-4 pb-4 mt-auto">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Vitórias</p>
          <p className="text-base font-black text-status-good mt-0.5">{duo.wins}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">WR</p>
          <p className="text-base font-black text-white mt-0.5 tabular-nums">
            <AnimatedNumber value={duo.winrate} decimals={0} suffix="%" duration={0.6} />
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating</p>
          <p className="text-base font-black text-white mt-0.5 tabular-nums">
            <AnimatedNumber value={duo.avgRating} decimals={2} duration={0.6} />
          </p>
        </div>
      </div>
    </div>
  );
}
