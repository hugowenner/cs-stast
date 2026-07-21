import { Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";

export interface AchievementFeedEntry {
  id: string;
  earnedAt: Date;
  achievement: { name: string; tier: string };
  player: { nickname: string; avatarUrl: string | null };
}

const TIER_COLOR: Record<string, string> = {
  bronze: "text-[#d95926]",
  silver: "text-muted-foreground",
  gold: "text-status-warning",
  legendary: "text-accent-violet",
};

export function AchievementFeedItem({ entry }: { entry: AchievementFeedEntry }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{entry.player.nickname}</span>{" "}
          <span className="text-muted-foreground">desbloqueou</span>{" "}
          <span className={TIER_COLOR[entry.achievement.tier] ?? "text-foreground"}>
            {entry.achievement.name}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {entry.earnedAt.toLocaleDateString("pt-BR")}
        </p>
      </div>
      <Trophy
        className={`size-4 shrink-0 ${TIER_COLOR[entry.achievement.tier] ?? "text-muted-foreground"}`}
      />
    </div>
  );
}
