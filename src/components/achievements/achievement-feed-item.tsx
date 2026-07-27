"use client";

import { Trophy, Star, Flame, Zap } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";

// Tipo narrower: só os campos usados pelo componente.
// Evita acoplamento ao tipo Prisma completo e permite reutilização em páginas
// que não carregam o Player com todos os campos (ex: /players/[id]).
type FeedEntry = {
  id: string;
  earnedAt: Date;
  achievement: { tier: string; name: string };
  player: { nickname: string; avatarUrl: string | null };
  match?: { map?: { name: string } | null } | null;
};

const TIER: Record<string, { color: string; bg: string; border: string; label: string }> = {
  bronze:    { color: "text-[#c97a48]",      bg: "bg-[#c97a48]/8",      border: "border-[#c97a48]/20",     label: "Comum"    },
  silver:    { color: "text-slate-300",       bg: "bg-slate-400/8",      border: "border-slate-400/20",     label: "Raro"     },
  gold:      { color: "text-status-warning",  bg: "bg-status-warning/8", border: "border-status-warning/20",label: "Épico"    },
  legendary: { color: "text-accent-violet",   bg: "bg-accent-violet/8",  border: "border-accent-violet/20", label: "Lendário" },
};

const TIER_ICON: Record<string, React.ElementType> = {
  bronze:    Trophy,
  silver:    Star,
  gold:      Flame,
  legendary: Zap,
};

export function AchievementFeedItem({
  entry,
  index = 0,
}: {
  entry: FeedEntry;
  index?: number;
}) {
  const tier = TIER[entry.achievement.tier] ?? TIER.bronze;
  const Icon = TIER_ICON[entry.achievement.tier] ?? Trophy;
  const mapName = entry.match?.map?.name;

  return (
    <div
      className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.012] achievement-pop"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-white">{entry.player.nickname}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${tier.bg} ${tier.border}`}
          >
            <Icon className={`size-2.5 shrink-0 ${tier.color}`} />
            <span className={`text-[10px] font-bold leading-none ${tier.color}`}>
              {entry.achievement.name}
            </span>
          </div>
          {mapName && (
            <span className="text-[9px] text-muted-foreground/40 font-medium">{mapName}</span>
          )}
        </div>
      </div>
      <div className="mt-0.5 shrink-0 text-right">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${tier.color}`}>
          {tier.label}
        </span>
        <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground/55">
          {entry.earnedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </p>
      </div>
    </div>
  );
}
