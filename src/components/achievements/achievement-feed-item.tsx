import { Trophy, Star, Flame, Zap } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";

export interface AchievementFeedEntry {
  id: string;
  earnedAt: Date;
  achievement: { name: string; tier: string };
  player: { nickname: string; avatarUrl: string | null };
}

const TIER: Record<string, { color: string; bg: string; border: string; label: string }> = {
  bronze:    { color: "text-[#c97a48]",      bg: "bg-[#c97a48]/8",     border: "border-[#c97a48]/20",    label: "Bronze"    },
  silver:    { color: "text-slate-400",       bg: "bg-slate-400/8",     border: "border-slate-400/20",    label: "Prata"     },
  gold:      { color: "text-status-warning",  bg: "bg-status-warning/8",border: "border-status-warning/20",label: "Ouro"     },
  legendary: { color: "text-accent-violet",   bg: "bg-accent-violet/8", border: "border-accent-violet/20",label: "Lendário"  },
};

const TIER_ICON: Record<string, React.ElementType> = {
  bronze:    Trophy,
  silver:    Star,
  gold:      Flame,
  legendary: Zap,
};

export function AchievementFeedItem({ entry, index = 0 }: { entry: AchievementFeedEntry; index?: number }) {
  const tier = TIER[entry.achievement.tier] ?? TIER.bronze;
  const Icon = TIER_ICON[entry.achievement.tier] ?? Trophy;

  return (
    <div
      className="px-5 py-3.5 flex items-start gap-3.5 hover:bg-white/[0.012] transition-colors achievement-pop"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-white truncate">{entry.player.nickname}</p>
        <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full border ${tier.bg} ${tier.border}`}>
          <Icon className={`size-2.5 shrink-0 ${tier.color}`} />
          <span className={`text-[10px] font-bold ${tier.color} leading-none`}>{entry.achievement.name}</span>
        </div>
      </div>
      <div className="shrink-0 text-right mt-0.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${tier.color}`}>{tier.label}</span>
        <p className="text-[9px] text-muted-foreground/55 mt-0.5 tabular-nums">
          {entry.earnedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </p>
      </div>
    </div>
  );
}
